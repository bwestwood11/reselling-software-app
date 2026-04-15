import { BaseMarketplaceAdapter, type ListingPayload } from "./base";

/** Build eBay <ItemSpecifics> XML from a key→value map. */
function buildItemSpecificsXml(specifics: Record<string, string>): string {
  const entries = Object.entries(specifics).filter(([, v]) => v?.trim());
  if (entries.length === 0) return "";
  const nameValuePairs = entries
    .map(
      ([name, value]) =>
        `    <NameValueList>\n      <Name>${escapeXmlStatic(name)}</Name>\n      <Value>${escapeXmlStatic(value)}</Value>\n    </NameValueList>`
    )
    .join("\n");
  return `  <ItemSpecifics>\n${nameValuePairs}\n  </ItemSpecifics>`;
}

function escapeXmlStatic(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const TRADING_API_URL = "https://api.ebay.com/ws/api.dll";
const TRADING_API_URL_SANDBOX = "https://api.sandbox.ebay.com/ws/api.dll";
const TRADING_API_VERSION = "967";

export class EbayAdapter extends BaseMarketplaceAdapter {
  private get tradingUrl() {
    return process.env.EBAY_SANDBOX === "true"
      ? TRADING_API_URL_SANDBOX
      : TRADING_API_URL;
  }

  /** Build HTTP headers for the Trading API (XML-based). */
  private tradingHeaders(callName: string): Record<string, string> {
    return {
      "X-EBAY-API-CALL-NAME": callName,
      "X-EBAY-API-SITEID": "0",
      "X-EBAY-API-COMPATIBILITY-LEVEL": TRADING_API_VERSION,
      "X-EBAY-API-IAF-TOKEN": this.connection.accessToken,
      "Content-Type": "text/xml",
    };
  }

  /** Parse the XML response from the Trading API. Returns the text content of a tag. */
  private xmlValue(xml: string, tag: string): string | undefined {
    const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
    return match?.[1]?.trim();
  }

  /** Extract all error/warning messages from a Trading API XML response. */
  private parseXmlErrors(xml: string): string[] {
    const messages: string[] = [];
    const errorRegex = /<Errors>([\s\S]*?)<\/Errors>/gi;
    let match;
    while ((match = errorRegex.exec(xml)) !== null) {
      const block = match[1] ?? "";
      const severity = this.xmlValue(block, "SeverityCode") ?? "";
      const longMsg = this.xmlValue(block, "LongMessage");
      const shortMsg = this.xmlValue(block, "ShortMessage");
      const msg = longMsg ?? shortMsg ?? "Unknown error";
      // Only collect errors, not informational warnings
      if (severity === "Error" || !severity) messages.push(msg);
    }
    return messages;
  }

  /** Escape special XML characters in user-provided strings. */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /** Map our condition enum to eBay Trading API ConditionID.
   *  Uses only universally valid IDs: 1000 (New w/ tags), 1500 (New w/o tags), 3000 (Pre-owned).
   *  Category-specific IDs like 4000/5000/6000 are only valid in select categories (electronics, etc.)
   *  and cause errors on clothing/fashion categories.
   */
  private mapConditionId(condition?: string): number {
    const map: Record<string, number> = {
      NEW_WITH_TAGS: 1000,    // New with tags
      NEW_WITHOUT_TAGS: 1500, // New without tags / New other
      VERY_GOOD: 3000,        // Pre-owned (eBay's most compatible used condition)
      GOOD: 3000,             // Pre-owned
      SATISFACTORY: 3000,     // Pre-owned
    };
    return map[condition ?? "GOOD"] ?? 3000;
  }

  async publish(listing: ListingPayload): Promise<string> {
    const price =
      typeof listing.price === "object"
        ? parseFloat((listing.price as any).toString())
        : Number(listing.price);

    // eBay requires publicly hosted https:// URLs
    const imageUrls =
      listing.inventoryItem?.images
        ?.map((img) => img.url)
        .filter((url): url is string => typeof url === "string" && url.startsWith("https://")) ?? [];

    if (imageUrls.length === 0) {
      throw new Error(
        "eBay requires at least one publicly hosted image (https://). Upload an image before publishing to eBay."
      );
    }

    const md = listing.marketplaceData as Record<string, any> | null | undefined;

    const categoryId: string | undefined = md?.categoryId;
    if (!categoryId?.trim()) {
      throw new Error("eBay requires a category ID. Search and select a category when creating the listing.");
    }

    const listingPolicies = md?.listingPolicies as Record<string, string> | undefined;
    if (!listingPolicies?.fulfillmentPolicyId) {
      throw new Error("eBay requires a fulfillment policy. Select one from your eBay business policies.");
    }
    if (!listingPolicies?.paymentPolicyId) {
      throw new Error("eBay requires a payment policy. Select one from your eBay business policies.");
    }
    if (!listingPolicies?.returnPolicyId) {
      throw new Error("eBay requires a return policy. Select one from your eBay business policies.");
    }

    const conditionId = this.mapConditionId(listing.inventoryItem?.condition);
    const isUsed = conditionId >= 3000;
    const conditionDescription = listing.description?.trim() || listing.title;
    const postalCode = md?.postalCode as string | undefined;
    const location = (md?.location as string | undefined)?.trim() || "United States";

    // Build item specifics: start from inventory attributes, then layer brand, then user overrides
    const rawSpecifics: Record<string, string> = {};
    const attrs = listing.inventoryItem?.attributes as Array<{ name: string; value: string }> | undefined;
    for (const attr of attrs ?? []) {
      if (attr.name && attr.value) rawSpecifics[attr.name] = attr.value;
    }
    if (listing.inventoryItem?.brand) rawSpecifics["Brand"] = listing.inventoryItem.brand;
    // User-provided overrides from marketplaceData.itemSpecifics
    const userSpecifics = md?.itemSpecifics as Record<string, string> | undefined;
    if (userSpecifics) Object.assign(rawSpecifics, userSpecifics);
    const itemSpecificsXml = buildItemSpecificsXml(rawSpecifics);

    // Build PictureDetails XML
    const pictureXml = imageUrls
      .slice(0, 12) // eBay max 12 images
      .map((url) => `    <PictureURL>${this.escapeXml(url)}</PictureURL>`)
      .join("\n");

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${this.escapeXml(this.connection.accessToken)}</eBayAuthToken>
  </RequesterCredentials>
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title>${this.escapeXml(listing.title.slice(0, 80))}</Title>
    <Description><![CDATA[${listing.description ?? listing.title}]]></Description>
    <PrimaryCategory>
      <CategoryID>${this.escapeXml(categoryId)}</CategoryID>
    </PrimaryCategory>
    <StartPrice>${price.toFixed(2)}</StartPrice>
    <CategoryMappingAllowed>true</CategoryMappingAllowed>
    <ConditionID>${conditionId}</ConditionID>
    ${isUsed ? `<ConditionDescription>${this.escapeXml(conditionDescription.slice(0, 1000))}</ConditionDescription>` : ""}
    <Country>US</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>3</DispatchTimeMax>
    <Location>${this.escapeXml(location)}</Location>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PictureDetails>
${pictureXml}
    </PictureDetails>
    ${postalCode ? `<PostalCode>${this.escapeXml(postalCode)}</PostalCode>` : ""}
    <Quantity>1</Quantity>
    <ShipToLocations>US</ShipToLocations>
    <Site>US</Site>
${itemSpecificsXml}
    <SellerProfiles>
      <SellerShippingProfile>
        <ShippingProfileID>${this.escapeXml(listingPolicies.fulfillmentPolicyId)}</ShippingProfileID>
      </SellerShippingProfile>
      <SellerReturnProfile>
        <ReturnProfileID>${this.escapeXml(listingPolicies.returnPolicyId)}</ReturnProfileID>
      </SellerReturnProfile>
      <SellerPaymentProfile>
        <PaymentProfileID>${this.escapeXml(listingPolicies.paymentPolicyId)}</PaymentProfileID>
      </SellerPaymentProfile>
    </SellerProfiles>
  </Item>
</AddItemRequest>`;

    const res = await fetch(this.tradingUrl, {
      method: "POST",
      headers: this.tradingHeaders("AddItem"),
      body: xml,
    });

    const responseText = await res.text();

    const ack = this.xmlValue(responseText, "Ack");
    if (ack === "Failure" || ack === "PartialFailure" || !res.ok) {
      const errors = this.parseXmlErrors(responseText);
      throw new Error(
        `eBay AddItem failed: ${errors.length > 0 ? errors.join(" | ") : responseText.slice(0, 500)}`
      );
    }

    const itemId = this.xmlValue(responseText, "ItemID");
    if (!itemId) {
      throw new Error("eBay AddItem succeeded but no ItemID was returned.");
    }

    return itemId;
  }

  async update(externalId: string, listing: ListingPayload): Promise<void> {
    const price =
      typeof listing.price === "object"
        ? parseFloat((listing.price as any).toString())
        : Number(listing.price);

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${this.escapeXml(this.connection.accessToken)}</eBayAuthToken>
  </RequesterCredentials>
  <Item>
    <ItemID>${this.escapeXml(externalId)}</ItemID>
    <StartPrice>${price.toFixed(2)}</StartPrice>
    ${listing.title ? `<Title>${this.escapeXml(listing.title.slice(0, 80))}</Title>` : ""}
    ${listing.description ? `<Description><![CDATA[${listing.description}]]></Description>` : ""}
  </Item>
</ReviseItemRequest>`;

    const res = await fetch(this.tradingUrl, {
      method: "POST",
      headers: this.tradingHeaders("ReviseItem"),
      body: xml,
    });

    const responseText = await res.text();
    const ack = this.xmlValue(responseText, "Ack");
    if (ack === "Failure" || !res.ok) {
      const errors = this.parseXmlErrors(responseText);
      throw new Error(`eBay ReviseItem failed: ${errors.join(" | ") || responseText.slice(0, 500)}`);
    }
  }

  async delist(externalId: string): Promise<void> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<EndItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${this.escapeXml(this.connection.accessToken)}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${this.escapeXml(externalId)}</ItemID>
  <EndingReason>NotAvailable</EndingReason>
</EndItemRequest>`;

    const res = await fetch(this.tradingUrl, {
      method: "POST",
      headers: this.tradingHeaders("EndItem"),
      body: xml,
    });

    const responseText = await res.text();
    const ack = this.xmlValue(responseText, "Ack");
    if (ack === "Failure" || !res.ok) {
      const errors = this.parseXmlErrors(responseText);
      throw new Error(`eBay EndItem failed: ${errors.join(" | ") || responseText.slice(0, 500)}`);
    }
  }

  async checkStatus(
    externalId: string
  ): Promise<{ status: "active" | "sold" | "ended" | "unknown"; soldPrice?: number }> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${this.escapeXml(this.connection.accessToken)}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${this.escapeXml(externalId)}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
</GetItemRequest>`;

    const res = await fetch(this.tradingUrl, {
      method: "POST",
      headers: this.tradingHeaders("GetItem"),
      body: xml,
    });

    if (!res.ok) return { status: "unknown" };

    const responseText = await res.text();
    const ack = this.xmlValue(responseText, "Ack");
    if (ack === "Failure") return { status: "unknown" };

    const sellingStatus = this.xmlValue(responseText, "ListingStatus");

    if (sellingStatus === "Completed") {
      const soldPriceStr = this.xmlValue(responseText, "CurrentPrice");
      const soldPrice = soldPriceStr ? parseFloat(soldPriceStr) : undefined;
      return { status: "sold", soldPrice };
    }
    if (sellingStatus === "Ended") return { status: "ended" };
    if (sellingStatus === "Active") return { status: "active" };

    return { status: "unknown" };
  }
}

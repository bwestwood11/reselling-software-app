import { BaseMarketplaceAdapter, type ListingPayload } from "./base";

export interface EbayImportedListing {
  itemId: string;
  title: string;
  price: number;
  quantity: number;
  conditionId: number;
  categoryId: string;
  categoryName: string;
  imageUrls: string[];
  listedAt: Date | null;
  listingStatus: string; // "Active" | "Completed" | "Ended"
}

export interface EbayItemDetail {
  itemId: string;
  title: string;
  description: string;
  price: number;       // current price in USD (dollars)
  startPrice: number;  // original listing price in USD (dollars)
  quantity: number;
  conditionId: number;
  categoryId: string;
  categoryName: string;
  imageUrls: string[];
  viewItemUrl: string;
  listingStatus: string;
  itemSpecifics: Array<{ name: string; value: string }>;
  listedAt: Date | null;
}

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
const TRADING_API_VERSION = "1227";

export class EbayAdapter extends BaseMarketplaceAdapter {
  private get tradingUrl() {
    return process.env.EBAY_SANDBOX === "true"
      ? TRADING_API_URL_SANDBOX
      : TRADING_API_URL;
  }

  /** Build HTTP headers for the Trading API (XML-based). */
  private tradingHeaders(callName: string): Record<string, string> {
    // EBAY_AUTH_TOKEN env var overrides the DB-stored OAuth token (useful for sandbox
    // testing with a Token Generator token that won't expire between test runs).
    const iafToken = process.env["EBAY_AUTH_TOKEN"] ?? this.connection.accessToken;
    const headers: Record<string, string> = {
      "X-EBAY-API-CALL-NAME": callName,
      "X-EBAY-API-SITEID": "0",
      "X-EBAY-API-COMPATIBILITY-LEVEL": TRADING_API_VERSION,
      "X-EBAY-API-IAF-TOKEN": iafToken,
      "Content-Type": "text/xml",
    };
    // App credentials — required by the Trading API to identify the application
    if (process.env["EBAY_CLIENT_ID"]) headers["X-EBAY-API-APP-NAME"] = process.env["EBAY_CLIENT_ID"];
    if (process.env["EBAY_CLIENT_SECRET"]) headers["X-EBAY-API-CERT-NAME"] = process.env["EBAY_CLIENT_SECRET"];
    if (process.env["EBAY_DEV_ID"]) headers["X-EBAY-API-DEV-NAME"] = process.env["EBAY_DEV_ID"];
    return headers;
  }

  /** Parse the XML response from the Trading API. Returns the text content of a tag. */
  private xmlValue(xml: string, tag: string): string | undefined {
    const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
    return match?.[1]?.trim();
  }

  /**
   * Calls GetUser to verify the token is valid and the account is a registered seller.
   * Throws a descriptive error if the token is invalid or the account has no seller standing.
   */
  private async assertSellerAccount(): Promise<void> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetUserRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
</GetUserRequest>`;

    const res = await fetch(this.tradingUrl, {
      method: "POST",
      headers: this.tradingHeaders("GetUser"),
      body: xml,
    });

    const text = await res.text();
    const ack = this.xmlValue(text, "Ack");
    console.log("[eBay GetUser] http=%d ack=%s raw=%s", res.status, ack ?? "?", text.slice(0, 1000));

    if (ack === "Failure" || !res.ok) {
      const errors = this.parseXmlErrors(text);
      throw new Error(`eBay token/account check failed: ${errors.join(" | ") || text.slice(0, 300)}`);
    }

    const userId = this.xmlValue(text, "UserID");
    const sellerLevel = this.xmlValue(text, "SellerLevel");
    const registrationStatus = this.xmlValue(text, "Status");
    console.log("[eBay GetUser] userId=%s sellerLevel=%s registrationStatus=%s", userId, sellerLevel ?? "(none)", registrationStatus ?? "(none)");

    // SellerInfo block is only present for registered sellers — its absence means the
    // account has never completed seller registration on this environment.
    if (!text.includes("<SellerInfo>")) {
      throw new Error(
        `eBay account "${userId}" is not registered as a seller on this environment (${process.env.EBAY_SANDBOX === "true" ? "sandbox" : "production"}). ` +
        `Complete seller registration at ${process.env.EBAY_SANDBOX === "true" ? "https://sandbox.ebay.com" : "https://ebay.com"} before publishing.`
      );
    }
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
      const errorCode = this.xmlValue(block, "ErrorCode") ?? "?";
      const classification = this.xmlValue(block, "ErrorClassification") ?? "";
      const msg = longMsg ?? shortMsg ?? "Unknown error";
      if (severity !== "Warning") {
        messages.push(`[${errorCode}${classification ? "/" + classification : ""}] ${msg}`);
      }
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

  /** Map our condition enum to eBay Trading API ConditionID using the full condition grading scale. */
  private mapConditionId(condition?: string): number {
    const map: Record<string, number> = {
      NEW_WITH_TAGS: 1000,    // New
      NEW_WITHOUT_TAGS: 1500, // New without tags / New other
      VERY_GOOD: 4000,        // Very Good
      GOOD: 5000,             // Good
      SATISFACTORY: 6000,     // Acceptable
    };
    return map[condition ?? "GOOD"] ?? 5000;
  }

  /** Return a standardized eBay condition descriptor for the given condition. */
  private mapConditionDescription(condition?: string): string {
    const map: Record<string, string> = {
      NEW_WITH_TAGS: "",
      NEW_WITHOUT_TAGS: "New item without original tags. Never used or worn.",
      VERY_GOOD: "Gently used with minor cosmetic imperfections. No functional defects.",
      GOOD: "Used item in good condition. Shows normal signs of use. Fully functional.",
      SATISFACTORY: "Shows significant signs of use and wear. Fully functional but may have noticeable cosmetic defects.",
    };
    return map[condition ?? "GOOD"] ?? "";
  }

  /** Reverse-map an eBay ConditionID to our internal Condition enum value. */
  static reverseMapConditionId(conditionId: number): "NEW_WITH_TAGS" | "NEW_WITHOUT_TAGS" | "VERY_GOOD" | "GOOD" | "SATISFACTORY" {
    if (conditionId === 1000) return "NEW_WITH_TAGS";
    if (conditionId === 1500) return "NEW_WITHOUT_TAGS";
    if (conditionId === 3000 || conditionId === 4000) return "VERY_GOOD";
    if (conditionId === 5000) return "GOOD";
    if (conditionId === 6000) return "SATISFACTORY";
    return "GOOD";
  }

  async publish(listing: ListingPayload): Promise<string> {
    try {

    // Verify token validity and seller registration before building/sending the listing.
    await this.assertSellerAccount();

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

    console.log(
      "[eBay Policies] fulfillmentPolicyId=%s paymentPolicyId=%s returnPolicyId=%s",
      listingPolicies.fulfillmentPolicyId,
      listingPolicies.paymentPolicyId,
      listingPolicies.returnPolicyId,
    );

    // Allow marketplaceData.conditionId to override the auto-mapped value.
    // Required for categories that use eBay's Condition Grading system (coins, trading cards, etc.)
    // which reject the generic 1000/1500/3000 IDs.
    const conditionId = md?.conditionId != null
      ? Number(md.conditionId)
      : this.mapConditionId(listing.inventoryItem?.condition);
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

    const isSandbox = process.env.EBAY_SANDBOX === "true";

    // The account is opted into eBay business policies, so inline shipping/return fields
    // are rejected — SellerProfiles with policy IDs must be used in both sandbox and production.
    const policiesXml = `    <SellerProfiles>
      <SellerShippingProfile>
        <ShippingProfileID>${this.escapeXml(listingPolicies.fulfillmentPolicyId)}</ShippingProfileID>
      </SellerShippingProfile>
      <SellerReturnProfile>
        <ReturnProfileID>${this.escapeXml(listingPolicies.returnPolicyId)}</ReturnProfileID>
      </SellerReturnProfile>
      <SellerPaymentProfile>
        <PaymentProfileID>${this.escapeXml(listingPolicies.paymentPolicyId)}</PaymentProfileID>
      </SellerPaymentProfile>
    </SellerProfiles>`;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title>${this.escapeXml(listing.title.slice(0, 80))}</Title>
    <Description><![CDATA[${listing.description ?? listing.title}]]></Description>
    <PrimaryCategory>
      <CategoryID>${this.escapeXml(categoryId)}</CategoryID>
    </PrimaryCategory>
    <StartPrice currencyID="USD">${price.toFixed(2)}</StartPrice>
    <CategoryMappingAllowed>true</CategoryMappingAllowed>
    <ConditionID>${conditionId}</ConditionID>
    ${isUsed && conditionDescription ? `<ConditionDescription>${this.escapeXml(conditionDescription.slice(0, 1000))}</ConditionDescription>` : ""}
    <Country>US</Country>
    <Currency>USD</Currency>
    <Location>${this.escapeXml(location)}</Location>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PictureDetails>
${pictureXml}
    </PictureDetails>
    ${postalCode ? `<PostalCode>${this.escapeXml(postalCode)}</PostalCode>` : ""}
    <Quantity>1</Quantity>
    <Site>US</Site>
${itemSpecificsXml}
${policiesXml}
  </Item>
</AddItemRequest>`;

    const headers = this.tradingHeaders("AddItem");
    console.log("[eBay AddItem XML]\n%s", xml);
    console.log("[eBay AddItem] sandbox=%s url=%s token_prefix=%s app=%s dev=%s cert=%s",
      process.env["EBAY_SANDBOX"],
      this.tradingUrl,
      process.env["EBAY_SANDBOX"] === "true" ? this.connection.accessToken.slice(0, 20) + "..." : "(redacted)",
      headers["X-EBAY-API-APP-NAME"] ?? "(missing)",
      headers["X-EBAY-API-DEV-NAME"] ?? "(missing)",
      headers["X-EBAY-API-CERT-NAME"] ? "(set)" : "(missing)",
    );

    // eBay sandbox has known issues with VerifyAddItem returning spurious 10007 errors
    // even for valid payloads. Skip it in sandbox to unblock testing; keep it in production.
    if (!isSandbox) {
      const verifyXml = xml
        .replace("<AddItemRequest", "<VerifyAddItemRequest")
        .replace("</AddItemRequest>", "</VerifyAddItemRequest>");
      const verifyRes = await fetch(this.tradingUrl, {
        method: "POST",
        headers: this.tradingHeaders("VerifyAddItem"),
        body: verifyXml,
      });
      const verifyText = await verifyRes.text();
      const verifyRlogId =
        verifyRes.headers.get("rlogid") ??
        verifyRes.headers.get("X-EBAY-REQUEST-ID") ??
        this.xmlValue(verifyText, "CorrelationID") ??
        "(not returned)";
      console.log("[eBay VerifyAddItem] http=%d ack=%s rlogId=%s raw=%s",
        verifyRes.status,
        this.xmlValue(verifyText, "Ack") ?? "?",
        verifyRlogId,
        verifyText.slice(0, 5000),
      );
      const verifyAck = this.xmlValue(verifyText, "Ack");
      if (verifyAck === "Failure" || verifyAck === "PartialFailure" || !verifyRes.ok) {
        const errors = this.parseXmlErrors(verifyText);
        throw new Error(
          `eBay VerifyAddItem failed (rlogId: ${verifyRlogId}): ${errors.length > 0 ? errors.join(" | ") : verifyText.slice(0, 500)}`
        );
      }
    } else {
      console.log("[eBay VerifyAddItem] skipped in sandbox mode");
    }

    const res = await fetch(this.tradingUrl, {
      method: "POST",
      headers,
      body: xml,
    });

    const responseText = await res.text();
    const rlogId =
      res.headers.get("rlogid") ??
      res.headers.get("X-EBAY-REQUEST-ID") ??
      this.xmlValue(responseText, "CorrelationID") ??
      "(not returned)";
    console.log("[eBay AddItem] http=%d ack=%s rlogId=%s raw=%s",
      res.status,
      this.xmlValue(responseText, "Ack") ?? "?",
      rlogId,
      responseText.slice(0, 2000),
    );

    const ack = this.xmlValue(responseText, "Ack");
    if (ack === "Failure" || ack === "PartialFailure" || !res.ok) {
      const errors = this.parseXmlErrors(responseText);
      throw new Error(
        `eBay AddItem failed (rlogId: ${rlogId}): ${errors.length > 0 ? errors.join(" | ") : responseText.slice(0, 500)}`
      );
    }

    const itemId = this.xmlValue(responseText, "ItemID");
    if (!itemId) {
      throw new Error("eBay AddItem succeeded but no ItemID was returned.");
    }

    return itemId;
    } catch (error) {
      console.error("[eBay Publish] Error publishing listing to eBay:", error);
      throw error;  
    }
  }

  async update(externalId: string, listing: ListingPayload): Promise<void> {
    const price =
      typeof listing.price === "object"
        ? parseFloat((listing.price as any).toString())
        : Number(listing.price);

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${this.escapeXml(externalId)}</ItemID>
    <StartPrice currencyID="USD">${price.toFixed(2)}</StartPrice>
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

  /** Extract all occurrences of a tag value (for repeated tags like PictureURL). */
  private xmlValues(xml: string, tag: string): string[] {
    const values: string[] = [];
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const v = match[1]?.trim();
      if (v) values.push(v);
    }
    return values;
  }

  /** Split an XML string into individual <Item>…</Item> blocks. */
  private parseItemBlocks(xml: string): string[] {
    const blocks: string[] = [];
    const regex = /<Item>([\s\S]*?)<\/Item>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      if (match[1]) blocks.push(match[1]);
    }
    return blocks;
  }

  /** Parse all <NameValueList> blocks from ItemSpecifics XML into name/value pairs. */
  private parseNameValuePairs(xml: string): Array<{ name: string; value: string }> {
    const pairs: Array<{ name: string; value: string }> = [];
    const regex = /<NameValueList>([\s\S]*?)<\/NameValueList>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const block = match[1] ?? "";
      const name = this.xmlValue(block, "Name");
      const value = this.xmlValue(block, "Value");
      if (name && value) pairs.push({ name, value });
    }
    return pairs;
  }

  /** Parse a single <Item> block from GetMyeBaySelling into our import shape. */
  private parseImportedItem(itemXml: string): EbayImportedListing | null {
    const itemId = this.xmlValue(itemXml, "ItemID");
    const title = this.xmlValue(itemXml, "Title");
    if (!itemId || !title) return null;

    const priceStr =
      this.xmlValue(itemXml, "CurrentPrice") ??
      this.xmlValue(itemXml, "BuyItNowPrice") ??
      this.xmlValue(itemXml, "StartPrice") ??
      "0";
    const price = parseFloat(priceStr) || 0;

    const quantityStr =
      this.xmlValue(itemXml, "QuantityAvailable") ??
      this.xmlValue(itemXml, "Quantity") ??
      "1";
    const quantity = Math.max(1, parseInt(quantityStr) || 1);

    const conditionId = parseInt(this.xmlValue(itemXml, "ConditionID") ?? "3000") || 3000;

    const categoryId = this.xmlValue(itemXml, "CategoryID") ?? "";
    const categoryName = this.xmlValue(itemXml, "CategoryName") ?? "";

    const imageUrls = this.xmlValues(itemXml, "PictureURL").filter(
      (u) => u.startsWith("http")
    );

    const startTimeStr = this.xmlValue(itemXml, "StartTime");
    const listedAt = startTimeStr ? new Date(startTimeStr) : null;

    const listingStatus = this.xmlValue(itemXml, "ListingStatus") ?? "Active";

    return { itemId, title, price, quantity, conditionId, categoryId, categoryName, imageUrls, listedAt, listingStatus };
  }

  /**
   * Fetches all active listings from eBay using GetMyeBaySelling.
   * Delegates to getSellerListingsByStatus("active").
   */
  async getSellerListings(): Promise<EbayImportedListing[]> {
    return this.getSellerListingsByStatus("active");
  }

  /**
   * Fetches seller listings from eBay by status using GetMyeBaySelling.
   * - active  → <ActiveList>
   * - ended   → <UnsoldList>
   * - sold    → <SoldList> (items are nested inside <Transaction> blocks)
   * Handles pagination automatically (up to 1 000 items as a safety cap).
   */
  async getSellerListingsByStatus(
    status: "active" | "ended" | "sold"
  ): Promise<EbayImportedListing[]> {
    let sectionTag: string;
    if (status === "active") {
      sectionTag = "ActiveList";
    } else if (status === "ended") {
      sectionTag = "UnsoldList";
    } else {
      sectionTag = "SoldList";
    }

    const all: EbayImportedListing[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <${sectionTag}>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </${sectionTag}>
</GetMyeBaySellingRequest>`;

      const res = await fetch(this.tradingUrl, {
        method: "POST",
        headers: this.tradingHeaders("GetMyeBaySelling"),
        body: xml,
      });

      const text = await res.text();
      const ack = this.xmlValue(text, "Ack");
      console.log("[eBay GetMyeBaySelling:%s] page=%d http=%d ack=%s", status, page, res.status, ack ?? "?");

      if (ack === "Failure" || !res.ok) {
        const errors = this.parseXmlErrors(text);
        throw new Error(`eBay GetMyeBaySelling failed: ${errors.join(" | ") || text.slice(0, 300)}`);
      }

      const items = this.parseItemBlocks(text);
      for (const block of items) {
        const listing = this.parseImportedItem(block);
        if (listing) all.push(listing);
      }

      const totalPagesStr = this.xmlValue(text, "TotalNumberOfPages") ?? "1";
      const totalPages = Number.parseInt(totalPagesStr) || 1;
      hasMore = page < totalPages;
      page++;

      if (all.length >= 1000) break;
    }

    console.log("[eBay GetMyeBaySelling:%s] fetched %d listings", status, all.length);
    return all;
  }

  /**
   * Fetches full details for a single eBay listing by ItemID using GetItem.
   * Used during import to get description, item specifics, and authoritative prices.
   */
  async getItemById(itemId: string): Promise<EbayItemDetail> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ItemID>${this.escapeXml(itemId)}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
  <IncludeItemSpecifics>true</IncludeItemSpecifics>
</GetItemRequest>`;

    const res = await fetch(this.tradingUrl, {
      method: "POST",
      headers: this.tradingHeaders("GetItem"),
      body: xml,
    });

    const text = await res.text();
    const ack = this.xmlValue(text, "Ack");
    console.log("[eBay GetItem] itemId=%s http=%d ack=%s", itemId, res.status, ack ?? "?");

    if (ack === "Failure" || !res.ok) {
      const errors = this.parseXmlErrors(text);
      throw new Error(`eBay GetItem failed for ${itemId}: ${errors.join(" | ") || text.slice(0, 300)}`);
    }

    const rawDesc = this.xmlValue(text, "Description") ?? "";
    // Strip CDATA wrapper if present
    const description = rawDesc.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();

    const priceStr =
      this.xmlValue(text, "CurrentPrice") ??
      this.xmlValue(text, "BuyItNowPrice") ??
      this.xmlValue(text, "StartPrice") ??
      "0";
    const price = Number.parseFloat(priceStr) || 0;

    const startPriceStr = this.xmlValue(text, "StartPrice") ?? "0";
    const startPrice = Number.parseFloat(startPriceStr) || 0;

    const conditionId = Number.parseInt(this.xmlValue(text, "ConditionID") ?? "5000") || 5000;
    const categoryId = this.xmlValue(text, "CategoryID") ?? "";
    const categoryName = this.xmlValue(text, "CategoryName") ?? "";
    const quantityStr = this.xmlValue(text, "Quantity") ?? "1";
    const quantity = Math.max(1, Number.parseInt(quantityStr) || 1);
    const imageUrls = this.xmlValues(text, "PictureURL").filter((u) => u.startsWith("http"));
    const viewItemUrl =
      this.xmlValue(text, "ViewItemURL") ?? `https://www.ebay.com/itm/${itemId}`;
    const listingStatus = this.xmlValue(text, "ListingStatus") ?? "Active";
    const startTimeStr = this.xmlValue(text, "StartTime");
    const listedAt = startTimeStr ? new Date(startTimeStr) : null;
    const itemSpecifics = this.parseNameValuePairs(text);

    return {
      itemId,
      title: this.xmlValue(text, "Title") ?? "",
      description,
      price,
      startPrice,
      quantity,
      conditionId,
      categoryId,
      categoryName,
      imageUrls,
      viewItemUrl,
      listingStatus,
      itemSpecifics,
      listedAt,
    };
  }

  async checkStatus(
    externalId: string
  ): Promise<{ status: "active" | "sold" | "ended" | "unknown"; soldPrice?: number }> {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
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

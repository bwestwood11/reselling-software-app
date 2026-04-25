import type { AddItemPayload } from "../types";

/**
 * Builds the XML request body for the Trading API AddItem call.
 * Uses OAuth via X-EBAY-API-IAF-TOKEN header — NO RequesterCredentials block.
 */
export function buildAddItemXml(payload: AddItemPayload): string {
  const currency = payload.currency ?? "USD";
  const quantity = payload.quantity ?? 1;

  const pictureBlock = payload.pictureUrl
    ? `<PictureDetails>
        <PictureURL>${escapeXml(payload.pictureUrl)}</PictureURL>
      </PictureDetails>`
    : "";

  const uuidBlock = payload.uuid ? `<UUID>${escapeXml(payload.uuid)}</UUID>` : "";

  const conditionDescBlock = payload.conditionDescription
    ? `<ConditionDescription>${escapeXml(payload.conditionDescription)}</ConditionDescription>`
    : "";

  const rp = payload.returnPolicy;
  const returnPolicyBlock = `<ReturnPolicy>
      <ReturnsAcceptedOption>${rp.returnsAccepted ? "ReturnsAccepted" : "ReturnsNotAccepted"}</ReturnsAcceptedOption>
      ${rp.refundOption ? `<RefundOption>${escapeXml(rp.refundOption)}</RefundOption>` : ""}
      ${rp.returnsWithinOption ? `<ReturnsWithinOption>${escapeXml(rp.returnsWithinOption)}</ReturnsWithinOption>` : ""}
      ${rp.shippingCostPaidByOption ? `<ShippingCostPaidByOption>${escapeXml(rp.shippingCostPaidByOption)}</ShippingCostPaidByOption>` : ""}
      ${rp.description ? `<Description>${escapeXml(rp.description)}</Description>` : ""}
    </ReturnPolicy>`;

  const ss = payload.shippingService;
  const shippingBlock = `<ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>${ss.priority ?? 1}</ShippingServicePriority>
        <ShippingService>${escapeXml(ss.serviceName)}</ShippingService>
        <ShippingServiceCost currencyID="${currency}">${ss.cost.toFixed(2)}</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>`;

  return `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  ${uuidBlock}
  <Item>
    <Title>${escapeXml(payload.title)}</Title>
    <Description><![CDATA[${payload.description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${escapeXml(payload.categoryId)}</CategoryID>
    </PrimaryCategory>
    <ConditionID>${payload.conditionId}</ConditionID>
    ${conditionDescBlock}
    <ListingType>${payload.listingType}</ListingType>
    <ListingDuration>${payload.listingDuration}</ListingDuration>
    <StartPrice currencyID="${currency}">${payload.startPrice.toFixed(2)}</StartPrice>
    <Quantity>${quantity}</Quantity>
    <Country>${payload.country}</Country>
    <Currency>${currency}</Currency>
    <Site>US</Site>
    ${pictureBlock}
    ${shippingBlock}
    ${returnPolicyBlock}
    <CategoryMappingAllowed>true</CategoryMappingAllowed>
  </Item>
</AddItemRequest>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

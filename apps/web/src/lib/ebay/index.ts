export { EbayAuthClient } from "./auth/EbayAuthClient";
export { EbayTradingClient } from "./trading/EbayTradingClient";
export { buildAddItemXml } from "./trading/addItemXml";
export { parseAddItemResponse } from "./trading/parseAddItemResponse";
export { TRADING_API_SCOPES } from "./auth/constants";
export type {
  EbayAuthConfig,
  EbayEnvironment,
  AddItemPayload,
  AddItemResult,
  AddItemFee,
  CachedUserToken,
  ConditionId,
  ListingType,
  ListingDuration,
  CurrencyCode,
  CountryCode,
  ShippingService,
  ReturnPolicy,
} from "./types";

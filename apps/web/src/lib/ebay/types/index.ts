export type EbayEnvironment = "sandbox" | "production";

export interface EbayAuthConfig {
  clientId: string;
  clientSecret: string;
  ruName: string;
  environment: EbayEnvironment;
  scopes: string[];
}

export interface EbayUserTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  token_type: "User Access Token";
}

export interface EbayRefreshedTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: "User Access Token";
}

export interface EbayOAuthError {
  error: string;
  error_description: string;
}

export interface CachedUserToken {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
}

export type ListingType = "Chinese" | "FixedPriceItem" | "StoresFixedPrice";
export type ListingDuration =
  | "Days_1"
  | "Days_3"
  | "Days_5"
  | "Days_7"
  | "Days_10"
  | "Days_30"
  | "GTC";
export type CurrencyCode = "USD" | "GBP" | "EUR" | "AUD" | "CAD";
export type CountryCode = "US" | "GB" | "AU" | "CA" | "DE";
export type ConditionId =
  | 1000
  | 1500
  | 2000
  | 2500
  | 3000
  | 4000
  | 5000
  | 6000
  | 7000;

export interface ShippingService {
  serviceName: string;
  cost: number;
  currency?: CurrencyCode;
  priority?: number;
}

export interface ReturnPolicy {
  returnsAccepted: boolean;
  refundOption?: string;
  returnsWithinOption?: string;
  shippingCostPaidByOption?: string;
  description?: string;
}

export interface AddItemPayload {
  title: string;
  categoryId: string;
  description: string;
  conditionId: ConditionId;
  conditionDescription?: string;
  listingType: ListingType;
  listingDuration: ListingDuration;
  startPrice: number;
  currency: CurrencyCode;
  country: CountryCode;
  quantity?: number;
  pictureUrl?: string;
  shippingService: ShippingService;
  returnPolicy: ReturnPolicy;
  uuid?: string;
}

export interface AddItemFee {
  name: string;
  fee: number;
  currency: string;
}

export interface AddItemResult {
  itemId: string;
  startTime: string;
  endTime: string;
  fees: AddItemFee[];
  warnings: string[];
}

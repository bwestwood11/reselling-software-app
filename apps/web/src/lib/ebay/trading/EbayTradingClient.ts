import type { EbayAuthConfig, AddItemPayload, AddItemResult } from "../types";
import { EbayAuthClient } from "../auth/EbayAuthClient";
import { buildAddItemXml } from "./addItemXml";
import { parseAddItemResponse } from "./parseAddItemResponse";
import {
  TRADING_API_ENDPOINTS,
  TRADING_API_COMPATIBILITY_LEVEL,
  TRADING_API_SITE_ID,
} from "../auth/constants";

export class EbayTradingClient {
  private readonly auth: EbayAuthClient;
  private readonly endpoint: string;
  private readonly refreshToken: string;

  constructor(config: EbayAuthConfig, refreshToken: string) {
    this.auth = new EbayAuthClient(config);
    this.endpoint = TRADING_API_ENDPOINTS[config.environment];
    this.refreshToken = refreshToken;
  }

  async addItem(payload: AddItemPayload): Promise<AddItemResult> {
    const xml = buildAddItemXml(payload);
    const accessToken = await this.auth.getAccessToken(this.refreshToken);
    return this.callTradingApi("AddItem", xml, accessToken);
  }

  /**
   * Validates the AddItem payload without creating a real listing.
   * Use in sandbox or development to catch errors before going live.
   */
  async verifyAddItem(payload: AddItemPayload): Promise<AddItemResult> {
    const xml = buildAddItemXml(payload)
      .replace("<AddItemRequest", "<VerifyAddItemRequest")
      .replace("</AddItemRequest>", "</VerifyAddItemRequest>");

    const accessToken = await this.auth.getAccessToken(this.refreshToken);
    return this.callTradingApi("VerifyAddItem", xml, accessToken);
  }

  buildConsentUrl(state?: string): string {
    return this.auth.buildConsentUrl(state);
  }

  async exchangeCodeForToken(authorizationCode: string) {
    return this.auth.exchangeCodeForToken(authorizationCode);
  }

  private async callTradingApi(
    callName: string,
    xmlBody: string,
    accessToken: string,
    isRetry = false,
  ): Promise<AddItemResult> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        // OAuth token via IAF header — do NOT use RequesterCredentials in XML
        "X-EBAY-API-IAF-TOKEN": accessToken,
        "X-EBAY-API-CALL-NAME": callName,
        "X-EBAY-API-SITEID": TRADING_API_SITE_ID,
        "X-EBAY-API-COMPATIBILITY-LEVEL": TRADING_API_COMPATIBILITY_LEVEL,
      },
      body: xmlBody,
    });

    if (response.status === 401 && !isRetry) {
      const freshToken = await this.auth.forceRefresh(this.refreshToken);
      return this.callTradingApi(callName, xmlBody, freshToken, true);
    }

    if (!response.ok) {
      throw new Error(
        `Trading API HTTP error ${response.status}: ${response.statusText}`,
      );
    }

    const responseXml = await response.text();
    return parseAddItemResponse(responseXml);
  }
}

import type { MarketplaceType } from "@repo/db";
import type { BaseMarketplaceAdapter } from "./base";
import { EbayAdapter } from "./ebay";
import { FacebookAdapter } from "./facebook";
import { DepopAdapter } from "./depop";
import { MercariAdapter } from "./mercari";
import { PoshmarkAdapter } from "./poshmark";

export class MarketplaceFactory {
  static create(
    marketplace: MarketplaceType,
    connection: { accessToken: string; refreshToken?: string | null; accountId?: string | null }
  ): BaseMarketplaceAdapter {
    switch (marketplace) {
      case "EBAY":
        return new EbayAdapter(connection);
      case "FACEBOOK_MARKETPLACE":
        return new FacebookAdapter(connection);
      case "DEPOP":
        return new DepopAdapter(connection);
      case "MERCARI":
        return new MercariAdapter(connection);
      case "POSHMARK":
        return new PoshmarkAdapter(connection);
      default:
        throw new Error(`Unsupported marketplace: ${marketplace}`);
    }
  }
}

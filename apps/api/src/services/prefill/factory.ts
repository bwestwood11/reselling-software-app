import type { PrismaClient } from "@repo/db";
import { BasePrefillProvider } from "./base.js";
import { MercariPrefillProvider } from "./mercari.js";
import { EbayPrefillProvider } from "./ebay.js";

export function getPrefillProvider(marketplace: string, db: PrismaClient): BasePrefillProvider {
  switch (marketplace) {
    case "MERCARI":
      return new MercariPrefillProvider(db);
    case "EBAY":
      return new EbayPrefillProvider(db);
    default: {
      const err = new Error(`Unsupported marketplace for prefill: ${marketplace}`) as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }
  }
}

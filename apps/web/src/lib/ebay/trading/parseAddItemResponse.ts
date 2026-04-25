import type { AddItemResult, AddItemFee } from "../types";

export function parseAddItemResponse(xml: string): AddItemResult {
  const ack = extractText(xml, "Ack");
  if (ack === "Failure") {
    const errorMsg =
      extractText(xml, "LongMessage") ?? extractText(xml, "ShortMessage") ?? "Unknown error";
    const errorCode = extractText(xml, "ErrorCode") ?? "";
    throw new Error(`eBay AddItem failed [${errorCode}]: ${errorMsg}`);
  }

  const itemId = extractText(xml, "ItemID");
  const startTime = extractText(xml, "StartTime");
  const endTime = extractText(xml, "EndTime");

  if (!itemId) {
    throw new Error("eBay AddItem response did not contain an ItemID");
  }

  return {
    itemId,
    startTime: startTime ?? "",
    endTime: endTime ?? "",
    fees: parseFees(xml),
    warnings: extractWarnings(xml),
  };
}

function extractText(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i");
  return xml.match(re)?.[1]?.trim();
}

function parseFees(xml: string): AddItemFee[] {
  const fees: AddItemFee[] = [];
  const feeBlockRe = /<Fee>([\s\S]*?)<\/Fee>/gi;
  let match: RegExpExecArray | null;

  while ((match = feeBlockRe.exec(xml)) !== null) {
    const block = match[1] ?? "";
    const name = extractText(block, "Name") ?? "Unknown";
    const feeText = extractText(block, "Fee") ?? "0";
    const currency = block.match(/currencyID="([^"]+)"/i)?.[1] ?? "USD";
    fees.push({ name, fee: parseFloat(feeText), currency });
  }

  return fees;
}

function extractWarnings(xml: string): string[] {
  const warnings: string[] = [];
  const errorBlockRe = /<Errors>([\s\S]*?)<\/Errors>/gi;
  let match: RegExpExecArray | null;

  while ((match = errorBlockRe.exec(xml)) !== null) {
    const block = match[1] ?? "";
    const severity = extractText(block, "SeverityCode") ?? "";
    if (severity === "Warning") {
      const msg =
        extractText(block, "LongMessage") ?? extractText(block, "ShortMessage") ?? "";
      if (msg) warnings.push(msg);
    }
  }

  return warnings;
}

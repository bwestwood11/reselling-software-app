export interface GeneratedDescription {
  description: string;
}

export interface AIProvider {
  readonly name: string;
  generateDescription(imageUrls: string[], title?: string): Promise<GeneratedDescription>;
}

export function parseXmlResult(xml: string): GeneratedDescription {
  const descMatch = xml.match(/<description>([\s\S]*?)<\/description>/);

  if (!descMatch?.[1]) {
    throw new Error("AI response is missing <description>");
  }

  return { description: descMatch[1].trim() };
}

export function buildSystemPrompt(title?: string): string {
  const titleLine = title
    ? `The seller has titled this item: "${title}". Use it to personalize and match the description's tone.`
    : "Infer the product type from the images.";

  return `You are a product listing assistant for a reselling platform.
Analyze the provided image(s) and write a compelling product description.

${titleLine}

Rules:
- 50-150 words
- Cover condition, notable features, materials, and sizing if visible
- Do not repeat the title verbatim as the opening sentence
- Write in a natural, seller voice

Return ONLY valid XML — no markdown fences, no extra text:
<result>
  <description>product description here</description>
</result>`;
}

import OpenAI from "openai";
import type { AIProvider, GeneratedDescription } from "./base.js";
import { buildSystemPrompt, parseXmlResult } from "./base.js";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  private client: OpenAI;
  private model: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.AI_MODEL ?? "gpt-4o";
  }

  async generateDescription(imageUrls: string[], title?: string): Promise<GeneratedDescription> {
    const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = imageUrls.map((url) => ({
      type: "image_url",
      image_url: { url, detail: "low" },
    }));

    const userText = title
      ? `Write a description for this product titled "${title}".`
      : "Write a description for this product.";

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 400,
      messages: [
        { role: "system", content: buildSystemPrompt(title) },
        {
          role: "user",
          content: [...imageContent, { type: "text", text: userText }],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    return parseXmlResult(content);
  }
}

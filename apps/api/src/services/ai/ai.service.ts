import type { AIProvider, GeneratedDescription } from "./providers/base.js";
import { createAIProvider } from "./providers/factory.js";

export class AIService {
  private provider: AIProvider;

  constructor() {
    this.provider = createAIProvider(process.env.AI_PROVIDER);
  }

  async generateDescription(imageUrls: string[], title?: string): Promise<GeneratedDescription> {
    if (imageUrls.length === 0) throw new Error("At least one image URL is required");
    if (imageUrls.length > 10) throw new Error("Maximum 10 images allowed");
    return this.provider.generateDescription(imageUrls, title);
  }
}

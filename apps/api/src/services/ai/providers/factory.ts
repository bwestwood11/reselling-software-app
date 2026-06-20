import type { AIProvider } from "./base.js";
import { OpenAIProvider } from "./openai.provider.js";

const PROVIDERS = {
  openai: () => new OpenAIProvider(),
} as const;

export type ProviderType = keyof typeof PROVIDERS;

export function createAIProvider(type: string = "openai"): AIProvider {
  const factory = PROVIDERS[type as ProviderType];
  if (!factory) {
    throw new Error(
      `Unknown AI_PROVIDER "${type}". Valid options: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return factory();
}

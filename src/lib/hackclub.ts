import {
  createOpenRouter,
  OpenRouterProvider,
  OpenRouterProviderSettings,
} from "@openrouter/ai-sdk-provider";

const BASE = "https://ai.hackclub.com/proxy/v1";

export function createHackclub(
  options?: OpenRouterProviderSettings,
): OpenRouterProvider {
  return createOpenRouter({
    apiKey: process.env.HACKAI_KEY,
    baseURL: BASE,
    compatibility: "strict",
    headers: {
      "X-Title": "citation.eli.best",
    },
    ...options,
  });
}

export const hackclub = createHackclub();

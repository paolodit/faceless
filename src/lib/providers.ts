import { IMAGE_PROVIDERS, type ImageProvider } from "./constants.js";

export function normalizeImageProvider(value: string): ImageProvider {
  if ((IMAGE_PROVIDERS as readonly string[]).includes(value)) {
    return value as ImageProvider;
  }

  throw new Error(`Unknown image provider: "${value}"

Valid providers:
${IMAGE_PROVIDERS.map((provider) => `- ${provider}`).join("\n")}`);
}

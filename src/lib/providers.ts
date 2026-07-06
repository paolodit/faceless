import {
  IMAGE_PROVIDERS,
  SCENE_VIDEO_PROVIDERS,
  type ImageProvider,
  type SceneVideoProvider
} from "./constants.js";

export function normalizeImageProvider(value: string): ImageProvider {
  if ((IMAGE_PROVIDERS as readonly string[]).includes(value)) {
    return value as ImageProvider;
  }

  throw new Error(`Unknown image provider: "${value}"

Valid providers:
${IMAGE_PROVIDERS.map((provider) => `- ${provider}`).join("\n")}`);
}

export function normalizeSceneVideoProvider(value: string): SceneVideoProvider {
  if ((SCENE_VIDEO_PROVIDERS as readonly string[]).includes(value)) {
    return value as SceneVideoProvider;
  }

  throw new Error(`Unknown scene video provider: "${value}"

Valid providers:
${SCENE_VIDEO_PROVIDERS.map((provider) => `- ${provider}`).join("\n")}`);
}

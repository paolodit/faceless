export const PROFILE_NAMES = [
  "tiktok",
  "youtube-shorts",
  "youtube-long",
  "linkedin-video"
] as const;

export type ProfileName = (typeof PROFILE_NAMES)[number];

export const ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:5"] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const IMAGE_PROVIDERS = ["manual", "external", "mock", "openai", "magnific"] as const;

export type ImageProvider = (typeof IMAGE_PROVIDERS)[number];

export const SCENE_VIDEO_PROVIDERS = ["manual", "magnific", "higgsfield"] as const;

export type SceneVideoProvider = (typeof SCENE_VIDEO_PROVIDERS)[number];

export const PRODUCTION_PIPELINES = [
  "narrated-explainer",
  "linkedin-vox-pop",
  "narrated-visual-story"
] as const;

export type ProductionPipelineName = (typeof PRODUCTION_PIPELINES)[number];

export const LEGACY_PIPELINE_NAMES = [
  "faceless-explainer",
  "animated-explainer",
  "documentary-montage",
  "screen-demo"
] as const;

export type LegacyPipelineName = (typeof LEGACY_PIPELINE_NAMES)[number];

export const SCENE_LAYOUT_MODES = [
  "auto",
  "single-image",
  "fast-cut",
  "additive-slide",
  "voxpop",
  "screen-demo",
  "montage"
] as const;

export type SceneLayoutMode = (typeof SCENE_LAYOUT_MODES)[number];

export type ConcreteSceneLayoutMode = Exclude<SceneLayoutMode, "auto">;

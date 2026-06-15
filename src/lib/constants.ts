export const PROFILE_NAMES = [
  "tiktok",
  "youtube-shorts",
  "youtube-long",
  "linkedin-video"
] as const;

export type ProfileName = (typeof PROFILE_NAMES)[number];

export const ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:5"] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const IMAGE_PROVIDERS = ["manual", "external", "mock", "openai"] as const;

export type ImageProvider = (typeof IMAGE_PROVIDERS)[number];

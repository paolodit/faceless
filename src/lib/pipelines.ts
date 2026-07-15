import {
  PRODUCTION_PIPELINES,
  type LegacyPipelineName,
  type ProductionPipelineName
} from "./constants.js";

export interface ProductionPipeline {
  name: ProductionPipelineName;
  title: string;
  summary: string;
  bestFor: string[];
  defaultRoute: string[];
  humanCheckpoints: string[];
  assetBias: string;
  optionalLanes: string[];
}

const PIPELINES: Record<ProductionPipelineName, ProductionPipeline> = {
  "narrated-explainer": {
    name: "narrated-explainer",
    title: "Short Explainer",
    summary: "One useful idea turned into a clear short-form question, answer, example, visual explanation and memorable takeaway.",
    bestFor: ["short educational videos", "TikTok explainers", "YouTube Shorts", "script-first creator formats"],
    defaultRoute: [
      "review the question, answer, example and takeaway",
      "estimate scenes and cost",
      "prepare timed scenes",
      "plan visual events",
      "write scene prompts",
      "generate or place images",
      "approve images",
      "package edit files"
    ],
    humanCheckpoints: ["route-specific script review", "proposal", "preview", "image approval", "final package review"],
    assetBias: "One strong readable image per scene, with optional overlays and stock cutaways.",
    optionalLanes: ["upscale selected images", "turn approved images into short scene video clips", "generate thumbnails"]
  },
  "linkedin-vox-pop": {
    name: "linkedin-vox-pop",
    title: "LinkedIn POV / Vox Pop",
    summary: "A professional point-of-view video with a clear claim, credible examples, caption-safe overlays and optional b-roll or stock cutaways.",
    bestFor: ["LinkedIn explainers", "founder or expert viewpoints", "vox pops", "professional commentary"],
    defaultRoute: [
      "review the point of view, tension, support and practical landing",
      "prepare clear claim, evidence and takeaway beats",
      "plan speaker, quote-card, b-roll and overlay moments",
      "generate or place supporting visuals",
      "approve readable social assets",
      "package captions, post copy and editor files"
    ],
    humanCheckpoints: ["route-specific script review", "proposal", "claim and source review", "overlay readability review", "final package review"],
    assetBias: "One recurring speaker or visual anchor, clear quote/term cards and carefully chosen supporting cutaways.",
    optionalLanes: ["free stock cutaways", "thumbnail variants", "Remotion preview refinement"]
  },
  "narrated-visual-story": {
    name: "narrated-visual-story",
    title: "Narrated Visual Story",
    summary: "A place-led or character-led story with visual continuity, sequential scenes and optional motion on the strongest beats.",
    bestFor: ["character-led stories", "local story pitches", "narrated illustrated essays", "visual storytelling"],
    defaultRoute: [
      "review character, place, turn, stakes and payoff",
      "prepare sequential scenes and recurring anchors",
      "plan visual continuity and scene grammar",
      "generate or place story images",
      "approve images before optional motion",
      "package editor files and a Remotion draft"
    ],
    humanCheckpoints: ["route-specific script review", "proposal", "continuity preview", "image approval", "final package review"],
    assetBias: "Consistent characters, places and silhouettes that feel like they belong to the same world.",
    optionalLanes: ["Magnific upscales", "scene video clips for key beats", "Remotion preview refinement"]
  }
};

const LEGACY_PIPELINE_ALIASES: Record<LegacyPipelineName, ProductionPipelineName> = {
  "faceless-explainer": "narrated-explainer",
  "animated-explainer": "narrated-visual-story",
  "documentary-montage": "narrated-explainer"
};

const CREATOR_TYPE_ALIASES: Record<string, ProductionPipelineName> = {
  explainer: "narrated-explainer",
  "narrated-explainer": "narrated-explainer",
  linkedin: "linkedin-vox-pop",
  "vox-pop": "linkedin-vox-pop",
  "linkedin-vox-pop": "linkedin-vox-pop",
  story: "narrated-visual-story",
  "visual-story": "narrated-visual-story",
  "narrated-visual-story": "narrated-visual-story"
};

export function listProductionPipelines(): ProductionPipeline[] {
  return PRODUCTION_PIPELINES.map((name) => PIPELINES[name]);
}

export function getProductionPipeline(name: ProductionPipelineName): ProductionPipeline {
  return PIPELINES[name];
}

export function normalizeProductionPipelineName(value: string): ProductionPipelineName | undefined {
  if ((PRODUCTION_PIPELINES as readonly string[]).includes(value)) {
    return value as ProductionPipelineName;
  }

  return LEGACY_PIPELINE_ALIASES[value as LegacyPipelineName];
}

export function normalizeCreatorType(value: string | undefined): ProductionPipelineName | undefined {
  if (!value) {
    return "narrated-explainer";
  }

  return CREATOR_TYPE_ALIASES[value.trim().toLowerCase()];
}

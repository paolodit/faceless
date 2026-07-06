import { PRODUCTION_PIPELINES, type ProductionPipelineName } from "./constants.js";

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
  "faceless-explainer": {
    name: "faceless-explainer",
    title: "Faceless Explainer",
    summary: "Narration-led scenes with clear generated images, overlay beats and editor-ready timing.",
    bestFor: ["short educational videos", "opinion explainers", "script-first creator formats"],
    defaultRoute: [
      "analyze hook and pacing",
      "estimate scenes and cost",
      "prepare timed scenes",
      "plan visual events",
      "write scene prompts",
      "generate or place images",
      "approve images",
      "package edit files"
    ],
    humanCheckpoints: ["proposal", "preview", "image approval", "final package review"],
    assetBias: "One strong readable image per scene, with optional overlays and stock cutaways.",
    optionalLanes: ["upscale selected images", "turn approved images into short scene video clips", "generate thumbnails"]
  },
  "animated-explainer": {
    name: "animated-explainer",
    title: "Animated Explainer",
    summary: "Illustrated or stylized scenes designed to be animated gently in Remotion or an editor.",
    bestFor: ["simple concepts", "character-led explanations", "visual metaphors"],
    defaultRoute: [
      "analyze story clarity",
      "prepare scenes with recurring anchors",
      "plan overlays and transitions",
      "generate consistent images",
      "approve images before motion",
      "package Remotion and editor files"
    ],
    humanCheckpoints: ["proposal", "style preview", "character consistency review", "final package review"],
    assetBias: "Consistent characters, clean silhouettes and simple backgrounds that survive motion.",
    optionalLanes: ["Magnific upscales", "scene video clips", "Remotion preview refinement"]
  },
  "documentary-montage": {
    name: "documentary-montage",
    title: "Documentary Montage",
    summary: "Narration-led edit with supporting cutaways, references, stock searches and lower motion pressure.",
    bestFor: ["essay-style shorts", "case studies", "local stories", "timeline or context videos"],
    defaultRoute: [
      "analyze argument and evidence",
      "prepare scene structure",
      "plan visual events and stock queries",
      "collect or generate supporting assets",
      "approve usable assets",
      "package edit files and credits"
    ],
    humanCheckpoints: ["proposal", "source/reference review", "image approval", "credits review"],
    assetBias: "Mix generated keyframes with local references, screenshots and stock cutaways.",
    optionalLanes: ["stock-assets", "reference image packs", "scene video clips only for key beats"]
  },
  "screen-demo": {
    name: "screen-demo",
    title: "Screen Demo",
    summary: "A practical walkthrough where screenshots or screen recordings are primary and generated images are supporting.",
    bestFor: ["software explainers", "product walkthroughs", "tutorial clips"],
    defaultRoute: [
      "analyze the promise and steps",
      "prepare scenes around actions",
      "place screenshots or recordings in input/assets",
      "plan overlays and callouts",
      "package timeline and captions"
    ],
    humanCheckpoints: ["proposal", "screenshot/recording review", "overlay review", "final package review"],
    assetBias: "Local screenshots and recordings first; generated images only for intro, outro or metaphor shots.",
    optionalLanes: ["shot list cleanup", "overlay text polish", "thumbnail generation"]
  }
};

export function listProductionPipelines(): ProductionPipeline[] {
  return PRODUCTION_PIPELINES.map((name) => PIPELINES[name]);
}

export function getProductionPipeline(name: ProductionPipelineName): ProductionPipeline {
  return PIPELINES[name];
}

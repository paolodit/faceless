import { countWords } from "./format.js";
import type { OutputProfile } from "./profiles.js";
import type { ProjectConfig } from "./schemas.js";
import { splitScriptIntoBeats } from "./script.js";

export interface ProductionPlan {
  projectName: string;
  profile: string;
  aspectRatio: string;
  scriptWords: number;
  estimatedDurationSeconds: number;
  estimatedScenes: number;
  imagesPerScene: number;
  previewScenes: number;
  previewImages: number;
  fullImages: number;
  imageProvider: string;
  currency: string;
  imageCostPerGeneration: number;
  costMultiplier: number;
  previewCost: number;
  fullCost: number;
  previewBaseCost: number;
  fullBaseCost: number;
  previewCautiousCost: number;
  fullCautiousCost: number;
  baseCost: number;
  cautiousCost: number;
  warnings: string[];
  expectedFiles: string[];
}

export function estimateProductionPlan(
  config: ProjectConfig,
  profile: OutputProfile,
  scriptText: string
): ProductionPlan {
  const scriptWords = countWords(scriptText);
  const wordsPerMinute = config.generation.words_per_minute;
  const estimatedDurationSeconds =
    scriptWords === 0 ? 0 : Math.max(1, Math.ceil((scriptWords / wordsPerMinute) * 60));
  const targetSceneSeconds =
    config.generation.scene_duration_target_seconds ?? profile.targetSceneSeconds;
  const estimatedScenes =
    scriptWords === 0
      ? 0
      : splitScriptIntoBeats(scriptText, {
          targetSceneSeconds,
          minSceneSeconds: config.generation.min_scene_duration_seconds ?? profile.minSceneSeconds,
          maxSceneSeconds: config.generation.max_scene_duration_seconds ?? profile.maxSceneSeconds,
          wordsPerMinute,
          primaryCharacter: "Main Character"
        }).length;
  const imagesPerScene = config.generation.images_per_scene;
  const previewScenes = Math.min(config.generation.preview_scenes, estimatedScenes);
  const previewImages = previewScenes * imagesPerScene;
  const fullImages = estimatedScenes * imagesPerScene;
  const imageCostPerGeneration = config.costs.image_cost_per_generation;
  const costMultiplier = config.costs.cost_multiplier;
  const previewBaseCost = previewImages * imageCostPerGeneration;
  const fullBaseCost = fullImages * imageCostPerGeneration;
  const warnings = buildWarnings(scriptWords, estimatedDurationSeconds, profile);

  return {
    projectName: config.project_name,
    profile: config.profile,
    aspectRatio: config.aspect_ratio,
    scriptWords,
    estimatedDurationSeconds,
    estimatedScenes,
    imagesPerScene,
    previewScenes,
    previewImages,
    fullImages,
    imageProvider: config.generation.image_provider,
    currency: config.costs.currency,
    imageCostPerGeneration,
    costMultiplier,
    previewCost: previewBaseCost,
    fullCost: fullBaseCost,
    previewBaseCost,
    fullBaseCost,
    previewCautiousCost: previewBaseCost * costMultiplier,
    fullCautiousCost: fullBaseCost * costMultiplier,
    baseCost: fullBaseCost,
    cautiousCost: fullBaseCost * costMultiplier,
    warnings,
    expectedFiles: [
      "output/00_analysis/content_analysis.json",
      "output/00_analysis/content_analysis.md",
      "output/01_transcript/transcript.txt",
      "output/01_transcript/timestamps.json",
      "output/02_scenes/scenes.json",
      "output/02_scenes/scenes.md",
      "output/03_prompts/prompts.json",
      "output/03_prompts/prompts.md",
      "output/03_prompts/thumbnail_prompts.json",
      "output/03_prompts/thumbnail_prompts.md",
      "output/04_images/preview/",
      "output/04_images/full/",
      "output/04_images/approvals.json",
      "output/04_images/approval_sheet.md",
      "output/05_captions/captions.srt",
      "output/05_captions/captions.vtt",
      "output/06_edit_pack/edit_manifest.csv",
      "output/06_edit_pack/edit_manifest.json",
      "output/06_edit_pack/shot_list.md",
      "output/06_edit_pack/asset_checklist.md",
      "output/06_edit_pack/timelines/premiere_timeline.csv",
      "output/06_edit_pack/timelines/davinci_timeline.csv",
      "output/06_edit_pack/timelines/timeline.fcpxml",
      "output/06_edit_pack/storyboard.md",
      "output/07_publish/upload_checklist.md",
      "output/07_publish/metadata_brief.md",
      "output/07_publish/copy_pack.md",
      "output/07_publish/thumbnails/",
      "output/run_report.md",
      "output/README_NEXT_STEPS.md"
    ]
  };
}

function buildWarnings(scriptWords: number, duration: number, profile: OutputProfile): string[] {
  const warnings: string[] = [];

  if (scriptWords === 0) {
    warnings.push("The script is empty. Add script text before prepare.");
    return warnings;
  }

  if (duration < profile.recommendedLengthSeconds.min) {
    warnings.push(
      `This is short for ${profile.name}. Recommended minimum is about ${profile.recommendedLengthSeconds.min} seconds.`
    );
  }

  if (duration > profile.recommendedLengthSeconds.max) {
    warnings.push(
      `This is long for ${profile.name}. Recommended maximum is about ${profile.recommendedLengthSeconds.max} seconds.`
    );
  }

  return warnings;
}

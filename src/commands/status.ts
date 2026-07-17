import path from "node:path";
import fs from "fs-extra";
import { displayPath } from "../lib/files.js";
import { isClaimReviewCurrent } from "../lib/claims.js";
import { isContinuityReviewCurrent } from "../lib/continuity.js";
import { getProductionPipeline } from "../lib/pipelines.js";
import { isRouteQualityReviewCurrent } from "../lib/route-quality.js";
import { formatValidationFailure, validateProject } from "../lib/validation.js";
import { inspectProjectWorkflowFreshness } from "../lib/workflow-freshness.js";
import { inspectProductionReadiness } from "../lib/production-readiness.js";
import { getVisualEventAssetState } from "../lib/visual-event-assets.js";
import {
  getApprovalState,
  getImageAssetState,
  getSceneAssetFolderState,
  imageAssetDetail,
  readScenePrompts,
  sceneAssetFolderDetail
} from "../lib/workflow-assets.js";

interface Stage {
  id: string;
  name: string;
  complete: boolean;
  detail: string;
  nextCommand?: string;
  why?: string;
  after?: string;
  optional?: boolean;
}

export async function statusProjectCommand(projectPath: string): Promise<string> {
  const validation = await validateProject(projectPath);

  if (!validation.valid || !validation.project) {
    return `${formatValidationFailure(validation.issues)}

Project status could not be computed until validation passes.`;
  }

  const project = validation.project;
  const output = project.paths.outputFolder;
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const pipeline = getProductionPipeline(project.config.pipeline);
  const scriptText = await fs.readFile(project.paths.scriptFile, "utf8");
  const routeReviewCurrent = await isRouteQualityReviewCurrent({
    outputFolder: output,
    config: project.config,
    scriptText,
    characterNames: project.characterBible.characters.map((character) => character.name)
  });
  const freshness = await inspectProjectWorkflowFreshness(project);
  const scenesReady = freshness.scenes;
  const prompts = await readScenePrompts(output);
  const imageAssets = await getImageAssetState(output, prompts);
  const approvalState = await getApprovalState(output, prompts, imageAssets);
  const sceneAssetFolders = await getSceneAssetFolderState(output, prompts);
  const sceneAssetsReady = sceneAssetFolders.ready;
  const imagesApproved = approvalState.ready;
  const packageOutputsReady = freshness.package;
  const visualAssetState = await getVisualEventAssetState({ projectRoot: project.root, outputFolder: output });
  const visualAssetsReady = visualAssetState.expected === 0 || visualAssetState.realAvailable === visualAssetState.expected;
  const visualAssetsApproved = visualAssetState.expected === 0 || visualAssetState.approved === visualAssetState.expected;
  const audioReady = Boolean(project.paths.audioFile);
  const packageReady = packageOutputsReady && audioReady && sceneAssetsReady && imagesApproved && visualAssetsApproved;
  const readiness = await inspectProductionReadiness(project);
  const claimsReady =
    project.config.pipeline === "linkedin-vox-pop" &&
    (await isClaimReviewCurrent({ outputFolder: output, evidence: project.evidence }));
  const continuityReady =
    project.config.pipeline === "narrated-visual-story" &&
    (await isContinuityReviewCurrent({ outputFolder: output, continuity: project.continuity }));
  const stages: Stage[] = [
    {
      id: "validate",
      name: "validate",
      complete: true,
      detail: "project.yml, input files, style bible and characters are valid."
    },
    {
      id: "analyze",
      name: "analyze",
      complete: (await exists(output, "00_analysis", "content_analysis.md")) && routeReviewCurrent,
      detail: await routeReviewDetail(output, routeReviewCurrent),
      nextCommand: `video-pack analyze --project ${projectArg} --force`,
      why: "This checks hook strength, pacing and the structural promise of the selected creator route.",
      after: `Review output/00_analysis/route_review.html and output/00_analysis/content_analysis.md\nThen run:\nvideo-pack plan --project ${projectArg} --force`
    },
    {
      id: "plan",
      name: "plan",
      complete: freshness.plan,
      detail: "scene count and base/cautious cost estimate.",
      nextCommand: `video-pack plan --project ${projectArg} --force`,
      why: "This estimates duration, scene count, image count and likely generation cost before you make assets.",
      after: `Run:\nvideo-pack proposal --project ${projectArg} --force`
    },
    {
      id: "proposal",
      name: "proposal",
      complete: freshness.proposal || scenesReady,
      detail: await proposalDetail(output, scenesReady),
      nextCommand: `video-pack proposal --project ${projectArg} --force`,
      why: "This gives the creator a plain-language route, provider readiness, cost watch and review checkpoints before asset-heavy work.",
      after: "Review output/00_proposal/proposal.md, then add the final narration under input/ and configure project.yml."
    },
    {
      id: "audio",
      name: "narration",
      complete: audioReady,
      detail: audioReady
        ? `configured at ${displayPath(project.root, project.paths.audioFile!)}`
        : "final narration is not configured yet.",
      nextCommand: "Add input/voice.mp3 (or voice.wav, voice.m4a, or voice.aac).",
      why: "Final voice delivery should drive scene timing, captions and visual beats before asset production.",
      after: `Conventional voice filenames are detected automatically. For another filename, set project.yml input.audio_file. Then run:\nvideo-pack next --project ${projectArg}`
    },
    {
      id: "prepare",
      name: "prepare",
      complete:
        (await exists(output, "01_transcript", "transcript.txt")) &&
        (await exists(output, "02_scenes", "scenes.json")),
      detail: await sceneDetail(output, scenesReady),
      nextCommand: `video-pack prepare --project ${projectArg} --force`,
      why: "This creates transcript timings and editable scene files from your script and voiceover.",
      after:
        project.config.pipeline === "linkedin-vox-pop"
          ? `Review output/02_scenes/scenes.md\nThen run:\nvideo-pack claims --project ${projectArg} --force`
          : project.config.pipeline === "narrated-visual-story"
            ? `Review output/02_scenes/scenes.md\nThen run:\nvideo-pack continuity --project ${projectArg} --force`
          : `Review output/02_scenes/scenes.md\nThen run:\nvideo-pack visual-events --project ${projectArg} --force`
    },
    ...(project.config.pipeline === "linkedin-vox-pop"
      ? [
          {
            id: "claims",
            name: "claims",
            complete: claimsReady,
            detail: await claimReviewDetail(output, claimsReady),
            nextCommand: `video-pack claims --project ${projectArg} --force`,
            why: "This maps LinkedIn factual statements to source, first-hand, internal-data or declared-opinion support before the script becomes visual assets and post copy.",
            after: `Review output/00_analysis/claim_review.md\nThen run:\nvideo-pack visual-events --project ${projectArg} --force`
          }
        ]
      : []),
    ...(project.config.pipeline === "narrated-visual-story"
      ? [
          {
            id: "continuity",
            name: "continuity",
            complete: continuityReady,
            detail: await continuityReviewDetail(output, continuityReady),
            nextCommand: `video-pack continuity --project ${projectArg} --force`,
            why: "This checks world, character and location anchors against each scene and the generated prompts before story assets multiply.",
            after: `Review output/02_scenes/continuity_review.html\nThen run:\nvideo-pack visual-events --project ${projectArg} --force`
          }
        ]
      : []),
    {
      id: "visual-events",
      name: "visual-events",
      complete: freshness.visualEvents || freshness.prompts,
      detail: await visualEventDetail(output),
      nextCommand: `video-pack visual-events --project ${projectArg} --force`,
      why: "This chooses scene production layouts, then creates editor-facing visual beats, overlay text rows, stock search queries and an asset manifest before you build prompts.",
      after: `Review output/02_scenes/scene_production.html, output/02_scenes/scene_production.md, output/02_scenes/visual_events.md and output/06_edit_pack/overlay_text.csv\nThen run:\nvideo-pack prompts --project ${projectArg} --force`
    },
    {
      id: "prompts",
      name: "prompts",
      complete: freshness.prompts,
      detail: await promptDetail(output),
      nextCommand: `video-pack prompts --project ${projectArg} --force`,
      why: "This turns the reviewed scenes, style bible and character bible into image prompt packs.",
      after: `Review output/03_prompts/prompts.md\nThen run:\nvideo-pack preview --project ${projectArg} --count ${project.config.generation.preview_scenes} --force`
    },
    {
      id: "preview",
      name: "layout-preview",
      complete: freshness.preview,
      detail: await folderCountDetail(path.join(output, "04_images", "preview")),
      nextCommand: `video-pack preview --project ${projectArg} --count ${project.config.generation.preview_scenes} --force`,
      why: "This checks layout, aspect ratio and review-board flow with no-cost placeholders. Use a real provider or an external tool to judge art direction.",
      after: `If the style works, run:\nvideo-pack generate-images --project ${projectArg}`
    },
    {
      id: "generate-images",
      name: "real-scene-assets",
      complete: imageAssets.expected > 0 && imageAssets.realAvailable === imageAssets.expected,
      detail: imageAssetDetail(imageAssets),
      nextCommand: `video-pack generate-images --project ${projectArg}`,
      why: imageAssets.promptPackReady
        ? "The external/manual prompt pack is ready. Save the expected real image files into output/04_images/full/ before approval."
        : "This prepares prompt packs, placeholders or real scene images. Approval only opens once every scene has an asset.",
      after: `Review output/04_images/full/ and output/04_images/scenes/\nThen run:\nvideo-pack approve-images --project ${projectArg}`
    },
    {
      id: "scene-assets",
      name: "scene-assets",
      complete: sceneAssetsReady,
      detail: sceneAssetFolderDetail(sceneAssetFolders),
      nextCommand: `video-pack scene-assets --project ${projectArg} --force`,
      why: "This creates one logical folder per scene so prompts, images, approved files, upscales, video clips and notes stay together.",
      after: `Optional polish:\nvideo-pack upscale-images --project ${projectArg}\nvideo-pack generate-scene-videos --project ${projectArg}\n\nOr continue:\nvideo-pack approve-images --project ${projectArg}`
    },
    {
      id: "approve-images",
      name: "approve-images",
      complete: imagesApproved,
      detail: `${approvalState.approved}/${approvalState.expected} real scene assets approved.`,
      nextCommand: `video-pack approve-images --project ${projectArg}`,
      why: "This helps track which generated images are approved, rejected or need regeneration.",
      after: `Review output/04_images/review_board.md\nTo approve all current images, run:\nvideo-pack approve-images --project ${projectArg} --approve-all\nThen run:\nvideo-pack package --project ${projectArg}`
    },
    {
      id: "visual-assets",
      name: "supporting-visuals",
      complete: visualAssetsReady,
      detail: `${visualAssetState.realAvailable}/${visualAssetState.expected} real raster cutaways present; ${visualAssetState.mockPlaceholders} mock placeholders; ${visualAssetState.overlays} overlays and ${visualAssetState.transitions} transitions are code-rendered.`,
      nextCommand: `video-pack visual-assets --project ${projectArg} --provider external`,
      why: "This creates a real asset path for every planned raster cutaway instead of leaving it as an editor note.",
      after: `Review output/04_images/events/review_board.html, then record approval decisions.`
    },
    {
      id: "approve-visual-assets",
      name: "approve-supporting-visuals",
      complete: visualAssetsApproved,
      detail: `${visualAssetState.approved}/${visualAssetState.expected} planned raster cutaways approved.`,
      nextCommand: `video-pack approve-visual-assets --project ${projectArg}`,
      why: "Supplemental cutaways need the same human taste gate as primary scene images.",
      after: `When every planned raster beat is approved, run video-pack package --project ${projectArg} --force.`
    },
    {
      id: "package",
      name: "package",
      complete: packageReady,
      detail: packageDetail(packageOutputsReady, audioReady, sceneAssetsReady, imagesApproved, visualAssetsApproved),
      nextCommand: `video-pack package --project ${projectArg} --force`,
      why: "This creates the editor-ready production pack you can assemble manually in CapCut, Premiere, DaVinci, Remotion or another editor.",
      after: "Review output/README_NEXT_STEPS.md, output/06_edit_pack/asset_checklist.md and output/08_remotion/README.md."
    },
    {
      id: "generate-thumbnails",
      name: "generate-thumbnails",
      complete: await thumbnailStageComplete(path.join(output, "07_publish", "thumbnails")),
      detail: await thumbnailStageDetail(path.join(output, "07_publish", "thumbnails")),
      nextCommand: `video-pack generate-thumbnails --project ${projectArg}`,
      why: "This creates thumbnail prompt packs or thumbnail assets when the channel needs separate thumbnail work.",
      after: "Review output/07_publish/thumbnails/.",
      optional: true
    }
  ];
  const next = stages.find((stage) => !stage.complete && !stage.optional) ?? stages.find((stage) => !stage.complete);
  const completed = stages.filter((stage) => stage.complete && !stage.optional);
  const missingCore = stages.filter((stage) => !stage.complete && !stage.optional);
  const optional = stages.filter((stage) => stage.optional);

  return `Project status

Project: ${project.config.project_name}
Creator type: ${pipeline.title} (${pipeline.name})
Profile: ${project.config.profile}
Image provider: ${project.config.generation.image_provider}
Scene video provider: ${project.config.generation.scene_video_provider}
Current deliverable: ${readiness.label}
Narration file: ${readiness.audioPresent ? "present" : "absent"}
Rendered MP4: ${readiness.renderedVideoPresent ? "present" : "absent"}

Completed:
${completed.map(formatSummaryStage).join("\n") || "- none yet"}

Missing:
${missingCore.map(formatSummaryStage).join("\n") || "- none"}

Optional:
${optional.map(formatOptionalStage).join("\n") || "- none"}

Pipeline detail:
${stages.map(formatDetailStage).join("\n\n")}

Recommended next step:
${next?.nextCommand ?? "All core stages are complete. Review output/README_NEXT_STEPS.md."}
${next?.why ? `\nWhy:\n${next.why}` : ""}
${next?.after ? `\nAfter that:\n${next.after}` : ""}

Optional asset lanes:
- Scene folders: video-pack scene-assets --project ${projectArg} --force
- Production board: video-pack board --project ${projectArg}
- Upscale images: video-pack upscale-images --project ${projectArg} --provider manual
- Scene video clips: video-pack generate-scene-videos --project ${projectArg} --provider manual
- Magnific upscale/video needs MAGNIFIC_API_KEY and --provider magnific
- Higgsfield video handoff: video-pack generate-scene-videos --project ${projectArg} --provider higgsfield`;
}

function formatSummaryStage(stage: Stage): string {
  return `- ${stage.name}: ${stage.detail}`;
}

function formatDetailStage(stage: Stage): string {
  return `${stage.complete ? "[x]" : "[ ]"} ${stage.name}
    ${stage.detail}`;
}

function formatOptionalStage(stage: Stage): string {
  return `- ${stage.name}: ${stage.complete ? "ready" : stage.detail}`;
}

async function exists(root: string, ...parts: string[]): Promise<boolean> {
  return fs.pathExists(path.join(root, ...parts));
}

async function sceneDetail(output: string, current: boolean): Promise<string> {
  const scenesPath = path.join(output, "02_scenes", "scenes.json");
  if (!(await fs.pathExists(scenesPath))) {
    return "not prepared yet.";
  }

  const scenes = (await fs.readJson(scenesPath)) as unknown[];
  const detail = `${scenes.length} scenes prepared.`;
  return current ? detail : `scene plan missing or stale; rerun prepare. Last result: ${detail}`;
}

async function routeReviewDetail(output: string, current: boolean): Promise<string> {
  const reviewPath = path.join(output, "00_analysis", "route_review.json");
  if (!(await fs.pathExists(reviewPath))) {
    return "no route-specific script review generated yet.";
  }

  const review = (await fs.readJson(reviewPath)) as {
    pipeline_title?: string;
    status?: string;
    score?: number;
    rewrite_priorities?: string[];
  };
  const detail = `${review.pipeline_title ?? "Creator route"}: ${review.status ?? "needs-review"}, ${review.score ?? 0}/100, ${review.rewrite_priorities?.length ?? 0} rewrite priorities.`;
  return current ? detail : `stale script review; rerun analyze. Last result: ${detail}`;
}

async function claimReviewDetail(output: string, current: boolean): Promise<string> {
  const reviewPath = path.join(output, "00_analysis", "claim_review.json");
  if (!(await fs.pathExists(reviewPath))) {
    return "no claim review generated yet.";
  }

  const review = (await fs.readJson(reviewPath)) as {
    status?: string;
    summary?: { scenes_unmapped?: number; claims_needing_source?: number };
  };
  const detail = `${review.status ?? "needs-review"}; ${review.summary?.scenes_unmapped ?? 0} unmapped scene statements, ${review.summary?.claims_needing_source ?? 0} claim cards needing source detail.`;
  return current ? detail : `stale review; rerun claims. Last result: ${detail}`;
}

async function continuityReviewDetail(output: string, current: boolean): Promise<string> {
  const reviewPath = path.join(output, "02_scenes", "continuity_review.json");
  if (!(await fs.pathExists(reviewPath))) {
    return "no continuity review generated yet.";
  }

  const review = (await fs.readJson(reviewPath)) as {
    status?: string;
    summary?: { scenes_needing_attention?: number; average_score?: number; prompts_missing_anchors?: number };
  };
  const detail = `${review.status ?? "needs-attention"}; ${review.summary?.scenes_needing_attention ?? 0} scenes needing attention, ${review.summary?.average_score ?? 0}/100 average score, ${review.summary?.prompts_missing_anchors ?? 0} prompts missing anchors.`;
  return current ? detail : `stale review; rerun continuity. Last result: ${detail}`;
}

async function promptDetail(output: string): Promise<string> {
  const promptsPath = path.join(output, "03_prompts", "prompts.json");
  if (!(await fs.pathExists(promptsPath))) {
    return "not generated yet.";
  }

  const prompts = (await fs.readJson(promptsPath)) as unknown[];
  const thumbnailPromptsPath = path.join(output, "03_prompts", "thumbnail_prompts.json");
  const thumbnailCount = (await fs.pathExists(thumbnailPromptsPath))
    ? ((await fs.readJson(thumbnailPromptsPath)) as unknown[]).length
    : 0;
  return `${prompts.length} scene prompts and ${thumbnailCount} thumbnail prompts generated.`;
}

async function proposalDetail(output: string, scenesReady: boolean): Promise<string> {
  if (await exists(output, "00_proposal", "proposal.md")) {
    return "production route, provider readiness, cost watch and checkpoints written.";
  }

  if (scenesReady) {
    return "checkpoint bypassed by later scene outputs; run proposal any time to document the route.";
  }

  return "not written yet.";
}

async function visualEventDetail(output: string): Promise<string> {
  const visualEventsPath = path.join(output, "02_scenes", "visual_events.json");
  if (await fs.pathExists(visualEventsPath)) {
    const plans = (await fs.readJson(visualEventsPath)) as Array<{ events?: unknown[] }>;
    const eventCount = plans.reduce((sum, plan) => sum + (plan.events?.length ?? 0), 0);
    const layoutSummary = await sceneProductionLayoutDetail(output);
    return `${eventCount} visual events planned across ${plans.length} scenes${layoutSummary ? `; ${layoutSummary}` : ""}.`;
  }

  if (await exists(output, "03_prompts", "prompts.json")) {
    return "explicit planning skipped; package will auto-create visual events if missing.";
  }

  return "not planned yet.";
}

async function sceneProductionLayoutDetail(output: string): Promise<string> {
  const sceneProductionPath = path.join(output, "02_scenes", "scene_production.json");
  if (!(await fs.pathExists(sceneProductionPath))) {
    return "";
  }

  const plans = (await fs.readJson(sceneProductionPath)) as Array<{ layout_mode?: string }>;
  const counts = new Map<string, number>();
  for (const plan of plans) {
    const layout = plan.layout_mode ?? "unspecified";
    counts.set(layout, (counts.get(layout) ?? 0) + 1);
  }

  return `layouts ${[...counts.entries()].map(([layout, count]) => `${layout}: ${count}`).join(", ")}`;
}

async function approvalDetail(output: string): Promise<string> {
  const approvalsPath = path.join(output, "04_images", "approvals.json");
  if (!(await fs.pathExists(approvalsPath))) {
    return "approval sheet not created yet.";
  }

  const approvals = (await fs.readJson(approvalsPath)) as Array<{ status: string }>;
  const approved = approvals.filter((approval) => approval.status === "approved").length;
  return `${approved}/${approvals.length} images approved.`;
}

async function approvalsAllApproved(output: string): Promise<boolean> {
  const approvalsPath = path.join(output, "04_images", "approvals.json");
  if (!(await fs.pathExists(approvalsPath))) {
    return false;
  }

  const approvals = (await fs.readJson(approvalsPath)) as Array<{ status: string }>;
  return approvals.length > 0 && approvals.every((approval) => approval.status === "approved");
}

function packageDetail(
  outputsReady: boolean,
  audioReady: boolean,
  sceneAssetsReady: boolean,
  imagesApproved: boolean,
  visualAssetsApproved: boolean
): string {
  if (!outputsReady) {
    return "captions, edit assembly files, Remotion draft, copy pack, approval sheet and publishing checklists.";
  }

  if (!audioReady || !sceneAssetsReady || !imagesApproved || !visualAssetsApproved) {
    const blockers = [
      audioReady ? "" : "narration missing",
      sceneAssetsReady ? "" : "scene folders missing",
      imagesApproved ? "" : "primary images not approved",
      visualAssetsApproved ? "" : "supporting raster visuals not approved"
    ].filter(Boolean);
    return `assembly files exist, but the editor-ready pack is blocked (${blockers.join(", ")}).`;
  }

  return "captions, edit assembly files, Remotion draft, copy pack, approval sheet and publishing checklists.";
}

async function folderCountDetail(folder: string): Promise<string> {
  if (!(await fs.pathExists(folder))) {
    return "no files yet.";
  }

  const files = await fs.readdir(folder);
  const pngs = files.filter((file) => file.toLowerCase().endsWith(".png")).length;
  const promptPacks = files.filter((file) => file.toLowerCase().includes("prompts")).length;
  return `${files.length} files (${pngs} PNG, ${promptPacks} prompt pack files).`;
}

async function thumbnailStageComplete(folder: string): Promise<boolean> {
  if (!(await fs.pathExists(folder))) {
    return false;
  }

  const files = await fs.readdir(folder);
  return files.some((file) => [".png", ".jpg", ".jpeg", ".webp"].includes(path.extname(file).toLowerCase()));
}

async function thumbnailStageDetail(folder: string): Promise<string> {
  if (!(await fs.pathExists(folder))) {
    return "no files yet.";
  }

  const files = await fs.readdir(folder);
  const pngs = files.filter((file) => file.toLowerCase().endsWith(".png")).length;
  const hasPromptPack = files.includes("thumbnail_prompts.json");
  const hasReviewBoard = files.includes("review_board.md") || files.includes("review_board.html");
  const details = [`${pngs} PNG`];

  if (hasPromptPack) {
    details.push("prompt pack ready");
  }

  if (hasReviewBoard) {
    details.push("review board ready");
  }

  return `${files.length} files (${details.join(", ") || "no thumbnail image yet"}).`;
}

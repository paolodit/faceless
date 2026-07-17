import path from "node:path";
import fs from "fs-extra";
import { approvalsMarkdown, approvalSheetPath, loadOrCreateApprovals, saveApprovals } from "../lib/approvals.js";
import { generateSrt, generateVtt } from "../lib/captions.js";
import { writeClaimReview } from "../lib/claims.js";
import { writeContinuityReview } from "../lib/continuity.js";
import { createCopyPack, copyPackToMarkdown, type CopyPack } from "../lib/copy.js";
import type { ProductionPipelineName } from "../lib/constants.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { createEditManifestRows, manifestRowsToCsv } from "../lib/manifest.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { writeRemotionProject } from "../lib/remotion.js";
import { writeImageReviewBoards, writeThumbnailReviewBoards } from "../lib/review-board.js";
import { writeRouteQualityReview } from "../lib/route-quality.js";
import { syncApprovedSceneAssets, syncSceneAssetPacks } from "../lib/scene-assets.js";
import type { StockAssetDownloadSummary } from "../lib/stock-assets.js";
import { getApprovalState, getImageAssetState } from "../lib/workflow-assets.js";
import { capCutAssemblyGuide, createTimelineRows, timelineRowsToCsv, timelineRowsToFcpxml } from "../lib/timeline.js";
import { listLocalAssetReferences, writeVisualEventOutputs } from "../lib/visual-events.js";
import type { Prompt, Scene, ThumbnailPrompt, VisualEvent } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";
import { inspectProjectWorkflowFreshness } from "../lib/workflow-freshness.js";
import { getVisualEventAssetState, writeVisualEventReviewBoards } from "../lib/visual-event-assets.js";

export async function packageProjectCommand(
  projectPath: string,
  options: { force?: boolean; draft?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const scriptText = await fs.readFile(project.paths.scriptFile, "utf8");
  const freshness = await inspectProjectWorkflowFreshness(project);
  const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");
  const promptsPath = path.join(project.paths.outputFolder, "03_prompts", "prompts.json");

  if (!(await fs.pathExists(scenesPath))) {
    throw new Error(`Could not find scenes.json.

Run:
video-pack prepare --project ${projectPath}`);
  }

  if (!(await fs.pathExists(promptsPath))) {
    throw new Error(`Could not find prompts.json.

Run:
video-pack prompts --project ${projectPath}`);
  }

  if (!freshness.prompts) {
    throw new Error(`The current scene or prompt plan is stale.

Run the guided refresh before packaging:
video-pack next --project ${projectPath}`);
  }

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const thumbnailPromptsPath = path.join(project.paths.outputFolder, "03_prompts", "thumbnail_prompts.json");
  const thumbnailPrompts = (await fs.pathExists(thumbnailPromptsPath))
    ? ((await fs.readJson(thumbnailPromptsPath)) as ThumbnailPrompt[])
    : [];
  const approvals = await loadOrCreateApprovals(project.paths.outputFolder, prompts);
  const imageState = await getImageAssetState(project.paths.outputFolder, prompts);
  const approvalState = await getApprovalState(project.paths.outputFolder, prompts, imageState);
  const localAssets = await listLocalAssetReferences(project.paths.assetsFolder, project.root);
  const visualEventResult = await writeVisualEventOutputs({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    config: project.config,
    scenes,
    localAssets,
    force: false
  });
  const visualAssetState = await getVisualEventAssetState({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    scenes,
    prompts
  });

  if (!options.draft && !approvalState.ready) {
    throw new Error(`Package is blocked until every scene has a real asset and is approved.

Real assets: ${imageState.realAvailable}/${imageState.expected}
Mock placeholders: ${imageState.mockPlaceholders}
Approved: ${approvalState.approved}/${approvalState.expected}

Place missing images in output/04_images/full/, then run:
video-pack scene-assets --project ${projectPath}
video-pack approve-images --project ${projectPath}

For a structure-only assembly draft, use:
video-pack package --project ${projectPath} --draft`);
  }

  if (!options.draft && visualAssetState.expected > 0 && visualAssetState.approved !== visualAssetState.expected) {
    throw new Error(`Editor packaging is blocked until every planned raster cutaway is present and approved.

Real supporting raster assets: ${visualAssetState.realAvailable}/${visualAssetState.expected}
Mock placeholders: ${visualAssetState.mockPlaceholders}
Approved: ${visualAssetState.approved}/${visualAssetState.expected}
Code-rendered overlays: ${visualAssetState.overlays}
Code-rendered transitions: ${visualAssetState.transitions}

Review:
output/04_images/events/review_board.html

Behind the scenes:
video-pack visual-assets --project ${projectPath} --provider external
video-pack approve-visual-assets --project ${projectPath}

For a structure-only assembly draft, use:
video-pack package --project ${projectPath} --draft`);
  }

  if (!options.draft && !project.paths.audioFile) {
    throw new Error(`Editor packaging is blocked until narration is configured.

Add the final voiceover as input/voice.mp3, input/voice.wav, input/voice.m4a, or input/voice.aac. These names are detected automatically.

For another filename, update project.yml:

input:
  audio_file: "./input/voice.mp3"

Then refresh timing from the real delivery:
video-pack next --project ${projectPath}

For a structure-only assembly draft, use:
video-pack package --project ${projectPath} --draft`);
  }

  const manifestRows = createEditManifestRows(scenes, prompts);
  const timelineRows = createTimelineRows(project.root, scenes, prompts);
  const claimReviewResult =
    project.config.pipeline === "linkedin-vox-pop"
      ? await writeClaimReview({
          projectName: project.config.project_name,
          outputFolder: project.paths.outputFolder,
          scenes,
          evidence: project.evidence,
          evidenceFile: project.paths.evidenceFile ? displayPath(project.root, project.paths.evidenceFile) : undefined,
          force: true
        })
      : undefined;
  const continuityReviewResult =
    project.config.pipeline === "narrated-visual-story"
      ? await writeContinuityReview({
          projectName: project.config.project_name,
          outputFolder: project.paths.outputFolder,
          scenes,
          continuity: project.continuity,
          continuityFile: project.paths.continuityFile ? displayPath(project.root, project.paths.continuityFile) : undefined,
          prompts,
          force: true
        })
      : undefined;
  const routeReviewResult = await writeRouteQualityReview({
    projectName: project.config.project_name,
    outputFolder: project.paths.outputFolder,
    pipeline: project.config.pipeline,
    profile: project.config.profile,
    scriptText,
    characterNames: project.characterBible.characters.map((character) => character.name),
    force: false
  });
  const copyPack = createCopyPack(
    project.config.project_name,
    project.config.profile,
    scenes,
    project.channelBible,
    project.config.copy.title_options,
    project.config.pipeline,
    claimReviewResult?.review
  );
  await saveApprovals(project.paths.outputFolder, approvals);
  const sceneAssetResults = await syncSceneAssetPacks({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    scenes,
    prompts,
    force: options.force
  });
  const approvedSceneAssetResults = await syncApprovedSceneAssets({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    approvals,
    force: options.force
  });
  const reviewBoardResults = await writeImageReviewBoards({
    outputFolder: project.paths.outputFolder,
    projectName: project.config.project_name,
    projectArg: displayPath(process.cwd(), project.root) || ".",
    scenes,
    prompts,
    approvals
  });
  const thumbnailReviewBoardResults =
    thumbnailPrompts.length > 0
      ? await writeThumbnailReviewBoards({
          outputFolder: project.paths.outputFolder,
          projectName: project.config.project_name,
          prompts: thumbnailPrompts
        })
      : [];
  const captionFolder = path.join(project.paths.outputFolder, "05_captions");
  const editFolder = path.join(project.paths.outputFolder, "06_edit_pack");
  const timelineFolder = path.join(editFolder, "timelines");
  const publishFolder = path.join(project.paths.outputFolder, "07_publish");
  const stockDownloadResult = undefined;
  const refreshedVisualAssetState = await getVisualEventAssetState({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    scenes,
    prompts
  });
  const visualAssetReviewResults = await writeVisualEventReviewBoards({
    projectName: project.config.project_name,
    projectArg: displayPath(process.cwd(), project.root) || ".",
    outputFolder: project.paths.outputFolder,
    state: refreshedVisualAssetState
  });
  const remotionResult = await writeRemotionProject({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    config: project.config,
    profile: project.profile,
    scenes,
    prompts,
    plans: visualEventResult.plans,
    events: visualEventResult.events,
    audioFile: project.paths.audioFile,
    force: options.force
  });

  const results = await Promise.all([
    writeTextFile(path.join(captionFolder, "captions.srt"), generateSrt(scenes), options),
    writeTextFile(path.join(captionFolder, "captions.vtt"), generateVtt(scenes), options),
    writeTextFile(path.join(editFolder, "edit_manifest.csv"), manifestRowsToCsv(manifestRows), options),
    writeJsonFile(path.join(editFolder, "edit_manifest.json"), manifestRows, options),
    writeTextFile(path.join(editFolder, "shot_list.md"), shotList(project.config.profile, scenes, prompts), options),
    writeTextFile(
      path.join(editFolder, "asset_checklist.md"),
      assetChecklist(project.config.generation.image_provider, scenes, prompts, {
        localAssetCount: localAssets.length,
        visualEvents: visualEventResult.events,
        stockDownloadResult
      }),
      options
    ),
    writeTextFile(path.join(editFolder, "timelines", "premiere_timeline.csv"), timelineRowsToCsv(timelineRows, "premiere"), options),
    writeTextFile(path.join(timelineFolder, "davinci_timeline.csv"), timelineRowsToCsv(timelineRows, "davinci"), options),
    writeTextFile(path.join(timelineFolder, "capcut_timeline.csv"), timelineRowsToCsv(timelineRows, "capcut"), options),
    writeTextFile(path.join(timelineFolder, "timeline.fcpxml"), timelineRowsToFcpxml(timelineRows, project.config.project_name), options),
    writeTextFile(path.join(editFolder, "capcut_assembly_guide.md"), capCutAssemblyGuide(project.config.project_name), options),
    writeTextFile(approvalSheetPath(project.paths.outputFolder), approvalsMarkdown(approvals), { force: true }),
    writeTextFile(
      path.join(publishFolder, "upload_checklist.md"),
      uploadChecklist(project.config.profile, project.config.pipeline),
      options
    ),
    writeTextFile(
      path.join(publishFolder, "metadata_brief.md"),
      metadataBrief(project.config.project_name, project.config.profile, copyPack),
      options
    ),
    writeJsonFile(path.join(publishFolder, "copy_pack.json"), copyPack, options),
    writeTextFile(path.join(publishFolder, "copy_pack.md"), copyPackToMarkdown(copyPack), options),
    writeTextFile(
      path.join(project.paths.outputFolder, "run_report.md"),
      runReport(project.config.project_name, project.config.pipeline, project.config.profile, scenes, prompts, visualEventResult.events),
      options
    ),
    writeTextFile(
      path.join(project.paths.outputFolder, "README_NEXT_STEPS.md"),
      nextSteps(project.config.profile, project.config.pipeline),
      options
    )
  ]);

  const boardResults = await writeProjectBoard(project, { force: true });
  const allResults = [
    ...results,
    ...boardResults,
    ...visualEventResult.results,
    ...visualAssetReviewResults,
    ...sceneAssetResults,
    ...approvedSceneAssetResults,
    ...remotionResult.writes,
    ...reviewBoardResults,
    ...thumbnailReviewBoardResults,
    ...routeReviewResult.writes,
    ...(claimReviewResult?.writes ?? []),
    ...(continuityReviewResult?.writes ?? [])
  ];
  const created = listCreated(allResults, project.root);
  const skipped = listSkipped(allResults, project.root);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const readiness = packageReadiness(imageState, approvalState, refreshedVisualAssetState, projectArg, options.draft ?? false);

  return `Packaged edit files.

Readiness:
${readiness}

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Final review:
- output/05_captions/
- output/06_edit_pack/
- output/07_publish/
- output/06_edit_pack/timelines/capcut_timeline.csv
- output/06_edit_pack/capcut_assembly_guide.md
- output/02_scenes/scene_production.html
- output/02_scenes/scene_production.md
- output/02_scenes/visual_events.md
- output/06_edit_pack/overlay_text.csv
- output/04_images/approval_sheet.md
- output/04_images/review_board.md
- output/04_images/events/review_board.html
- output/04_images/scenes/
- output/08_remotion/
- output/BOARD.html
- output/SESSION_HANDOFF.md
- output/README_NEXT_STEPS.md`;
}

function packageReadiness(
  imageState: { expected: number; available: number; realAvailable: number; mockPlaceholders: number },
  approvalState: { approved: number },
  visualAssetState: { expected: number; available: number; realAvailable: number; mockPlaceholders: number; approved: number; overlays: number; transitions: number },
  projectArg: string,
  draft: boolean
): string {
  if (imageState.expected === 0) {
    return "- no scene image prompts found; this is a structure-only draft.";
  }

  if (draft) {
    return `- draft package: ${imageState.realAvailable}/${imageState.expected} real scene assets; ${imageState.mockPlaceholders} mock placeholders; ${approvalState.approved}/${imageState.expected} approved.
- supplemental raster cutaways: ${visualAssetState.realAvailable}/${visualAssetState.expected} real; ${visualAssetState.mockPlaceholders} mock placeholders; ${visualAssetState.approved}/${visualAssetState.expected} approved.
- code-rendered events: ${visualAssetState.overlays} overlays and ${visualAssetState.transitions} transitions.
- next review command: video-pack approve-images --project ${projectArg}`;
  }

  return `- ${approvalState.approved}/${imageState.expected} real scene assets approved.
- ${visualAssetState.approved}/${visualAssetState.expected} planned raster cutaways approved.
- ${visualAssetState.overlays} overlays and ${visualAssetState.transitions} transitions are code-rendered.
- editor-ready pack created with narration; this is not a rendered final video.`;
}

function runReport(
  projectName: string,
  pipeline: string,
  profile: string,
  scenes: Scene[],
  prompts: Prompt[],
  visualEvents: VisualEvent[]
): string {
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);
  const overlayEvents = visualEvents.filter((event) => event.type === "text" || event.type === "overlay").length;
  const stockEvents = visualEvents.filter((event) => event.source_type === "stock").length;

  return `# Run Report

Project: ${projectName}
Pipeline: ${pipeline}
Profile: ${profile}

Scenes: ${scenes.length}
Prompts: ${prompts.length}
Visual events: ${visualEvents.length}
Overlay text items: ${overlayEvents}
Stock asset queries: ${stockEvents}
Estimated duration: ${Math.round(totalDuration)}s

Generated outputs:

- captions
- edit manifest
- scene production layouts
- visual events
- overlay text plan
- stock asset queries
- asset manifest
- shot list
- asset checklist
- upload checklist
- metadata brief
- copy pack
- editor assembly files
- CapCut assembly pack
- Remotion preview/render project
- approval sheet
- image review board
- run report
- project board
- next-step README

No direct publishing or final video rendering was performed. The Remotion project is ready for local preview or render.
`;
}

function shotList(profile: string, scenes: Scene[], prompts: Prompt[]): string {
  const promptByScene = new Map(prompts.map((prompt) => [prompt.scene_number, prompt]));
  const rows = scenes
    .map((scene) => {
      const prompt = promptByScene.get(scene.scene_number);
      return `| ${scene.scene_number} | ${scene.start}-${scene.end} | ${
        prompt?.image_filename ?? ""
      } | ${motionSuggestion(profile, scene)} | ${escapeCell(scene.visual_goal)} |`;
    })
    .join("\n");

  return `# Shot List

| Scene | Time | Asset | Motion / edit note | Visual goal |
| ---: | --- | --- | --- | --- |
${rows}
`;
}

function assetChecklist(
  provider: string,
  scenes: Scene[],
  prompts: Prompt[],
  options: { localAssetCount: number; visualEvents: VisualEvent[]; stockDownloadResult?: StockAssetDownloadSummary }
): string {
  const expectedImages = prompts.map((prompt) => `- [ ] ${prompt.image_filename}`);
  const stockEvents = options.visualEvents.filter((event) => event.source_type === "stock");
  const overlayEvents = options.visualEvents.filter((event) => event.type === "text" || event.type === "overlay");
  const downloadedStock = options.stockDownloadResult?.results.filter((result) => result.status === "downloaded").length ?? 0;
  const stockDownloadLine = options.stockDownloadResult
    ? `Review ${downloadedStock} downloaded stock assets in output/06_edit_pack/stock_assets/`
    : "Optional: run video-pack stock-assets if you want automatic free stock downloads";

  return `# Asset Checklist

## Source Assets

- [ ] Voiceover imported into editor
- [ ] Script reviewed against final voiceover
- [ ] Style bible reviewed before final image generation
- [ ] Character bible checked for consistency
- [ ] Local assets reviewed in input/assets/ (${options.localAssetCount} found)

## Generated / Manual Image Assets

Provider mode: ${provider}

${expectedImages.join("\n") || "- [ ] No image prompts found"}

- [ ] Review logical scene folders in output/04_images/scenes/
- [ ] Review scene production layouts in output/02_scenes/scene_production.html
- [ ] Keep output/02_scenes/scene_production.md open if you prefer markdown notes
- [ ] Use approved.png when present, upscaled/upscaled.png if you ran upscaling, or video/clip.mp4 if you generated scene clips

## Visual Event Assets

- [ ] Review output/02_scenes/visual_events.md
- [ ] Use output/02_scenes/scene_production.html to see whether each scene is fast-cut, additive-slide, voxpop, montage or single-image
- [ ] Review output/06_edit_pack/visual_events.csv
- [ ] Build or ignore ${overlayEvents.length} planned overlay text items from output/06_edit_pack/overlay_text.csv
- [ ] Source or replace ${stockEvents.length} stock cutaway suggestions from output/06_edit_pack/stock_asset_queries.csv
- [ ] ${stockDownloadLine}
- [ ] Add credits in output/06_edit_pack/stock_credits.md for any stock assets used

## Edit Assets

- [ ] Captions imported from output/05_captions/captions.srt
- [ ] Edit manifest opened from output/06_edit_pack/edit_manifest.csv
- [ ] Shot list reviewed before timeline assembly
- [ ] Final export watched once with sound
- [ ] Final export watched once muted
- [ ] Optional Remotion draft reviewed in output/08_remotion/

Expected scenes: ${scenes.length}
Expected images: ${prompts.length}
Planned visual events: ${options.visualEvents.length}
`;
}

function uploadChecklist(profile: string, creatorType: ProductionPipelineName): string {
  const shared = `- [ ] Final video watched all the way through
- [ ] Captions are readable on mobile
- [ ] First frame communicates the idea without context
- [ ] No accidental private info appears on screen
- [ ] Filename includes project name or working title`;
  const routeChecks = creatorUploadChecks(creatorType);

  if (profile === "linkedin-video") {
    return `# Upload Checklist

${shared}
${routeChecks}
- [ ] Written post has a strong first line
- [ ] Video works without sound
- [ ] Export is 4:5 or square if the post depends on feed presence
- [ ] Call to action feels useful rather than salesy
`;
  }

  if (profile === "youtube-long") {
    return `# Upload Checklist

${shared}
${routeChecks}
- [ ] Title and thumbnail promise the same idea
- [ ] Description includes links or credits
- [ ] Chapters are added if the video has clear sections
- [ ] End screen or pinned comment plan is ready
`;
  }

  return `# Upload Checklist

${shared}
${routeChecks}
- [ ] Export is 1080x1920
- [ ] Hook is clear in the first 2 seconds
- [ ] Thumbnail or first frame is legible
- [ ] Caption text does not cover the subject
- [ ] Manual platform upload settings checked before posting
`;
}

function metadataBrief(projectName: string, profile: string, copyPack: CopyPack): string {
  const post = copyPack.platform_posts[profile === "linkedin-video" ? "linkedin-video" : "tiktok"] ?? "";

  return `# Metadata Brief

Project: ${projectName}
Profile: ${profile}
Creator type: ${copyPack.creator_type}

## Publishing Angle

${copyPack.publishing_angle}

## Core Promise

${copyPack.core_promise || "(Add a stronger opening line before publishing.)"}

## Payoff / Ending

${copyPack.payoff || "(No ending scene found.)"}

## Title Options

${copyPack.title_options.map((title) => `- ${title}`).join("\n")}

## Post Caption Starter

${post || "(Generate copy after at least one scene exists.)"}

## Manual Review Notes

- ${copyPack.review_checks.join("\n- ")}
`;
}

function motionSuggestion(profile: string, scene: Scene): string {
  if (profile === "linkedin-video") {
    return scene.duration_seconds > 6 ? "subtle slow push; keep professional" : "static or gentle pan";
  }

  if (profile === "youtube-long") {
    return scene.duration_seconds > 8 ? "slow zoom or section hold" : "gentle push-in";
  }

  return scene.duration_seconds <= 3 ? "quick cut or snap zoom" : "slow push-in; cut on narration";
}

function shorten(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 3).trim()}...`;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function creatorUploadChecks(creatorType: ProductionPipelineName): string {
  if (creatorType === "linkedin-vox-pop") {
    return `- [ ] output/00_analysis/route_review.html has no unresolved structural warnings
- [ ] Every claim is supported by a source, example or direct experience
- [ ] output/00_analysis/claim_review.md has no unresolved publishing warnings
- [ ] Written post adds context instead of repeating the opening frame`;
  }

  if (creatorType === "narrated-visual-story") {
    return `- [ ] output/00_analysis/route_review.html has no unresolved structural warnings
- [ ] Thumbnail or first frame belongs recognisably to the story world
- [ ] output/02_scenes/continuity_review.html has no unresolved planning or prompt-anchor warnings
- [ ] Character and place details stay consistent through the final cut`;
  }

  return `- [ ] output/00_analysis/route_review.html has no unresolved structural warnings
- [ ] Title, hook and final takeaway describe the same useful idea
- [ ] On-screen overlays make the explanation clearer, not denser`;
}

function nextSteps(profile: string, creatorType: ProductionPipelineName): string {
  if (creatorType === "linkedin-vox-pop") {
    return `# Next Steps

1. Open output/07_publish/copy_pack.md and rewrite the LinkedIn post in your own voice.
2. Resolve every warning in output/00_analysis/claim_review.md before the edit goes live.
3. Review output/02_scenes/scene_production.html for speaker framing, quote cards and overlay layers.
4. Review output/06_edit_pack/overlay_text.csv and output/06_edit_pack/stock_asset_queries.csv.
5. Assemble in your editor with output/06_edit_pack/edit_manifest.csv and output/05_captions/captions.srt.
6. Keep captions readable and make sure the video works without sound.
7. Export 4:5 or square if the post depends on feed presence.
8. Optional: preview or render output/08_remotion/.
9. Upload manually to LinkedIn with the selected written post.
`;
  }

  if (creatorType === "narrated-visual-story") {
    return `# Next Steps

1. Review output/04_images/review_board.html for character, place and lighting continuity.
2. Resolve any planning or prompt-anchor warning in output/02_scenes/continuity_review.html.
3. Choose the strongest first and final frames before opening the editor.
4. Review output/02_scenes/scene_production.html for continuity groups and visual grammar.
5. Assemble in your editor with output/06_edit_pack/edit_manifest.csv and output/05_captions/captions.srt.
6. Use visual events, overlays and stock cutaways only where they improve the story beat.
7. Open output/07_publish/copy_pack.md and choose a title that matches the story's promise.
8. Export at ${profile === "youtube-long" ? "1920x1080" : "1080x1920"}.
9. Optional: preview or render output/08_remotion/.
10. Use output/07_publish/upload_checklist.md before publishing.
`;
  }

  return `# Next Steps

1. Review output/04_images/review_board.html for art direction and readability.
2. Review output/02_scenes/visual_events.md and output/06_edit_pack/overlay_text.csv: every visual beat should clarify the point.
3. Assemble in your editor with output/06_edit_pack/edit_manifest.csv and output/05_captions/captions.srt.
4. Use stock cutaways only where they add useful context or proof.
5. Open output/07_publish/copy_pack.md and pick a title that matches the first frame and final takeaway.
6. Export at ${profile === "youtube-long" ? "1920x1080" : "1080x1920"}.
7. Optional: preview or render output/08_remotion/.
8. Use output/07_publish/upload_checklist.md before publishing.
`;
}

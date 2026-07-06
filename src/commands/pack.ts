import path from "node:path";
import fs from "fs-extra";
import { approvalsMarkdown, approvalSheetPath, loadOrCreateApprovals, saveApprovals } from "../lib/approvals.js";
import { generateSrt, generateVtt } from "../lib/captions.js";
import { createCopyPack, copyPackToMarkdown } from "../lib/copy.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { createEditManifestRows, manifestRowsToCsv } from "../lib/manifest.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { writeRemotionProject } from "../lib/remotion.js";
import { writeImageReviewBoards, writeThumbnailReviewBoards } from "../lib/review-board.js";
import { syncApprovedSceneAssets, syncSceneAssetPacks } from "../lib/scene-assets.js";
import { downloadStockAssets, type StockAssetDownloadSummary } from "../lib/stock-assets.js";
import { capCutAssemblyGuide, createTimelineRows, timelineRowsToCsv, timelineRowsToFcpxml } from "../lib/timeline.js";
import { listLocalAssetReferences, writeVisualEventOutputs } from "../lib/visual-events.js";
import type { Prompt, Scene, ThumbnailPrompt, VisualEvent } from "../lib/schemas.js";
import { loadValidProject } from "../lib/validation.js";

export async function packageProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
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

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const prompts = (await fs.readJson(promptsPath)) as Prompt[];
  const thumbnailPromptsPath = path.join(project.paths.outputFolder, "03_prompts", "thumbnail_prompts.json");
  const thumbnailPrompts = (await fs.pathExists(thumbnailPromptsPath))
    ? ((await fs.readJson(thumbnailPromptsPath)) as ThumbnailPrompt[])
    : [];
  const manifestRows = createEditManifestRows(scenes, prompts);
  const timelineRows = createTimelineRows(project.root, scenes, prompts);
  const copyPack = createCopyPack(
    project.config.project_name,
    project.config.profile,
    scenes,
    project.channelBible,
    project.config.copy.title_options
  );
  const approvals = await loadOrCreateApprovals(project.paths.outputFolder, prompts);
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
  const localAssets = await listLocalAssetReferences(project.paths.assetsFolder, project.root);
  const visualEventResult = await writeVisualEventOutputs({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    config: project.config,
    scenes,
    localAssets,
    force: options.force
  });
  const stockDownloadResult = project.config.stock_assets.enabled
    ? await downloadStockAssets({
        projectRoot: project.root,
        outputFolder: project.paths.outputFolder,
        config: project.config,
        force: options.force
      })
    : undefined;
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
    writeTextFile(path.join(publishFolder, "upload_checklist.md"), uploadChecklist(project.config.profile), options),
    writeTextFile(
      path.join(publishFolder, "metadata_brief.md"),
      metadataBrief(project.config.project_name, project.config.profile, scenes),
      options
    ),
    writeJsonFile(path.join(publishFolder, "copy_pack.json"), copyPack, options),
    writeTextFile(path.join(publishFolder, "copy_pack.md"), copyPackToMarkdown(copyPack), options),
    writeTextFile(
      path.join(project.paths.outputFolder, "run_report.md"),
      runReport(project.config.project_name, project.config.pipeline, project.config.profile, scenes, prompts, visualEventResult.events),
      options
    ),
    writeTextFile(path.join(project.paths.outputFolder, "README_NEXT_STEPS.md"), nextSteps(project.config.profile), options)
  ]);

  const boardResults = await writeProjectBoard(project, { force: true });
  const allResults = [
    ...results,
    ...boardResults,
    ...visualEventResult.results,
    ...sceneAssetResults,
    ...approvedSceneAssetResults,
    ...(stockDownloadResult?.writes ?? []),
    ...remotionResult.writes,
    ...reviewBoardResults,
    ...thumbnailReviewBoardResults
  ];
  const created = listCreated(allResults, project.root);
  const skipped = listSkipped(allResults, project.root);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const readiness = packageReadiness(prompts.length, approvals, projectArg);

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
- output/04_images/scenes/
- output/08_remotion/
- output/BOARD.html
- output/README_NEXT_STEPS.md`;
}

function packageReadiness(expectedImages: number, approvals: Array<{ status: string }>, projectArg: string): string {
  const approved = approvals.filter((approval) => approval.status === "approved").length;

  if (expectedImages === 0) {
    return "- no scene image prompts found; this is a structure-only draft.";
  }

  if (approved < expectedImages) {
    return `- ${approved}/${expectedImages} images approved. This is an editable draft until image review is complete.
- next review command: video-pack approve-images --project ${projectArg}`;
  }

  return `- ${approved}/${expectedImages} images approved.
- ready for editor assembly.`;
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
- timeline exports
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
- [ ] Use output/02_scenes/scene_production.html to see whether each scene is fast-cut, additive-slide, voxpop, screen-demo, montage or single-image
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

function uploadChecklist(profile: string): string {
  const shared = `- [ ] Final video watched all the way through
- [ ] Captions are readable on mobile
- [ ] First frame communicates the idea without context
- [ ] No accidental private info appears on screen
- [ ] Filename includes project name or working title`;

  if (profile === "linkedin-video") {
    return `# Upload Checklist

${shared}
- [ ] Written post has a strong first line
- [ ] Video works without sound
- [ ] Export is 4:5 or square if the post depends on feed presence
- [ ] Call to action feels useful rather than salesy
`;
  }

  if (profile === "youtube-long") {
    return `# Upload Checklist

${shared}
- [ ] Title and thumbnail promise the same idea
- [ ] Description includes links or credits
- [ ] Chapters are added if the video has clear sections
- [ ] End screen or pinned comment plan is ready
`;
  }

  return `# Upload Checklist

${shared}
- [ ] Export is 1080x1920
- [ ] Hook is clear in the first 2 seconds
- [ ] Thumbnail or first frame is legible
- [ ] Caption text does not cover the subject
- [ ] Manual platform upload settings checked before posting
`;
}

function metadataBrief(projectName: string, profile: string, scenes: Scene[]): string {
  const opening = scenes[0]?.transcript ?? "";
  const ending = scenes.at(-1)?.transcript ?? "";
  const titleSeed = titleFromOpening(projectName, opening);

  return `# Metadata Brief

Project: ${projectName}
Profile: ${profile}

## Core Promise

${opening || "(Add a stronger opening line before publishing.)"}

## Payoff / Ending

${ending || "(No ending scene found.)"}

## Title Seeds

- ${titleSeed}
- ${projectName}: ${shorten(opening, 58)}
- ${shorten(opening, 70)}

## Post Caption Starter

${captionStarter(profile, opening)}

## Manual Review Notes

- Tighten any title that overpromises the actual video.
- Keep platform captions shorter than the script.
- Check that the first frame and written caption do not duplicate each other awkwardly.
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

function titleFromOpening(projectName: string, opening: string): string {
  if (!opening.trim()) {
    return projectName;
  }

  const cleaned = opening.replace(/[.!?]+$/g, "");
  return shorten(cleaned, 65);
}

function captionStarter(profile: string, opening: string): string {
  if (profile === "linkedin-video") {
    return `${opening}\n\nA useful reminder before the next project decision.`;
  }

  if (profile === "youtube-long") {
    return `${opening}\n\nFull breakdown in the video.`;
  }

  return `${opening}\n\nWatch for the turn.`;
}

function shorten(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 3).trim()}...`;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function nextSteps(profile: string): string {
  if (profile === "linkedin-video") {
    return `# Next Steps

1. Keep captions clean and readable.
2. Review output/02_scenes/scene_production.html for layout mode, base frame and layering notes.
3. Review output/06_edit_pack/overlay_text.csv for the on-screen text build.
4. Review output/06_edit_pack/stock_asset_queries.csv if you want supporting cutaways.
5. Consider exporting as 4:5 or square depending on your post style.
6. Add a strong first-line written post above the video.
7. Make sure the video is useful without sound.
8. Optional: preview or render the Remotion draft in output/08_remotion/.
9. Upload manually to LinkedIn.
`;
  }

  if (profile === "youtube-long") {
    return `# Next Steps

1. Review your scene assets in output/04_images/scenes/
2. Open Premiere Pro, DaVinci Resolve, CapCut or your editor of choice.
3. Import your voiceover.
4. Import images in scene order.
5. Review output/02_scenes/scene_production.html for layout mode, base frame and layering notes.
6. Review output/02_scenes/visual_events.md for extra visual beats.
7. Use output/06_edit_pack/overlay_text.csv and stock_asset_queries.csv only where they improve the edit.
8. Use output/06_edit_pack/edit_manifest.csv to align each image to its timestamp.
9. Import output/05_captions/captions.srt if captions are part of this edit.
10. Export at 1920x1080.
11. Optional: preview or render the Remotion draft in output/08_remotion/.
12. Review chapter pacing and narrative progression before upload.
13. Use output/07_publish/upload_checklist.md before publishing.
`;
  }

  return `# Next Steps

1. Review your scene assets in output/04_images/scenes/
2. Open CapCut, Premiere Pro or DaVinci Resolve.
3. Import your voiceover.
4. Import images in scene order.
5. Review output/02_scenes/scene_production.html for layout mode, base frame and layering notes.
6. Review output/02_scenes/visual_events.md for extra visual beats.
7. Use output/06_edit_pack/overlay_text.csv and stock_asset_queries.csv only where they improve the edit.
8. Use output/06_edit_pack/edit_manifest.csv to align each image to its timestamp.
9. Import output/05_captions/captions.srt.
10. Export at 1080x1920 for TikTok or YouTube Shorts.
11. Optional: preview or render the Remotion draft in output/08_remotion/.
12. Watch the first 2 seconds carefully. The hook must be clear immediately.
13. Upload manually and check thumbnail or first-frame appearance.
14. Use output/07_publish/upload_checklist.md before publishing.
`;
}

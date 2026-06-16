import path from "node:path";
import fs from "fs-extra";
import { approvalsMarkdown, approvalSheetPath, loadOrCreateApprovals, saveApprovals } from "../lib/approvals.js";
import { generateSrt, generateVtt } from "../lib/captions.js";
import { createCopyPack, copyPackToMarkdown } from "../lib/copy.js";
import { displayPath, listCreated, listSkipped, writeJsonFile, writeTextFile } from "../lib/files.js";
import { createEditManifestRows, manifestRowsToCsv } from "../lib/manifest.js";
import { writeImageReviewBoards, writeThumbnailReviewBoards } from "../lib/review-board.js";
import { createTimelineRows, timelineRowsToCsv, timelineRowsToFcpxml } from "../lib/timeline.js";
import type { Prompt, Scene, ThumbnailPrompt } from "../lib/schemas.js";
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

  const results = await Promise.all([
    writeTextFile(path.join(captionFolder, "captions.srt"), generateSrt(scenes), options),
    writeTextFile(path.join(captionFolder, "captions.vtt"), generateVtt(scenes), options),
    writeTextFile(path.join(editFolder, "edit_manifest.csv"), manifestRowsToCsv(manifestRows), options),
    writeJsonFile(path.join(editFolder, "edit_manifest.json"), manifestRows, options),
    writeTextFile(path.join(editFolder, "shot_list.md"), shotList(project.config.profile, scenes, prompts), options),
    writeTextFile(
      path.join(editFolder, "asset_checklist.md"),
      assetChecklist(project.config.generation.image_provider, scenes, prompts),
      options
    ),
    writeTextFile(path.join(editFolder, "timelines", "premiere_timeline.csv"), timelineRowsToCsv(timelineRows, "premiere"), options),
    writeTextFile(path.join(timelineFolder, "davinci_timeline.csv"), timelineRowsToCsv(timelineRows, "davinci"), options),
    writeTextFile(path.join(timelineFolder, "timeline.fcpxml"), timelineRowsToFcpxml(timelineRows, project.config.project_name), options),
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
      runReport(project.config.project_name, project.config.profile, scenes, prompts),
      options
    ),
    writeTextFile(path.join(project.paths.outputFolder, "README_NEXT_STEPS.md"), nextSteps(project.config.profile), options)
  ]);

  const allResults = [...results, ...reviewBoardResults, ...thumbnailReviewBoardResults];
  const created = listCreated(allResults, project.root);
  const skipped = listSkipped(allResults, project.root);

  return `Packaged edit files.

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Final review:
- output/05_captions/
- output/06_edit_pack/
- output/07_publish/
- output/04_images/approval_sheet.md
- output/04_images/review_board.md
- output/README_NEXT_STEPS.md`;
}

function runReport(projectName: string, profile: string, scenes: Scene[], prompts: Prompt[]): string {
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);

  return `# Run Report

Project: ${projectName}
Profile: ${profile}

Scenes: ${scenes.length}
Prompts: ${prompts.length}
Estimated duration: ${Math.round(totalDuration)}s

Generated outputs:

- captions
- edit manifest
- shot list
- asset checklist
- upload checklist
- metadata brief
- copy pack
- timeline exports
- approval sheet
- image review board
- run report
- next-step README

No direct publishing or final video rendering was performed.
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

function assetChecklist(provider: string, scenes: Scene[], prompts: Prompt[]): string {
  const expectedImages = prompts.map((prompt) => `- [ ] ${prompt.image_filename}`);

  return `# Asset Checklist

## Source Assets

- [ ] Voiceover imported into editor
- [ ] Script reviewed against final voiceover
- [ ] Style bible reviewed before final image generation
- [ ] Character bible checked for consistency

## Generated / Manual Image Assets

Provider mode: ${provider}

${expectedImages.join("\n") || "- [ ] No image prompts found"}

## Edit Assets

- [ ] Captions imported from output/05_captions/captions.srt
- [ ] Edit manifest opened from output/06_edit_pack/edit_manifest.csv
- [ ] Shot list reviewed before timeline assembly
- [ ] Final export watched once with sound
- [ ] Final export watched once muted

Expected scenes: ${scenes.length}
Expected images: ${prompts.length}
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
2. Consider exporting as 4:5 or square depending on your post style.
3. Add a strong first-line written post above the video.
4. Make sure the video is useful without sound.
5. Upload manually to LinkedIn.
`;
  }

  if (profile === "youtube-long") {
    return `# Next Steps

1. Review your images in output/04_images/full/
2. Open Premiere Pro, DaVinci Resolve, CapCut or your editor of choice.
3. Import your voiceover.
4. Import images in scene order.
5. Use output/06_edit_pack/edit_manifest.csv to align each image to its timestamp.
6. Import output/05_captions/captions.srt if captions are part of this edit.
7. Export at 1920x1080.
8. Review chapter pacing and narrative progression before upload.
9. Use output/07_publish/upload_checklist.md before publishing.
`;
  }

  return `# Next Steps

1. Review your images in output/04_images/full/
2. Open CapCut, Premiere Pro or DaVinci Resolve.
3. Import your voiceover.
4. Import images in scene order.
5. Use output/06_edit_pack/edit_manifest.csv to align each image to its timestamp.
6. Import output/05_captions/captions.srt.
7. Export at 1080x1920 for TikTok or YouTube Shorts.
8. Watch the first 2 seconds carefully. The hook must be clear immediately.
9. Upload manually and check thumbnail or first-frame appearance.
10. Use output/07_publish/upload_checklist.md before publishing.
`;
}

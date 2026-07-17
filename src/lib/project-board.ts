import path from "node:path";
import fs from "fs-extra";
import { displayPath, writeTextFile, type WriteResult } from "./files.js";
import { imageFileToDataUri } from "./media.js";
import { getProductionPipeline } from "./pipelines.js";
import { inspectProductionReadiness, type ProductionReadiness } from "./production-readiness.js";
import { isClaimReviewCurrent } from "./claims.js";
import { isContinuityReviewCurrent } from "./continuity.js";
import { readDecisionLog } from "./decision-log.js";
import { isRouteQualityReviewCurrent } from "./route-quality.js";
import type { ContinuityFile, EvidenceFile, ImageApproval, ProjectConfig, Prompt, Scene } from "./schemas.js";
import type { LoadedProject } from "./validation.js";
import {
  inspectProjectWorkflowFreshness,
  type ProjectWorkflowFreshness
} from "./workflow-freshness.js";
import {
  getApprovalState,
  getImageAssetState,
  getSceneAssetFolderState,
  imageAssetDetail,
  readScenePrompts,
  sceneAssetFolderDetail
} from "./workflow-assets.js";
import { getVisualEventAssetState } from "./visual-event-assets.js";

interface BoardStage {
  label: string;
  ready: boolean;
  detail: string;
  command: string;
  action: string;
  review?: string;
}

interface BoardScene {
  sceneNumber: number;
  transcript: string;
  visualGoal: string;
  layoutMode: string;
  continuityGroup: string;
  approvalStatus: string;
  imagePath?: string;
  imageDataUri?: string;
  upscaledPath?: string;
  clipPath?: string;
}

export interface BoardData {
  projectName: string;
  projectArg: string;
  commandWorkingDirectory: string;
  pipelineTitle: string;
  pipelineName: string;
  profile: string;
  aspectRatio: string;
  imageProvider: string;
  sceneVideoProvider: string;
  nextAction: string;
  nextCommand: string;
  reviewFiles: string[];
  stages: BoardStage[];
  scenes: BoardScene[];
  decisionCount: number;
  readiness: ProductionReadiness;
}

export async function writeProjectBoard(
  project: LoadedProject,
  options: { force?: boolean } = { force: true }
): Promise<WriteResult[]> {
  const data = await createProjectBoardData(project);

  return Promise.all([
    writeTextFile(path.join(project.paths.outputFolder, "BOARD.md"), boardMarkdown(data), options),
    writeTextFile(path.join(project.paths.outputFolder, "BOARD.html"), boardHtml(data), options),
    writeTextFile(path.join(project.paths.outputFolder, "PROGRESS.html"), progressHtml(data), options),
    writeTextFile(path.join(project.paths.outputFolder, "DECISION.html"), decisionHtml(data), options),
    writeTextFile(path.join(project.paths.outputFolder, "NEXT.html"), nextHtml(data), options),
    writeTextFile(path.join(project.paths.outputFolder, "ARTIFACTS.md"), artifactIndexMarkdown(data), options),
    writeTextFile(path.join(project.paths.outputFolder, "SESSION_HANDOFF.md"), sessionHandoffMarkdown(data), options)
  ]);
}

export async function createProjectBoardData(project: LoadedProject): Promise<BoardData> {
  const pipeline = getProductionPipeline(project.config.pipeline);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const output = project.paths.outputFolder;
  const scriptText = await fs.readFile(project.paths.scriptFile, "utf8");
  const freshness = await inspectProjectWorkflowFreshness(project);
  const stages = await boardStages(
    output,
    project.root,
    project.paths.audioFile,
    projectArg,
    project.config,
    scriptText,
    project.characterBible.characters.map((character) => character.name),
    freshness,
    project.config.pipeline === "linkedin-vox-pop",
    project.evidence,
    project.config.pipeline === "narrated-visual-story",
    project.continuity
  );
  const nextStage = stages.find((stage) => !stage.ready);
  const decisions = await readDecisionLog(output);
  const readiness = await inspectProductionReadiness(project);

  return {
    projectName: project.config.project_name,
    projectArg,
    commandWorkingDirectory: process.cwd().replace(/\\/g, "/"),
    pipelineTitle: pipeline.title,
    pipelineName: pipeline.name,
    profile: project.config.profile,
    aspectRatio: project.config.aspect_ratio,
    imageProvider: project.config.generation.image_provider,
    sceneVideoProvider: project.config.generation.scene_video_provider,
    nextAction: nextStage?.action ?? finalNextAction(readiness),
    nextCommand: nextStage?.command ?? `video-pack status --project ${projectArg}`,
    reviewFiles: await boardReviewFiles(output),
    stages,
    scenes: await boardScenes(output),
    decisionCount: decisions.length,
    readiness
  };
}

async function boardReviewFiles(output: string): Promise<string[]> {
  const candidates = [
    "00_analysis/route_review.html",
    "00_proposal/proposal.md",
    "00_analysis/claim_review.md",
    "02_scenes/continuity_review.html",
    "02_scenes/scene_production.html",
    "02_scenes/scene_production.md",
    "02_scenes/visual_events.md",
    "03_prompts/prompts.md",
    "04_images/review_board.html",
    "04_images/events/review_board.html",
    "04_images/scenes/",
    "07_publish/thumbnails/review_board.html",
    "README_NEXT_STEPS.md"
  ];
  const existing: string[] = [];

  for (const candidate of candidates) {
    if (await fs.pathExists(path.join(output, candidate))) {
      existing.push(candidate);
    }
  }

  return existing;
}

async function boardStages(
  output: string,
  projectRoot: string,
  audioFile: string | undefined,
  projectArg: string,
  config: ProjectConfig,
  scriptText: string,
  characterNames: string[],
  freshness: ProjectWorkflowFreshness,
  requiresClaims: boolean,
  evidence?: EvidenceFile,
  requiresContinuity = false,
  continuity?: ContinuityFile
): Promise<BoardStage[]> {
  const prompts = await readScenePrompts(output);
  const imageAssets = await getImageAssetState(output, prompts);
  const approvalState = await getApprovalState(output, prompts, imageAssets);
  const sceneAssetFolders = await getSceneAssetFolderState(output, prompts);
  const readiness = await getVisualEventAssetState({ projectRoot, outputFolder: output });
  const audioReady = Boolean(audioFile && (await fs.pathExists(audioFile)));
  const packageReady = freshness.package && audioReady && (readiness.expected === 0 || readiness.approved === readiness.expected);
  const imagesReady = imageAssets.expected > 0 && imageAssets.realAvailable === imageAssets.expected;
  const imageCommand = imageAssets.promptPackReady && !imagesReady
    ? `video-pack next --project ${projectArg}`
    : `video-pack generate-images --project ${projectArg}`;
  const claimsReady = requiresClaims && (await isClaimReviewCurrent({ outputFolder: output, evidence }));
  const continuityReady = requiresContinuity && (await isContinuityReviewCurrent({ outputFolder: output, continuity }));
  const routeReviewReady = await isRouteQualityReviewCurrent({
    outputFolder: output,
    config,
    scriptText,
    characterNames
  });

  return [
    stage(
      "Analyze",
      (await exists(output, "00_analysis", "content_analysis.md")) && routeReviewReady,
      routeReviewReady ? "fresh route-specific script, hook and pacing review" : "route review missing or stale",
      `video-pack analyze --project ${projectArg} --force`,
      "Review the script promise, hook and pacing before planning visuals.",
      "output/00_analysis/route_review.html"
    ),
    stage("Plan", freshness.plan, "scene count and cost estimate", `video-pack plan --project ${projectArg} --force`, "Confirm the likely scene count and cost range."),
    stage(
      "Proposal",
      freshness.proposal || freshness.scenes,
      freshness.scenes && !freshness.proposal
        ? "checkpoint bypassed by later scene outputs"
        : "production route and provider readiness",
      `video-pack proposal --project ${projectArg} --force`,
      "Choose the production route before asset-heavy work.",
      "output/00_proposal/proposal.md"
    ),
    stage(
      "Narration",
      audioReady,
      audioReady ? "final voiceover configured" : "final voiceover still needed before timed scenes",
      `video-pack next --project ${projectArg}`,
      "Record or create the final voiceover and save it as input/voice.mp3, voice.wav, voice.m4a, or voice.aac before scene timing."
    ),
    stage("Scenes", freshness.scenes, "timed scene plan", `video-pack prepare --project ${projectArg} --force`, "Review how the narration has been divided into timed scenes.", "output/02_scenes/scenes.md"),
    ...(requiresClaims
      ? [
          stage(
            "Claims",
            claimsReady,
            claimsReady ? "source and support mapping for LinkedIn statements" : "claim review needs refreshing",
            `video-pack claims --project ${projectArg} --force`,
            "Check that factual claims are supported or clearly framed as opinion.",
            "output/00_analysis/claim_review.md"
          )
        ]
      : []),
    ...(requiresContinuity
      ? [
          stage(
            "Continuity",
            continuityReady,
            continuityReady ? "story-world and prompt-anchor review" : "continuity review needs refreshing",
            `video-pack continuity --project ${projectArg} --force`,
            "Confirm the recurring world, people and places before prompt generation.",
            "output/02_scenes/continuity_review.html"
          )
        ]
      : []),
    stage(
      "Visual Events",
      freshness.visualEvents || freshness.prompts,
      "overlay, cutaway and pacing beats",
      `video-pack visual-events --project ${projectArg} --force`,
      "Review the proposed layouts, cutaways, overlays and pacing. Correct generic or contradictory beats now.",
      "output/02_scenes/scene_production.html"
    ),
    stage("Prompts", freshness.prompts, "scene and thumbnail prompts", `video-pack prompts --project ${projectArg} --force`, "Review the art direction and prompts before generating anything externally.", "output/03_prompts/prompts.md"),
    stage("Layout Preview", freshness.preview, "no-cost scene framing and review-board check", `video-pack preview --project ${projectArg} --force`, "Check framing and review flow with placeholders, then choose the final art direction."),
    stage("Real Assets", imagesReady, imageAssetDetail(imageAssets), imageCommand, "Create or place one primary visual for every scene."),
    stage(
      "Scene Assets",
      sceneAssetFolders.ready,
      sceneAssetFolderDetail(sceneAssetFolders),
      `video-pack scene-assets --project ${projectArg} --force`,
      "Organize each scene into a stable folder for review and editing."
    ),
    stage("Primary Approval", approvalState.ready, `${approvalState.approved}/${approvalState.expected} primary scene assets approved`, `video-pack approve-images --project ${projectArg}`, "Review every primary scene image and record approval or regeneration notes.", "output/04_images/review_board.html"),
    stage("Supporting Visuals", freshness.visualEvents && (readiness.expected === 0 || readiness.realAvailable === readiness.expected), `${readiness.realAvailable}/${readiness.expected} real raster cutaways present; ${readiness.mockPlaceholders} mock placeholders; ${readiness.overlays} overlays and ${readiness.transitions} transitions are code-rendered`, `video-pack visual-assets --project ${projectArg} --provider external`, readiness.expected === 0 ? "No extra raster cutaways are planned." : "Create or source the planned cutaways that sit between primary scene frames.", "output/04_images/events/review_board.html"),
    stage("Supporting Approval", freshness.visualEvents && (readiness.expected === 0 || readiness.approved === readiness.expected), `${readiness.approved}/${readiness.expected} raster cutaways approved`, `video-pack approve-visual-assets --project ${projectArg}`, readiness.expected === 0 ? "No supporting visual approval is needed." : "Review each supplemental cutaway before it enters the edit.", "output/04_images/events/review_board.html"),
    stage("Editor Pack", packageReady && approvalState.ready, "narration, captions, edit assembly files, publishing drafts and Remotion project", `video-pack package --project ${projectArg} --force`, "Build the editor pack. This does not render a final video.", "output/README_NEXT_STEPS.md")
  ];
}

function stage(label: string, ready: boolean, detail: string, command: string, action: string, review?: string): BoardStage {
  return { label, ready, detail, command, action, review };
}

async function boardScenes(output: string): Promise<BoardScene[]> {
  const scenesPath = path.join(output, "02_scenes", "scenes.json");
  if (!(await fs.pathExists(scenesPath))) {
    return [];
  }

  const scenes = (await fs.readJson(scenesPath)) as Scene[];
  const prompts = await readPrompts(output);
  const approvals = await readApprovals(output);
  const promptByScene = new Map(prompts.map((prompt) => [prompt.scene_number, prompt]));
  const approvalByScene = new Map(approvals.map((approval) => [approval.scene_number, approval]));

  const items: BoardScene[] = [];
  for (const scene of scenes) {
    const prompt = promptByScene.get(scene.scene_number);
    const approval = approvalByScene.get(scene.scene_number);
    const imagePath = await bestRelativeImagePath(output, scene.scene_number, prompt);
    items.push({
      sceneNumber: scene.scene_number,
      transcript: scene.transcript,
      visualGoal: scene.visual_goal,
      layoutMode: prompt?.scene_production?.layout_mode ?? "unspecified",
      continuityGroup: prompt?.scene_production?.continuity_group ?? "none",
      approvalStatus: approval?.status ?? "not reviewed",
      imagePath,
      imageDataUri: await imageFileToDataUri(imagePath ? path.join(output, imagePath) : undefined),
      upscaledPath: await optionalScenePath(output, scene.scene_number, "upscaled", "upscaled.png"),
      clipPath: await optionalScenePath(output, scene.scene_number, "video", "clip.mp4")
    });
  }

  return items;
}

async function readPrompts(output: string): Promise<Prompt[]> {
  const promptsPath = path.join(output, "03_prompts", "prompts.json");
  if (!(await fs.pathExists(promptsPath))) {
    return [];
  }

  return (await fs.readJson(promptsPath)) as Prompt[];
}

async function readApprovals(output: string): Promise<ImageApproval[]> {
  const approvalsPath = path.join(output, "04_images", "approvals.json");
  if (!(await fs.pathExists(approvalsPath))) {
    return [];
  }

  return (await fs.readJson(approvalsPath)) as ImageApproval[];
}

async function bestRelativeImagePath(
  output: string,
  sceneNumber: number,
  prompt: Prompt | undefined
): Promise<string | undefined> {
  const approved = await optionalScenePath(output, sceneNumber, "", "approved.png");
  if (approved) {
    return approved;
  }

  const sceneImage = await optionalScenePath(output, sceneNumber, "", "image.png");
  if (sceneImage) {
    return sceneImage;
  }

  if (prompt) {
    const fullPath = path.join(output, "04_images", "full", prompt.image_filename);
    if (await fs.pathExists(fullPath)) {
      return `04_images/full/${prompt.image_filename}`;
    }
  }

  return undefined;
}

async function optionalScenePath(
  output: string,
  sceneNumber: number,
  folder: string,
  filename: string
): Promise<string | undefined> {
  const sceneFolder = `scene_${String(sceneNumber).padStart(3, "0")}`;
  const relative = folder
    ? path.join("04_images", "scenes", sceneFolder, folder, filename)
    : path.join("04_images", "scenes", sceneFolder, filename);
  const absolute = path.join(output, relative);
  return (await fs.pathExists(absolute)) ? relative.replace(/\\/g, "/") : undefined;
}

async function exists(root: string, ...parts: string[]): Promise<boolean> {
  return fs.pathExists(path.join(root, ...parts));
}

async function folderHasFiles(folder: string): Promise<boolean> {
  if (!(await fs.pathExists(folder))) {
    return false;
  }

  return (await fs.readdir(folder)).length > 0;
}

function approvalDetail(approvals: ImageApproval[]): string {
  if (approvals.length === 0) {
    return "no approval sheet yet";
  }

  const approved = approvals.filter((approval) => approval.status === "approved").length;
  return `${approved}/${approvals.length} approved`;
}

function boardMarkdown(data: BoardData): string {
  return `# Project Board

Project: ${data.projectName}
Pipeline: ${data.pipelineTitle} (${data.pipelineName})
Profile: ${data.profile}
Aspect ratio: ${data.aspectRatio}
Image provider: ${data.imageProvider}
Scene video provider: ${data.sceneVideoProvider}
Current deliverable: ${data.readiness.label}

## What Happens Next

${data.nextAction}

Behind the scenes:

\`\`\`bash
${data.nextCommand}
\`\`\`

## Progress

${data.stages.map((stage) => `- ${stage.ready ? "[x]" : "[ ]"} ${stage.label}: ${stage.detail}`).join("\n")}

## Review Files

${data.reviewFiles.length > 0 ? data.reviewFiles.map((file) => `- output/${file}`).join("\n") : "- none yet"}

## Scenes

${data.scenes.length > 0 ? data.scenes.map(sceneMarkdown).join("\n") : "No scenes prepared yet."}

## Decisions

${data.decisionCount} decisions recorded in \`decision_log.md\`.
`;
}

function artifactIndexMarkdown(data: BoardData): string {
  const current = data.stages.find((stage) => !stage.ready);
  return `# Production Artifacts

Project: ${data.projectName}

Open only the artifact that answers the current question:

- \`output/NEXT.html\` - the one recommended action now
- \`output/DECISION.html\` - the current human decision and review file
- \`output/PROGRESS.html\` - truthful asset and deliverable coverage
- \`output/BOARD.html\` - the complete production home with scene previews
- \`output/SESSION_HANDOFF.md\` - compact state for a returning agent

Current checkpoint: ${current?.label ?? "Editor pack review"}
Current deliverable: ${data.readiness.label}
`;
}

function sessionHandoffMarkdown(data: BoardData): string {
  const readyStages = data.stages.filter((stage) => stage.ready);
  const pendingStages = data.stages.filter((stage) => !stage.ready);
  const currentStage = pendingStages[0];
  const approvedScenes = data.scenes.filter((scene) => scene.approvalStatus === "approved").length;

  return `# Session Handoff

This file is generated for a creator or coding agent returning to the production. Refresh it behind the scenes with \`video-pack board --project ${data.projectArg}\`.

## Project

- Name: ${data.projectName}
- Creator type: ${data.pipelineTitle} (${data.pipelineName})
- Profile: ${data.profile}
- Aspect ratio: ${data.aspectRatio}
- Image provider: ${data.imageProvider}
- Scene video provider: ${data.sceneVideoProvider}
- Progress: ${readyStages.length}/${data.stages.length} stages ready
- Scene approvals: ${approvedScenes}/${data.scenes.length}
- Primary visuals: ${data.readiness.baseAssets.realAvailable}/${data.readiness.baseAssets.expected} real; ${data.readiness.baseAssets.mockPlaceholders} mock placeholders; ${data.readiness.baseAssets.approved}/${data.readiness.baseAssets.expected} approved
- Supplemental raster assets: ${data.readiness.visualEvents.realAvailable}/${data.readiness.visualEvents.expected} real; ${data.readiness.visualEvents.mockPlaceholders} mock placeholders; ${data.readiness.visualEvents.approved}/${data.readiness.visualEvents.expected} approved
- Code-rendered overlays: ${data.readiness.visualEvents.overlays}
- Code-rendered transitions: ${data.readiness.visualEvents.transitions}
- Narration file: ${data.readiness.audioPresent ? "present" : "absent"}
- Editor pack: ${data.readiness.editorPackPresent ? "present" : "absent"}
- Rendered MP4: ${data.readiness.renderedVideoPresent ? "present" : "absent"}
- Current deliverable: ${data.readiness.label}
- Decisions recorded: ${data.decisionCount}
- Commands are relative to: ${data.commandWorkingDirectory}

## Resume Here

1. Run commands from \`${data.commandWorkingDirectory}\`.
2. Refresh setup and state with \`video-pack doctor --project ${data.projectArg}\` and \`video-pack board --project ${data.projectArg}\`.
3. Show the creator \`output/NEXT.html\` or the review file for the current checkpoint.
4. Ask for one decision at a time and stop at every human or paid-provider gate.

Next human action: **${data.nextAction}**

Behind-the-scenes command:

\`\`\`bash
${data.nextCommand}
\`\`\`

${currentStage ? `Current stage: **${currentStage.label}** - ${currentStage.detail}.` : `The tracked editor-pack stages are ready. This is a **${data.readiness.label}**, not an automatically published or human-approved final video.`}

## Completed Stages

${readyStages.length > 0 ? readyStages.map((stage) => `- [x] ${stage.label}: ${stage.detail}`).join("\n") : "- none yet"}

## Pending Stages

${pendingStages.length > 0 ? pendingStages.map((stage) => `- [ ] ${stage.label}: ${stage.detail}`).join("\n") : "- none"}

## Review Files

${data.reviewFiles.length > 0 ? data.reviewFiles.map((file) => `- output/${file}`).join("\n") : "- none yet"}

## Human Gates

- Confirm before using a paid provider or sending content to an external provider.
- Do not approve images or use \`--approve-all\` without explicit human review.
- Do not replace creator-authored inputs or delete preserved scene assets without confirmation.
- Treat generated titles, descriptions, posts and claims as drafts until fact-checked.
- Faceless does not publish or upload automatically.

## Durable State

- Creator inputs: \`input/\`
- Configuration: \`project.yml\`
- Decisions: \`output/decision_log.md\`
- Visual board: \`output/BOARD.html\`
- One next action: \`output/NEXT.html\`
- Current decision: \`output/DECISION.html\`
- Honest coverage: \`output/PROGRESS.html\`
- Detailed status: run \`video-pack status --project ${data.projectArg}\`
`;
}

function sceneMarkdown(scene: BoardScene): string {
  return `### Scene ${scene.sceneNumber}

- Approval: ${scene.approvalStatus}
- Layout: ${scene.layoutMode}
- Continuity: ${scene.continuityGroup}
- Image: ${scene.imagePath ?? "missing"}
- Upscale: ${scene.upscaledPath ?? "missing"}
- Clip: ${scene.clipPath ?? "missing"}
- Visual goal: ${scene.visualGoal}
- Transcript: ${scene.transcript}`;
}

function boardHtml(data: BoardData): string {
  const readyCount = data.stages.filter((stage) => stage.ready).length;
  const currentIndex = data.stages.findIndex((stage) => !stage.ready);
  return htmlShell(
    data,
    "Production Home",
    `<header class="hero"><p class="eyebrow">Faceless production</p><h1>${escapeHtml(data.projectName)}</h1><p>${escapeHtml(data.pipelineTitle)} / ${escapeHtml(data.profile)} / ${escapeHtml(data.aspectRatio)}</p><div class="pills"><span>${escapeHtml(data.readiness.label)}</span><span>${readyCount}/${data.stages.length} stages ready</span><span>${data.scenes.length} scenes</span></div></header>
    ${nextPanel(data)}
    ${readinessPanel(data)}
    <section><h2>Production progress</h2><div class="stage-grid">${data.stages.map((stage, index) => stageHtml(stage, index, currentIndex)).join("\n")}</div></section>
    <section><h2>Scene review</h2><div class="scene-grid">${data.scenes.length > 0 ? data.scenes.map(sceneHtml).join("\n") : "<p>No scenes prepared yet.</p>"}</div></section>
    <section><h2>Available review artifacts</h2><div class="pills">${data.reviewFiles.length > 0 ? data.reviewFiles.map((file) => `<span>output/${escapeHtml(file)}</span>`).join("\n") : "<span>None generated yet</span>"}</div></section>`
  );
}

function progressHtml(data: BoardData): string {
  const currentIndex = data.stages.findIndex((stage) => !stage.ready);
  return htmlShell(
    data,
    "Progress",
    `<header class="hero"><p class="eyebrow">Honest production state</p><h1>${escapeHtml(data.projectName)}</h1><p>${escapeHtml(data.readiness.summary)}</p></header>${readinessPanel(data)}<section><h2>Workflow</h2><div class="stage-grid">${data.stages.map((stage, index) => stageHtml(stage, index, currentIndex)).join("\n")}</div></section>`
  );
}

function decisionHtml(data: BoardData): string {
  const current = data.stages.find((stage) => !stage.ready);
  const review = current?.review ? `<p class="review"><strong>Review:</strong> ${escapeHtml(current.review)}</p>` : "";
  return htmlShell(
    data,
    "Decision",
    `<header class="hero"><p class="eyebrow">One decision at a time</p><h1>${escapeHtml(current?.label ?? "Editor pack review")}</h1><p>${escapeHtml(data.nextAction)}</p></header><section class="focus"><h2>Recommended</h2><p>${escapeHtml(current?.action ?? finalNextAction(data.readiness))}</p>${review}<details><summary>Agent operation detail</summary><code>${escapeHtml(data.nextCommand)}</code></details></section><section class="guard"><h2>Human gate</h2><p>Do not spend provider credits, send private assets externally, approve creative work, replace authored inputs or publish anything without explicit confirmation.</p></section>`
  );
}

function nextHtml(data: BoardData): string {
  const current = data.stages.find((stage) => !stage.ready);
  return htmlShell(
    data,
    "Next",
    `<header class="hero"><p class="eyebrow">Pick back up here</p><h1>${escapeHtml(data.nextAction)}</h1><p>${escapeHtml(current?.detail ?? data.readiness.summary)}</p></header><section class="focus"><h2>Do this now</h2><p>${escapeHtml(current?.action ?? finalNextAction(data.readiness))}</p>${current?.review ? `<p class="review"><strong>Open:</strong> ${escapeHtml(current.review)}</p>` : ""}<details><summary>Agent operation detail</summary><code>${escapeHtml(data.nextCommand)}</code></details></section>${readinessPanel(data)}`
  );
}

function stageHtml(stage: BoardStage, index: number, currentIndex: number): string {
  const state = stage.ready ? "done" : index === currentIndex ? "now" : "later";
  return `<article class="stage ${state}">
  <p class="state">${state === "done" ? "Done" : state === "now" ? "Now" : "Later"}</p>
  <h3>${escapeHtml(stage.label)}</h3>
  <p>${escapeHtml(stage.detail)}</p>
</article>`;
}

function sceneHtml(scene: BoardScene): string {
  const thumb = scene.imageDataUri
    ? `<img class="thumb" src="${escapeAttribute(scene.imageDataUri)}" alt="Scene ${scene.sceneNumber}">`
    : `<div class="thumb missing">No image yet</div>`;

  return `<article class="scene">
  ${thumb}
  <div>
    <h3>Scene ${scene.sceneNumber}</h3>
    <p><strong>Approval:</strong> ${escapeHtml(scene.approvalStatus)}</p>
    <p><strong>Layout:</strong> ${escapeHtml(scene.layoutMode)} / ${escapeHtml(scene.continuityGroup)}</p>
    <p>${escapeHtml(scene.visualGoal)}</p>
    <p>${escapeHtml(shorten(scene.transcript, 180))}</p>
    <div class="asset-row">
      <span>image: ${scene.imagePath ? "ready" : "missing"}</span>
      <span>upscale: ${scene.upscaledPath ? "ready" : "missing"}</span>
      <span>clip: ${scene.clipPath ? "ready" : "missing"}</span>
    </div>
  </div>
</article>`;
}

function readinessPanel(data: BoardData): string {
  const readiness = data.readiness;
  return `<section><div class="section-head"><div><p class="eyebrow">Current deliverable</p><h2>${escapeHtml(readiness.label)}</h2></div><p>${escapeHtml(readiness.summary)}</p></div><div class="metrics"><div><strong>${readiness.baseAssets.realAvailable}/${readiness.baseAssets.expected}</strong><span>real primary visuals</span></div><div><strong>${readiness.baseAssets.mockPlaceholders}</strong><span>primary mock placeholders</span></div><div><strong>${readiness.baseAssets.approved}/${readiness.baseAssets.expected}</strong><span>primary visuals approved</span></div><div><strong>${readiness.visualEvents.realAvailable}/${readiness.visualEvents.expected}</strong><span>real raster cutaways</span></div><div><strong>${readiness.visualEvents.mockPlaceholders}</strong><span>cutaway mock placeholders</span></div><div><strong>${readiness.visualEvents.approved}/${readiness.visualEvents.expected}</strong><span>raster cutaways approved</span></div><div><strong>${readiness.visualEvents.overlays}</strong><span>code overlays planned</span></div><div><strong>${readiness.visualEvents.transitions}</strong><span>transitions planned</span></div><div><strong>${readiness.audioPresent ? "Yes" : "No"}</strong><span>narration file</span></div><div><strong>${readiness.renderedVideoPresent ? "Yes" : "No"}</strong><span>rendered MP4</span></div></div></section>`;
}

function nextPanel(data: BoardData): string {
  return `<section class="focus"><p class="eyebrow">What happens next</p><h2>${escapeHtml(data.nextAction)}</h2><p>${escapeHtml(data.stages.find((stage) => !stage.ready)?.action ?? finalNextAction(data.readiness))}</p><details><summary>Agent operation detail</summary><code>${escapeHtml(data.nextCommand)}</code></details></section>`;
}

function htmlShell(data: BoardData, title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(data.projectName)} - ${escapeHtml(title)}</title><style>
:root{color-scheme:light;--ink:#16212b;--muted:#607080;--line:#d7dde3;--paper:#fff;--bg:#f3f5f6;--accent:#087f5b;--accent-soft:#e7f5ef;--warn:#a45700;--later:#7b8794}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}main{width:min(1180px,calc(100% - 28px));margin:auto;padding:28px 0 54px}h1,h2,h3,p{margin:0;letter-spacing:0}h1{font-size:clamp(30px,5vw,50px);line-height:1.04;max-width:900px}h2{font-size:21px}h3{font-size:16px}.hero{display:grid;gap:8px;padding-bottom:22px;border-bottom:1px solid var(--line)}.eyebrow,.state{font-size:12px;color:var(--muted);text-transform:uppercase}.pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.pills span{border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:5px 9px;font-size:13px;color:var(--muted)}section{margin-top:24px}.focus,.guard{display:grid;gap:10px;background:var(--paper);border:1px solid var(--line);border-left:5px solid var(--accent);border-radius:7px;padding:18px}.guard{border-left-color:var(--warn)}details{margin-top:4px}summary{cursor:pointer;color:var(--muted)}code{display:block;max-width:100%;margin-top:9px;background:#edf1f3;padding:10px;border-radius:5px;overflow-wrap:anywhere;white-space:pre-wrap;font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}.review{color:var(--accent)}.section-head{display:grid;grid-template-columns:minmax(180px,.45fr) minmax(260px,1fr);gap:18px;align-items:end}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin-top:12px}.metrics div,.stage,.scene{background:var(--paper);border:1px solid var(--line);border-radius:7px;padding:12px;min-width:0}.metrics strong{display:block;font-size:23px}.metrics span{display:block;color:var(--muted);font-size:12px}.stage-grid,.scene-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:12px}.stage{display:grid;gap:4px}.stage.done .state{color:var(--accent)}.stage.now{border-color:#76b99f;background:var(--accent-soft)}.stage.now .state{color:var(--accent);font-weight:800}.stage.later{opacity:.72}.scene{display:grid;grid-template-columns:104px minmax(0,1fr);gap:12px;align-items:start}.thumb{width:104px;aspect-ratio:9/16;background:#e8ecef;border:1px solid var(--line);border-radius:5px;object-fit:cover}.missing{display:grid;place-items:center;color:var(--muted);font-size:12px;text-align:center;padding:8px}.scene p{color:var(--muted);font-size:13px;overflow-wrap:anywhere;margin-top:4px}.asset-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;color:var(--muted);font-size:12px}@media(max-width:620px){main{width:min(100% - 18px,1180px);padding-top:18px}.section-head{grid-template-columns:1fr}.scene{grid-template-columns:82px minmax(0,1fr)}.thumb{width:82px}}
</style></head><body><main>${body}</main></body></html>`;
}

function finalNextAction(readiness: ProductionReadiness): string {
  if (readiness.renderedVideoPresent) {
    return "Watch the rendered draft from start to finish and record final edit or publishing notes.";
  }
  if (readiness.editorPackPresent) {
    return readiness.audioPresent
      ? "Preview the editor pack in Remotion or import it into your preferred editor; render only after human review."
      : "Add or record the final narration, then preview the editor pack before rendering.";
  }
  return "Review the current production artifacts before continuing.";
}

function shorten(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 3).trim()}...`;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

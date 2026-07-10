import path from "node:path";
import fs from "fs-extra";
import { displayPath, writeTextFile, type WriteResult } from "./files.js";
import { getProductionPipeline } from "./pipelines.js";
import { readDecisionLog } from "./decision-log.js";
import type { ImageApproval, Prompt, Scene } from "./schemas.js";
import type { LoadedProject } from "./validation.js";
import { getApprovalState, getImageAssetState, imageAssetDetail, readScenePrompts } from "./workflow-assets.js";

interface BoardStage {
  label: string;
  ready: boolean;
  detail: string;
  command: string;
}

interface BoardScene {
  sceneNumber: number;
  transcript: string;
  visualGoal: string;
  layoutMode: string;
  continuityGroup: string;
  approvalStatus: string;
  imagePath?: string;
  upscaledPath?: string;
  clipPath?: string;
}

interface BoardData {
  projectName: string;
  pipelineTitle: string;
  pipelineName: string;
  profile: string;
  aspectRatio: string;
  imageProvider: string;
  sceneVideoProvider: string;
  nextCommand: string;
  reviewFiles: string[];
  stages: BoardStage[];
  scenes: BoardScene[];
  decisionCount: number;
}

export async function writeProjectBoard(
  project: LoadedProject,
  options: { force?: boolean } = { force: true }
): Promise<WriteResult[]> {
  const data = await createProjectBoardData(project);

  return Promise.all([
    writeTextFile(path.join(project.paths.outputFolder, "BOARD.md"), boardMarkdown(data), options),
    writeTextFile(path.join(project.paths.outputFolder, "BOARD.html"), boardHtml(data), options)
  ]);
}

async function createProjectBoardData(project: LoadedProject): Promise<BoardData> {
  const pipeline = getProductionPipeline(project.config.pipeline);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const output = project.paths.outputFolder;
  const scenesReady = await exists(output, "02_scenes", "scenes.json");
  const stages = await boardStages(output, projectArg, scenesReady);
  const nextStage = stages.find((stage) => !stage.ready);
  const decisions = await readDecisionLog(output);

  return {
    projectName: project.config.project_name,
    pipelineTitle: pipeline.title,
    pipelineName: pipeline.name,
    profile: project.config.profile,
    aspectRatio: project.config.aspect_ratio,
    imageProvider: project.config.generation.image_provider,
    sceneVideoProvider: project.config.generation.scene_video_provider,
    nextCommand: nextStage?.command ?? `video-pack status --project ${projectArg}`,
    reviewFiles: await boardReviewFiles(output),
    stages,
    scenes: await boardScenes(output),
    decisionCount: decisions.length
  };
}

async function boardReviewFiles(output: string): Promise<string[]> {
  const candidates = [
    "00_proposal/proposal.md",
    "02_scenes/scene_production.html",
    "02_scenes/scene_production.md",
    "02_scenes/visual_events.md",
    "03_prompts/prompts.md",
    "04_images/review_board.html",
    "04_images/scenes/",
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

async function boardStages(output: string, projectArg: string, scenesReady: boolean): Promise<BoardStage[]> {
  const prompts = await readScenePrompts(output);
  const imageAssets = await getImageAssetState(output, prompts);
  const approvalState = await getApprovalState(output, prompts, imageAssets);
  const sceneAssetCount = await countSceneAssetFolders(output);
  const packageReady = await exists(output, "README_NEXT_STEPS.md");
  const imagesReady = imageAssets.expected > 0 && imageAssets.available === imageAssets.expected;
  const imageCommand = imageAssets.promptPackReady && !imagesReady
    ? `video-pack next --project ${projectArg}`
    : `video-pack generate-images --project ${projectArg}`;

  return [
    stage("Analyze", await exists(output, "00_analysis", "content_analysis.md"), "hook, pacing and platform fit", `video-pack analyze --project ${projectArg}`),
    stage("Plan", await exists(output, "cost_estimate.json"), "scene count and cost estimate", `video-pack plan --project ${projectArg}`),
    stage(
      "Proposal",
      (await exists(output, "00_proposal", "proposal.md")) || scenesReady,
      scenesReady && !(await exists(output, "00_proposal", "proposal.md"))
        ? "checkpoint bypassed by later scene outputs"
        : "production route and provider readiness",
      `video-pack proposal --project ${projectArg}`
    ),
    stage("Scenes", scenesReady, "timed scene plan", `video-pack prepare --project ${projectArg}`),
    stage(
      "Visual Events",
      (await exists(output, "02_scenes", "visual_events.json")) || (await exists(output, "03_prompts", "prompts.json")),
      "overlay, cutaway and pacing beats",
      `video-pack visual-events --project ${projectArg}`
    ),
    stage("Prompts", await exists(output, "03_prompts", "prompts.json"), "scene and thumbnail prompts", `video-pack prompts --project ${projectArg}`),
    stage("Layout Preview", await folderHasFiles(path.join(output, "04_images", "preview")), "no-cost scene framing and review-board check", `video-pack preview --project ${projectArg}`),
    stage("Real Assets", imagesReady, imageAssetDetail(imageAssets), imageCommand),
    stage("Scene Assets", sceneAssetCount > 0, `${sceneAssetCount} scene folders`, `video-pack scene-assets --project ${projectArg}`),
    stage("Approval", approvalState.ready, `${approvalState.approved}/${approvalState.expected} real scene assets approved`, `video-pack approve-images --project ${projectArg}`),
    stage("Package", packageReady && approvalState.ready, "captions, edit assembly files, copy and Remotion draft", `video-pack package --project ${projectArg}`)
  ];
}

function stage(label: string, ready: boolean, detail: string, command: string): BoardStage {
  return { label, ready, detail, command };
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
    items.push({
      sceneNumber: scene.scene_number,
      transcript: scene.transcript,
      visualGoal: scene.visual_goal,
      layoutMode: prompt?.scene_production?.layout_mode ?? "unspecified",
      continuityGroup: prompt?.scene_production?.continuity_group ?? "none",
      approvalStatus: approval?.status ?? "not reviewed",
      imagePath: await bestRelativeImagePath(output, scene.scene_number, prompt),
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

async function countSceneAssetFolders(output: string): Promise<number> {
  const scenesFolder = path.join(output, "04_images", "scenes");
  if (!(await fs.pathExists(scenesFolder))) {
    return 0;
  }

  return (await fs.readdir(scenesFolder)).filter((entry) => entry.startsWith("scene_")).length;
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

## Next Command

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

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.projectName)} Board</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --text: #18212f;
      --muted: #5f6b7a;
      --line: #d9dee7;
      --panel: #ffffff;
      --accent: #116466;
      --warn: #9a4d00;
      --ok: #1f7a4d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 48px;
    }
    header {
      display: grid;
      gap: 14px;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: clamp(28px, 5vw, 44px); line-height: 1.05; letter-spacing: 0; }
    h2 { font-size: 20px; margin: 28px 0 12px; }
    h3 { font-size: 16px; }
    code {
      display: inline-block;
      max-width: 100%;
      overflow-wrap: anywhere;
      background: #eef1f5;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .meta, .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pill {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 999px;
      padding: 5px 9px;
      color: var(--muted);
      font-size: 13px;
    }
    .next {
      border-left: 4px solid var(--accent);
      background: var(--panel);
      padding: 14px 16px;
      border-radius: 6px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }
    .stage, .scene {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 12px;
      min-width: 0;
    }
    .stage strong {
      color: var(--ok);
    }
    .stage.pending strong {
      color: var(--warn);
    }
    .scene {
      display: grid;
      grid-template-columns: 104px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }
    .thumb {
      width: 104px;
      aspect-ratio: 9 / 16;
      background: #e8ecf2;
      border: 1px solid var(--line);
      border-radius: 5px;
      object-fit: cover;
    }
    .missing {
      display: grid;
      place-items: center;
      color: var(--muted);
      font-size: 12px;
      text-align: center;
      padding: 8px;
    }
    .scene p {
      color: var(--muted);
      font-size: 13px;
      overflow-wrap: anywhere;
      margin-top: 4px;
    }
    .asset-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
      color: var(--muted);
      font-size: 12px;
    }
    @media (max-width: 560px) {
      main { width: min(100% - 20px, 1120px); padding-top: 18px; }
      .scene { grid-template-columns: 82px minmax(0, 1fr); }
      .thumb { width: 82px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(data.projectName)}</h1>
      <div class="meta">
        <span class="pill">${escapeHtml(data.pipelineTitle)}</span>
        <span class="pill">${escapeHtml(data.profile)}</span>
        <span class="pill">${escapeHtml(data.aspectRatio)}</span>
        <span class="pill">images: ${escapeHtml(data.imageProvider)}</span>
        <span class="pill">scene video: ${escapeHtml(data.sceneVideoProvider)}</span>
      </div>
      <div class="summary">
        <span class="pill">${readyCount}/${data.stages.length} stages ready</span>
        <span class="pill">${data.scenes.length} scenes</span>
        <span class="pill">${data.decisionCount} decisions</span>
      </div>
      <section class="next">
        <h2>Next Command</h2>
        <code>${escapeHtml(data.nextCommand)}</code>
      </section>
      ${
        data.reviewFiles.length > 0
          ? `<section class="next">
        <h2>Review Files</h2>
        <div class="meta">
          ${data.reviewFiles.map((file) => `<span class="pill">output/${escapeHtml(file)}</span>`).join("\n")}
        </div>
      </section>`
          : ""
      }
    </header>

    <section>
      <h2>Progress</h2>
      <div class="grid">
        ${data.stages.map(stageHtml).join("\n")}
      </div>
    </section>

    <section>
      <h2>Scenes</h2>
      <div class="grid">
        ${data.scenes.length > 0 ? data.scenes.map(sceneHtml).join("\n") : `<p>No scenes prepared yet.</p>`}
      </div>
    </section>
  </main>
</body>
</html>`;
}

function stageHtml(stage: BoardStage): string {
  return `<article class="stage ${stage.ready ? "ready" : "pending"}">
  <h3><strong>${stage.ready ? "Ready" : "Next"}</strong> ${escapeHtml(stage.label)}</h3>
  <p>${escapeHtml(stage.detail)}</p>
  <p><code>${escapeHtml(stage.command)}</code></p>
</article>`;
}

function sceneHtml(scene: BoardScene): string {
  const thumb = scene.imagePath
    ? `<img class="thumb" src="${escapeAttribute(scene.imagePath)}" alt="Scene ${scene.sceneNumber}">`
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

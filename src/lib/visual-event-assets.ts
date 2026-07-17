import path from "node:path";
import fs from "fs-extra";
import { imageFileToDataUri, isImageFile } from "./media.js";
import { isCurrentMockAsset } from "./mock-png.js";
import type { ApprovalStatus, Prompt, Scene, VisualEvent, VisualEventScenePlan } from "./schemas.js";
import { writeJsonFile, writeTextFile, type WriteResult } from "./files.js";

export interface VisualEventAssetApproval {
  event_id: string;
  scene_number: number;
  asset_filename: string;
  status: ApprovalStatus;
  notes: string;
  updated_at: string;
}

export interface VisualEventAssetItem {
  event: VisualEvent;
  scene?: Scene;
  prompt?: Prompt;
  assetFilename: string;
  assetPath?: string;
  assetRelativePath: string;
  assetExists: boolean;
  mockPlaceholder: boolean;
  imageDataUri?: string;
  approval: VisualEventAssetApproval;
  generationPrompt: string;
}

export interface VisualEventAssetState {
  expected: number;
  available: number;
  realAvailable: number;
  mockPlaceholders: number;
  approved: number;
  pending: number;
  missingEventIds: string[];
  pendingEventIds: string[];
  overlays: number;
  transitions: number;
  items: VisualEventAssetItem[];
}

export function visualEventApprovalsPath(outputFolder: string): string {
  return path.join(outputFolder, "04_images", "events", "approvals.json");
}

export function visualEventFolder(outputFolder: string, eventId: string): string {
  return path.join(outputFolder, "04_images", "events", safeEventId(eventId));
}

export async function readVisualEvents(outputFolder: string): Promise<VisualEvent[]> {
  const scenePlansPath = path.join(outputFolder, "02_scenes", "visual_events.json");
  if (await fs.pathExists(scenePlansPath)) {
    const plans = (await fs.readJson(scenePlansPath)) as VisualEventScenePlan[];
    return plans.flatMap((plan) => plan.events ?? []);
  }

  const editEventsPath = path.join(outputFolder, "06_edit_pack", "visual_events.json");
  return (await fs.pathExists(editEventsPath)) ? ((await fs.readJson(editEventsPath)) as VisualEvent[]) : [];
}

export function supplementalRasterEvents(events: VisualEvent[], prompts: Prompt[]): VisualEvent[] {
  const primaryFilenames = new Set(prompts.map((prompt) => prompt.image_filename));
  const firstImageByScene = new Set<number>();

  return events.filter((event) => {
    if (event.type !== "image") {
      return false;
    }

    const isFirstImage = !firstImageByScene.has(event.scene_number);
    firstImageByScene.add(event.scene_number);
    const isPrimary = isFirstImage || (event.asset_filename ? primaryFilenames.has(event.asset_filename) : false);
    return !isPrimary;
  });
}

export async function getVisualEventAssetState(options: {
  projectRoot: string;
  outputFolder: string;
  scenes?: Scene[];
  prompts?: Prompt[];
}): Promise<VisualEventAssetState> {
  const events = await readVisualEvents(options.outputFolder);
  const scenes = options.scenes ?? (await readJsonIfExists<Scene[]>(path.join(options.outputFolder, "02_scenes", "scenes.json"), []));
  const prompts = options.prompts ?? (await readJsonIfExists<Prompt[]>(path.join(options.outputFolder, "03_prompts", "prompts.json"), []));
  const approvals = await readJsonIfExists<VisualEventAssetApproval[]>(visualEventApprovalsPath(options.outputFolder), []);
  const approvalByEvent = new Map(approvals.map((approval) => [approval.event_id, approval]));
  const sceneByNumber = new Map(scenes.map((scene) => [scene.scene_number, scene]));
  const promptByNumber = new Map(prompts.map((prompt) => [prompt.scene_number, prompt]));
  const stockAssets = await readStockAssetPaths(options.projectRoot, options.outputFolder);
  const visualEventsPath = path.join(options.outputFolder, "02_scenes", "visual_events.json");
  const visualEventsMtime = (await fs.pathExists(visualEventsPath)) ? (await fs.stat(visualEventsPath)).mtimeMs : 0;
  const rasterEvents = supplementalRasterEvents(events, prompts);
  const items: VisualEventAssetItem[] = [];

  for (const event of rasterEvents) {
    const assetFilename = eventAssetFilename(event);
    const assetPath = await resolveVisualEventAssetPath(options.outputFolder, event, stockAssets.get(event.event_id));
    const mockPlaceholder = await isCurrentMockAsset(assetPath);
    const existingApproval = approvalByEvent.get(event.event_id);
    const approvalIsCurrent =
      existingApproval?.asset_filename === assetFilename && Date.parse(existingApproval.updated_at) >= visualEventsMtime;
    const approval: VisualEventAssetApproval = approvalIsCurrent
      ? existingApproval
      : {
          event_id: event.event_id,
          scene_number: event.scene_number,
          asset_filename: assetFilename,
          status: "pending",
          notes: "",
          updated_at: new Date().toISOString()
        };
    const scene = sceneByNumber.get(event.scene_number);
    const prompt = promptByNumber.get(event.scene_number);

    items.push({
      event,
      scene,
      prompt,
      assetFilename,
      assetPath,
      assetRelativePath: assetPath
        ? relativeFromOutput(options.outputFolder, assetPath)
        : `04_images/events/${safeEventId(event.event_id)}/${assetFilename}`,
      assetExists: Boolean(assetPath),
      mockPlaceholder,
      imageDataUri: await imageFileToDataUri(assetPath),
      approval,
      generationPrompt: visualEventGenerationPrompt(event, scene, prompt)
    });
  }

  const available = items.filter((item) => item.assetExists).length;
  const realAvailable = items.filter((item) => item.assetExists && !item.mockPlaceholder).length;
  const mockPlaceholders = items.filter((item) => item.mockPlaceholder).length;
  const approved = items.filter(
    (item) => item.assetExists && !item.mockPlaceholder && item.approval.status === "approved"
  ).length;

  return {
    expected: items.length,
    available,
    realAvailable,
    mockPlaceholders,
    approved,
    pending: Math.max(0, items.length - approved),
    missingEventIds: items.filter((item) => !item.assetExists).map((item) => item.event.event_id),
    pendingEventIds: items
      .filter((item) => !item.assetExists || item.mockPlaceholder || item.approval.status !== "approved")
      .map((item) => item.event.event_id),
    overlays: events.filter((event) => event.type === "text" || event.type === "overlay").length,
    transitions: events.filter((event) => event.type === "transition").length,
    items
  };
}

export async function saveVisualEventApprovals(
  outputFolder: string,
  approvals: VisualEventAssetApproval[]
): Promise<WriteResult> {
  return writeJsonFile(visualEventApprovalsPath(outputFolder), approvals, { force: true });
}

export async function writeVisualEventReviewBoards(options: {
  projectName: string;
  projectArg: string;
  outputFolder: string;
  state: VisualEventAssetState;
}): Promise<WriteResult[]> {
  const folder = path.join(options.outputFolder, "04_images", "events");
  return Promise.all([
    writeTextFile(path.join(folder, "review_board.md"), visualEventReviewMarkdown(options), { force: true }),
    writeTextFile(path.join(folder, "review_board.html"), visualEventReviewHtml(options), { force: true }),
    writeTextFile(path.join(folder, "requests.md"), visualEventRequestsMarkdown(options), { force: true }),
    writeJsonFile(
      path.join(folder, "requests.json"),
      options.state.items.map((item) => ({
        event_id: item.event.event_id,
        scene_number: item.event.scene_number,
        purpose: item.event.notes ?? "supporting cutaway",
        source_type: item.event.source_type ?? "generated",
        expected_folder: `output/04_images/events/${safeEventId(item.event.event_id)}/`,
        expected_filename: item.assetFilename,
        prompt: item.generationPrompt
      })),
      { force: true }
    )
  ]);
}

export async function writeVisualEventFolders(options: {
  outputFolder: string;
  state: VisualEventAssetState;
}): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  for (const item of options.state.items) {
    const folder = visualEventFolder(options.outputFolder, item.event.event_id);
    results.push(
      await writeTextFile(path.join(folder, "prompt.md"), `${item.generationPrompt}\n`, { force: true }),
      await writeJsonFile(
        path.join(folder, "prompt.json"),
        {
          event_id: item.event.event_id,
          scene_number: item.event.scene_number,
          expected_filename: item.assetFilename,
          prompt: item.generationPrompt
        },
        { force: true }
      ),
      await writeJsonFile(
        path.join(folder, "manifest.json"),
        {
          event_id: item.event.event_id,
          scene_number: item.event.scene_number,
          event_type: item.event.type,
          source_type: item.event.source_type ?? "generated",
          expected_filename: item.assetFilename,
          timing: {
            start: item.event.start_time,
            duration_seconds: item.event.duration_seconds
          },
          purpose: item.event.notes ?? "supporting cutaway",
          prompt: item.generationPrompt
        },
        { force: true }
      )
    );
  }
  return results;
}

export function eventAssetFilename(event: VisualEvent): string {
  const supplied = path.basename(event.asset_filename ?? "");
  return supplied || `${safeEventId(event.event_id)}.png`;
}

export function visualEventGenerationPrompt(event: VisualEvent, scene?: Scene, prompt?: Prompt): string {
  const styleContext = prompt?.prompt
    ? `Match the established scene art direction and visual language, without copying its composition.`
    : "Use a clear, production-ready visual style suited to the project.";

  return `Create one supplemental cutaway image for scene ${event.scene_number}.

Narration: ${scene?.transcript ?? "(not available)"}
Visual purpose: ${event.notes ?? "support the narrated point with a distinct cutaway"}
Subject direction: ${event.image_prompt ?? scene?.visual_goal ?? "make the spoken point immediately clear"}

${styleContext}
Use a clearly different composition from the primary scene image. Do not automatically add recurring presenters or characters unless this specific beat requires them. Keep the subject readable at feed size, preserve caption-safe space, and do not render logos, watermarks or readable text.`;
}

function visualEventReviewMarkdown(options: {
  projectName: string;
  projectArg: string;
  state: VisualEventAssetState;
}): string {
  const items = options.state.items
    .map(
      (item) => `## ${item.event.event_id} - scene ${item.event.scene_number}

- Status: ${item.mockPlaceholder ? "mock placeholder (cannot be approved)" : item.approval.status}
- Source route: ${item.event.source_type ?? "generated"}
- Purpose: ${item.event.notes ?? "supporting cutaway"}
- Timing: ${item.event.start_time} for ${item.event.duration_seconds}s
- Expected file: \`${item.assetRelativePath}\`

${item.assetExists ? `![${item.event.event_id}](${item.assetRelativePath})` : "Asset missing."}

Prompt:

${item.generationPrompt}

Approve:

\`\`\`bash
video-pack approve-visual-assets --project ${options.projectArg} --event ${item.event.event_id} --status approved
\`\`\`

Regenerate:

\`\`\`bash
video-pack approve-visual-assets --project ${options.projectArg} --event ${item.event.event_id} --status needs-regen --notes "Describe the change"
\`\`\`
`
    )
    .join("\n");

  return `# Supplemental Visual Review

Project: ${options.projectName}

- Raster cutaways: ${options.state.available}/${options.state.expected} available
- Real cutaways: ${options.state.realAvailable}/${options.state.expected}
- Mock placeholders: ${options.state.mockPlaceholders}
- Approved cutaways: ${options.state.approved}/${options.state.expected}
- Code-rendered text/overlays: ${options.state.overlays}
- Code-rendered transitions: ${options.state.transitions}

${items || "No supplemental raster events are planned."}`;
}

function visualEventRequestsMarkdown(options: {
  projectName: string;
  state: VisualEventAssetState;
}): string {
  return `# Supplemental Visual Requests

Project: ${options.projectName}

These are the planned raster cutaways beyond each scene's primary frame. Generate or source one asset per event, then save it in the event folder shown below.

${options.state.items
  .map(
    (item) => `## ${item.event.event_id}

- Scene: ${item.event.scene_number}
- Purpose: ${item.event.notes ?? "supporting cutaway"}
- Suggested source: ${item.event.source_type ?? "generated"}
- Folder: \`output/04_images/events/${safeEventId(item.event.event_id)}/\`
- Filename: \`${item.assetFilename}\`

${item.generationPrompt}`
  )
  .join("\n\n")}`;
}

function visualEventReviewHtml(options: {
  projectName: string;
  projectArg: string;
  state: VisualEventAssetState;
}): string {
  const cards = options.state.items
    .map((item) => {
      const preview = item.imageDataUri
        ? `<img src="${escapeAttribute(item.imageDataUri)}" alt="${escapeAttribute(item.event.event_id)} preview">`
        : item.assetExists
          ? `<div class="missing">Asset exists but cannot be embedded as an image: ${escapeHtml(item.assetRelativePath)}</div>`
          : `<div class="missing">Missing asset<br><code>${escapeHtml(item.assetRelativePath)}</code></div>`;
      return `<article class="card">
  <div class="top"><div><span class="eyebrow">Scene ${item.event.scene_number}</span><h2>${escapeHtml(item.event.event_id)}</h2></div><span class="status ${escapeAttribute(item.approval.status)}">${escapeHtml(item.mockPlaceholder ? "mock placeholder" : item.approval.status)}</span></div>
  ${preview}
  <dl><dt>Purpose</dt><dd>${escapeHtml(item.event.notes ?? "supporting cutaway")}</dd><dt>Timing</dt><dd>${escapeHtml(item.event.start_time)} for ${item.event.duration_seconds}s</dd><dt>Source route</dt><dd>${escapeHtml(item.event.source_type ?? "generated")}</dd></dl>
  <details><summary>Generation prompt</summary><pre>${escapeHtml(item.generationPrompt)}</pre></details>
  <div class="actions"><code>video-pack approve-visual-assets --project ${escapeHtml(options.projectArg)} --event ${escapeHtml(item.event.event_id)} --status approved</code><code>video-pack approve-visual-assets --project ${escapeHtml(options.projectArg)} --event ${escapeHtml(item.event.event_id)} --status needs-regen --notes "Describe the change"</code></div>
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(options.projectName)} - Supplemental Visual Review</title>
<style>
:root{color-scheme:light;--ink:#17212b;--muted:#607080;--line:#d7dde3;--paper:#fff;--bg:#f3f5f6;--accent:#087f5b;--warn:#a45700}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}main{width:min(1180px,calc(100% - 28px));margin:auto;padding:28px 0 50px}header{display:grid;gap:8px;padding-bottom:20px;border-bottom:1px solid var(--line)}h1,h2,p{margin:0}h1{font-size:clamp(28px,5vw,46px);line-height:1.05;letter-spacing:0}.summary{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.summary span,.status{border:1px solid var(--line);background:var(--paper);padding:5px 9px;border-radius:999px;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:20px}.card{display:grid;gap:12px;background:var(--paper);border:1px solid var(--line);border-radius:7px;padding:14px;min-width:0}.top{display:flex;justify-content:space-between;gap:12px;align-items:start}.eyebrow{font-size:12px;color:var(--muted);text-transform:uppercase}.card h2{font-size:17px;overflow-wrap:anywhere}.status.approved{color:var(--accent);border-color:#93d4bd}.status.needs-regen,.status.rejected{color:var(--warn);border-color:#e9be8b}img,.missing{width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid var(--line);border-radius:5px;background:#e8ecef}.missing{display:grid;place-items:center;text-align:center;color:var(--muted);padding:20px}dl{display:grid;grid-template-columns:88px 1fr;gap:5px 10px;margin:0}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}summary{cursor:pointer;font-weight:700}pre,code{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef1f3;border-radius:4px;padding:9px;font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}.actions{display:grid;gap:7px}@media(max-width:560px){main{width:min(100% - 18px,1180px);padding-top:18px}.grid{grid-template-columns:1fr}}
</style></head><body><main><header><p>Faceless production artifact</p><h1>Supplemental Visual Review</h1><p>${escapeHtml(options.projectName)}</p><div class="summary"><span>${options.state.realAvailable}/${options.state.expected} real cutaways</span><span>${options.state.mockPlaceholders} mock placeholders</span><span>${options.state.approved}/${options.state.expected} approved</span><span>${options.state.overlays} code overlays</span><span>${options.state.transitions} transitions</span></div></header><section class="grid">${cards || "<p>No supplemental raster events are planned.</p>"}</section></main></body></html>`;
}

async function resolveVisualEventAssetPath(
  outputFolder: string,
  event: VisualEvent,
  stockPath?: string
): Promise<string | undefined> {
  if (stockPath && (await fs.pathExists(stockPath))) {
    return stockPath;
  }

  const folder = visualEventFolder(outputFolder, event.event_id);
  const expected = path.join(folder, eventAssetFilename(event));
  if (await fs.pathExists(expected)) {
    return expected;
  }

  if (!(await fs.pathExists(folder))) {
    return undefined;
  }

  const files = (await fs.readdir(folder))
    .filter((filename) => isImageFile(filename) || [".mp4", ".mov", ".webm"].includes(path.extname(filename).toLowerCase()))
    .sort();
  return files[0] ? path.join(folder, files[0]) : undefined;
}

async function readStockAssetPaths(projectRoot: string, outputFolder: string): Promise<Map<string, string>> {
  const reportPath = path.join(outputFolder, "06_edit_pack", "stock_assets", "download_report.json");
  const paths = new Map<string, string>();
  if (!(await fs.pathExists(reportPath))) {
    return paths;
  }

  const report = (await fs.readJson(reportPath)) as {
    results?: Array<{ event_id?: string; relative_path?: string; status?: string }>;
  };
  for (const result of report.results ?? []) {
    if (!result.event_id || !result.relative_path || !["downloaded", "skipped"].includes(result.status ?? "")) {
      continue;
    }
    const resolved = path.isAbsolute(result.relative_path)
      ? result.relative_path
      : path.resolve(projectRoot, result.relative_path);
    if (await fs.pathExists(resolved)) {
      paths.set(result.event_id, resolved);
    }
  }
  return paths;
}

async function readJsonIfExists<T>(filePath: string, fallback: T): Promise<T> {
  return (await fs.pathExists(filePath)) ? ((await fs.readJson(filePath)) as T) : fallback;
}

function relativeFromOutput(outputFolder: string, filePath: string): string {
  const relative = path.relative(outputFolder, filePath).replace(/\\/g, "/");
  return relative.startsWith("..") ? filePath.replace(/\\/g, "/") : relative;
}

function safeEventId(eventId: string): string {
  return eventId.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

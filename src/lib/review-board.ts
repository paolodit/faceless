import path from "node:path";
import fs from "fs-extra";
import { writeTextFile, type WriteResult } from "./files.js";
import { imageFileToDataUri } from "./media.js";
import { isCurrentMockAsset } from "./mock-png.js";
import type { ImageApproval, Prompt, Scene, ThumbnailPrompt } from "./schemas.js";

export interface ImageReviewItem {
  sceneNumber: number;
  status: string;
  notes: string;
  transcript: string;
  visualGoal: string;
  prompt: string;
  imageFilename: string;
  imageRelativePath: string;
  imageExists: boolean;
  mockPlaceholder?: boolean;
  imageDataUri?: string;
  approveCommand: string;
  regenCommand: string;
}

export interface ThumbnailReviewItem {
  thumbnailNumber: number;
  title: string;
  rationale: string;
  prompt: string;
  imageFilename: string;
  imageRelativePath: string;
  imageExists: boolean;
  imageDataUri?: string;
  selectionNotes: string;
}

export async function writeImageReviewBoards(options: {
  outputFolder: string;
  projectName: string;
  projectArg: string;
  scenes: Scene[];
  prompts: Prompt[];
  approvals: ImageApproval[];
}): Promise<WriteResult[]> {
  const items = await imageReviewItems(options);
  const folder = path.join(options.outputFolder, "04_images");

  return Promise.all([
    writeTextFile(
      path.join(folder, "review_board.md"),
      imageReviewBoardMarkdown({ projectName: options.projectName, items }),
      { force: true }
    ),
    writeTextFile(
      path.join(folder, "review_board.html"),
      imageReviewBoardHtml({ projectName: options.projectName, items }),
      { force: true }
    )
  ]);
}

export async function writeThumbnailReviewBoards(options: {
  outputFolder: string;
  projectName: string;
  prompts: ThumbnailPrompt[];
}): Promise<WriteResult[]> {
  const items = await thumbnailReviewItems(options);
  const folder = path.join(options.outputFolder, "07_publish", "thumbnails");

  return Promise.all([
    writeTextFile(
      path.join(folder, "review_board.md"),
      thumbnailReviewBoardMarkdown({ projectName: options.projectName, items }),
      { force: true }
    ),
    writeTextFile(
      path.join(folder, "review_board.html"),
      thumbnailReviewBoardHtml({ projectName: options.projectName, items }),
      { force: true }
    )
  ]);
}

export function imageReviewBoardMarkdown(options: { projectName: string; items: ImageReviewItem[] }): string {
  const summary = summarizeStatuses(options.items);
  const sections = options.items.map(
    (item) => `## Scene ${item.sceneNumber} - ${item.status}

Image file: \`${item.imageFilename}\`

Asset type: ${item.mockPlaceholder ? "mock layout placeholder (cannot be approved as production art)" : item.imageExists ? "production asset" : "missing"}

Image preview:

${item.imageExists ? `![Scene ${item.sceneNumber}](${item.imageRelativePath})` : `Missing image. Expected path: \`${item.imageRelativePath}\``}

Transcript:

${item.transcript || "(none)"}

Visual goal:

${item.visualGoal || "(none)"}

Prompt:

${item.prompt || "(none)"}

Notes:

${item.notes || "(none)"}

Approve:

\`\`\`bash
${item.approveCommand}
\`\`\`

Needs regeneration:

\`\`\`bash
${item.regenCommand}
\`\`\`
`
  );

  return `# Image Review Board

Project: ${options.projectName}

Summary:
- approved: ${summary.approved}
- pending: ${summary.pending}
- rejected: ${summary.rejected}
- needs-regen: ${summary["needs-regen"]}

${sections.join("\n")}`;
}

export function imageReviewBoardHtml(options: { projectName: string; items: ImageReviewItem[] }): string {
  const cards = options.items
    .map(
      (item) => `<section class="card">
  <div class="card-header">
    <h2>Scene ${item.sceneNumber}</h2>
    <span class="status">${escapeHtml(item.mockPlaceholder ? "mock placeholder" : item.status)}</span>
  </div>
  <p><strong>Image file:</strong> <code>${escapeHtml(item.imageFilename)}</code></p>
  ${
    item.imageExists
      ? `<img src="${escapeAttribute(item.imageDataUri ?? item.imageRelativePath)}" alt="Scene ${item.sceneNumber} preview">`
      : `<p class="missing">Missing image. Expected path: <code>${escapeHtml(item.imageRelativePath)}</code></p>`
  }
  <h3>Transcript</h3>
  <p>${escapeHtml(item.transcript || "(none)")}</p>
  <h3>Visual goal</h3>
  <p>${escapeHtml(item.visualGoal || "(none)")}</p>
  <h3>Prompt</h3>
  <pre>${escapeHtml(item.prompt || "(none)")}</pre>
  <h3>Notes</h3>
  <p>${escapeHtml(item.notes || "(none)")}</p>
  <h3>Commands</h3>
  <pre>${escapeHtml(item.approveCommand)}
${escapeHtml(item.regenCommand)}</pre>
</section>`
    )
    .join("\n");

  return htmlPage(options.projectName, "Image Review Board", cards);
}

export function thumbnailReviewBoardMarkdown(options: {
  projectName: string;
  items: ThumbnailReviewItem[];
}): string {
  const sections = options.items.map(
    (item) => `## Thumbnail ${item.thumbnailNumber}: ${item.title}

Image file: \`${item.imageFilename}\`

Image preview:

${item.imageExists ? `![Thumbnail ${item.thumbnailNumber}](${item.imageRelativePath})` : `Missing image. Expected path: \`${item.imageRelativePath}\``}

Rationale:

${item.rationale || "(none)"}

Selection notes:

${item.selectionNotes}

Prompt:

${item.prompt || "(none)"}
`
  );

  return `# Thumbnail Review Board

Project: ${options.projectName}

${sections.join("\n")}`;
}

export function thumbnailReviewBoardHtml(options: {
  projectName: string;
  items: ThumbnailReviewItem[];
}): string {
  const cards = options.items
    .map(
      (item) => `<section class="card">
  <div class="card-header">
    <h2>Thumbnail ${item.thumbnailNumber}</h2>
    <span class="status">${escapeHtml(item.title)}</span>
  </div>
  <p><strong>Image file:</strong> <code>${escapeHtml(item.imageFilename)}</code></p>
  ${
    item.imageExists
      ? `<img src="${escapeAttribute(item.imageDataUri ?? item.imageRelativePath)}" alt="Thumbnail ${item.thumbnailNumber} preview">`
      : `<p class="missing">Missing image. Expected path: <code>${escapeHtml(item.imageRelativePath)}</code></p>`
  }
  <h3>Rationale</h3>
  <p>${escapeHtml(item.rationale || "(none)")}</p>
  <h3>Selection notes</h3>
  <p>${escapeHtml(item.selectionNotes)}</p>
  <h3>Prompt</h3>
  <pre>${escapeHtml(item.prompt || "(none)")}</pre>
</section>`
    )
    .join("\n");

  return htmlPage(options.projectName, "Thumbnail Review Board", cards);
}

async function imageReviewItems(options: {
  outputFolder: string;
  projectArg: string;
  scenes: Scene[];
  prompts: Prompt[];
  approvals: ImageApproval[];
}): Promise<ImageReviewItem[]> {
  const sceneByNumber = new Map(options.scenes.map((scene) => [scene.scene_number, scene]));
  const approvalByNumber = new Map(options.approvals.map((approval) => [approval.scene_number, approval]));

  return Promise.all(
    options.prompts.map(async (prompt) => {
      const scene = sceneByNumber.get(prompt.scene_number);
      const approval = approvalByNumber.get(prompt.scene_number);
      const imagePath = path.join(options.outputFolder, "04_images", "full", prompt.image_filename);
      const imageExists = await fs.pathExists(imagePath);

      return {
        sceneNumber: prompt.scene_number,
        status: approval?.status ?? "pending",
        notes: approval?.notes ?? "",
        transcript: scene?.transcript ?? "",
        visualGoal: scene?.visual_goal ?? "",
        prompt: prompt.prompt,
        imageFilename: prompt.image_filename,
        imageRelativePath: `full/${prompt.image_filename}`,
        imageExists,
        mockPlaceholder: await isCurrentMockAsset(imagePath),
        imageDataUri: imageExists ? await imageFileToDataUri(imagePath) : undefined,
        approveCommand: `video-pack approve-images --project ${options.projectArg} --scene ${prompt.scene_number} --status approved`,
        regenCommand: `video-pack approve-images --project ${options.projectArg} --scene ${prompt.scene_number} --status needs-regen --notes "Describe what needs changing"`
      };
    })
  );
}

async function thumbnailReviewItems(options: {
  outputFolder: string;
  prompts: ThumbnailPrompt[];
}): Promise<ThumbnailReviewItem[]> {
  return Promise.all(
    options.prompts.map(async (prompt) => {
      const imagePath = path.join(options.outputFolder, "07_publish", "thumbnails", prompt.image_filename);
      const imageExists = await fs.pathExists(imagePath);

      return {
        thumbnailNumber: prompt.thumbnail_number,
        title: prompt.title,
        rationale: prompt.rationale,
        prompt: prompt.prompt,
        imageFilename: prompt.image_filename,
        imageRelativePath: prompt.image_filename,
        imageExists,
        imageDataUri: imageExists ? await imageFileToDataUri(imagePath) : undefined,
        selectionNotes: "Pick this if it is the clearest promise for the video at feed size."
      };
    })
  );
}

function summarizeStatuses(items: ImageReviewItem[]): Record<string, number> {
  return items.reduce(
    (counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    },
    { pending: 0, approved: 0, rejected: 0, "needs-regen": 0 } as Record<string, number>
  );
}

function htmlPage(projectName: string, title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(projectName)} - ${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; background: #f6f7f9; color: #15171a; }
    main { max-width: 1120px; margin: 0 auto; }
    h1 { margin-bottom: 8px; }
    .card { background: white; border: 1px solid #d8dde6; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .card-header { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .status { border: 1px solid #b8c2cf; border-radius: 999px; padding: 4px 10px; background: #f3f6fa; font-size: 14px; }
    img { display: block; max-width: min(100%, 420px); border-radius: 6px; border: 1px solid #d8dde6; margin: 12px 0; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f3f6fa; border-radius: 6px; padding: 12px; }
    code { background: #f3f6fa; border-radius: 4px; padding: 2px 4px; }
    .missing { color: #7a4b00; }
  </style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p>Project: ${escapeHtml(projectName)}</p>
  ${body}
</main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

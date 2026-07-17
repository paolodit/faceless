import path from "node:path";
import fs from "fs-extra";
import { displayPath, listCreated, listSkipped } from "../lib/files.js";
import type { Scene, StockAssetMediaType, StockAssetProvider } from "../lib/schemas.js";
import { downloadStockAssets, readStockVisualEvents } from "../lib/stock-assets.js";
import { loadValidProject } from "../lib/validation.js";
import { listLocalAssetReferences, writeVisualEventOutputs } from "../lib/visual-events.js";
import { writeProjectBoard } from "../lib/project-board.js";
import {
  getVisualEventAssetState,
  saveVisualEventApprovals,
  writeVisualEventReviewBoards
} from "../lib/visual-event-assets.js";

export async function stockAssetsProjectCommand(
  projectPath: string,
  options: {
    provider?: string;
    media?: string;
    limit?: string;
    force?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  await ensureVisualEvents(projectPath);

  const provider = parseProvider(options.provider ?? project.config.stock_assets.provider);
  const mediaType = parseMediaType(options.media ?? project.config.stock_assets.media_type);
  const limit = options.limit ? Number(options.limit) : project.config.stock_assets.max_assets;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("--limit must be a positive number.");
  }

  const stockEvents = await readStockVisualEvents(project.paths.outputFolder);
  if (stockEvents.length === 0) {
    return `No stock events found.

Run:
video-pack visual-events --project ${displayPath(process.cwd(), project.root) || "."}`;
  }

  const result = await downloadStockAssets({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder,
    config: project.config,
    provider,
    mediaType,
    limit,
    force: options.force,
    dryRun: options.dryRun
  });
  const visualState = await getVisualEventAssetState({ projectRoot: project.root, outputFolder: project.paths.outputFolder });
  const approvalWrite = await saveVisualEventApprovals(
    project.paths.outputFolder,
    visualState.items.map((item) => item.approval)
  );
  const reviewWrites = await writeVisualEventReviewBoards({
    projectName: project.config.project_name,
    projectArg: displayPath(process.cwd(), project.root) || ".",
    outputFolder: project.paths.outputFolder,
    state: visualState
  });
  const boardWrites = await writeProjectBoard(project, { force: true });
  const allWrites = [...result.writes, approvalWrite, ...reviewWrites, ...boardWrites];
  const created = listCreated(allWrites, project.root);
  const skipped = listSkipped(allWrites, project.root);
  const downloaded = result.results.filter((item) => item.status === "downloaded").length;
  const planned = result.results.filter((item) => item.status === "planned").length;
  const failed = result.results.filter((item) => item.status === "failed").length;
  const notFound = result.results.filter((item) => item.status === "not_found").length;

  return `Stock asset ${options.dryRun ? "plan" : "download"} complete.

Provider: ${result.provider}
Media: ${result.mediaType}
Events considered: ${result.results.length}
Downloaded: ${downloaded}
Planned only: ${planned}
Not found: ${notFound}
Failed: ${failed}

Created:
${created.length > 0 ? created.join("\n") : "- none"}

Skipped existing:
${skipped.length > 0 ? skipped.join("\n") : "- none"}

Review:
- output/04_images/events/review_board.html
- output/06_edit_pack/stock_assets/
- output/06_edit_pack/stock_assets/download_report.csv
- output/06_edit_pack/stock_assets/credits.md`;

  async function ensureVisualEvents(displayProjectPath: string): Promise<void> {
    const eventsPath = path.join(project.paths.outputFolder, "06_edit_pack", "visual_events.json");
    if (await fs.pathExists(eventsPath)) {
      return;
    }

    const scenesPath = path.join(project.paths.outputFolder, "02_scenes", "scenes.json");
    if (!(await fs.pathExists(scenesPath))) {
      throw new Error(`Stock asset download needs scenes.

Run:
video-pack prepare --project ${displayProjectPath}
video-pack visual-events --project ${displayProjectPath}`);
    }

    const scenes = (await fs.readJson(scenesPath)) as Scene[];
    const localAssets = await listLocalAssetReferences(project.paths.assetsFolder, project.root);
    await writeVisualEventOutputs({
      projectRoot: project.root,
      outputFolder: project.paths.outputFolder,
      config: project.config,
      scenes,
      localAssets,
      force: false
    });
  }
}

function parseProvider(value: string): StockAssetProvider {
  if (value === "mock" || value === "pexels" || value === "pixabay") {
    return value;
  }

  throw new Error(`Unknown stock provider "${value}". Use mock, pexels or pixabay.`);
}

function parseMediaType(value: string): StockAssetMediaType {
  if (value === "photo" || value === "video") {
    return value;
  }

  throw new Error(`Unknown stock media type "${value}". Use photo or video.`);
}

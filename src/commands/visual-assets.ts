import path from "node:path";
import { displayPath, listCreated, listSkipped, type WriteResult } from "../lib/files.js";
import { generateImageWithMagnific } from "../lib/magnific.js";
import { writeMockPng } from "../lib/mock-png.js";
import { generateImageWithOpenAI } from "../lib/openai.js";
import { normalizeImageProvider } from "../lib/providers.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { loadValidProject } from "../lib/validation.js";
import {
  getVisualEventAssetState,
  saveVisualEventApprovals,
  visualEventFolder,
  writeVisualEventFolders,
  writeVisualEventReviewBoards
} from "../lib/visual-event-assets.js";

export async function visualAssetsCommand(
  projectPath: string,
  options: {
    provider?: string;
    scene?: string;
    event?: string;
    resume?: boolean;
    force?: boolean;
  } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const provider = normalizeImageProvider(options.provider ?? project.config.generation.image_provider);
  const initialState = await getVisualEventAssetState({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder
  });

  if (initialState.expected === 0) {
    await writeProjectBoard(project, { force: true });
    return `No supplemental raster cutaways are planned.

The scene frames, ${initialState.overlays} code-rendered overlays and ${initialState.transitions} transitions are the current visual plan.

Review:
output/NEXT.html`;
  }

  const selected = initialState.items.filter((item) => {
    if (options.scene && item.event.scene_number !== Number(options.scene)) {
      return false;
    }
    if (options.event && item.event.event_id !== options.event) {
      return false;
    }
    if (options.resume && item.assetExists) {
      return false;
    }
    return true;
  });

  if (selected.length === 0) {
    throw new Error("No supplemental visual events matched the requested filter.");
  }

  const writes: WriteResult[] = [];
  writes.push(...(await writeVisualEventFolders({ outputFolder: project.paths.outputFolder, state: initialState })));

  if (provider === "mock") {
    for (const item of selected) {
      const filePath = path.join(
        visualEventFolder(project.paths.outputFolder, item.event.event_id),
        `${path.parse(item.assetFilename).name}.png`
      );
      const written = await writeMockPng({
        filePath,
        aspectRatio: project.config.aspect_ratio,
        sceneNumber: item.event.scene_number,
        start: item.event.start_time,
        end: "CUTAWAY",
        force: options.force
      });
      writes.push({ filePath, written });
    }
  } else if (provider === "openai") {
    for (const item of selected) {
      const result = await generateImageWithOpenAI({
        prompt: item.generationPrompt,
        outputPath: path.join(
          visualEventFolder(project.paths.outputFolder, item.event.event_id),
          item.assetFilename
        ),
        config: project.config,
        force: options.force
      });
      writes.push({ filePath: result.filePath, written: result.written });
    }
  } else if (provider === "magnific") {
    for (const item of selected) {
      const result = await generateImageWithMagnific({
        prompt: item.generationPrompt,
        outputPath: path.join(
          visualEventFolder(project.paths.outputFolder, item.event.event_id),
          item.assetFilename
        ),
        config: project.config,
        force: options.force
      });
      writes.push({ filePath: result.filePath, written: result.written });
    }
  }

  const state = await getVisualEventAssetState({
    projectRoot: project.root,
    outputFolder: project.paths.outputFolder
  });
  writes.push(await saveVisualEventApprovals(project.paths.outputFolder, state.items.map((item) => item.approval)));
  writes.push(
    ...(await writeVisualEventReviewBoards({
      projectName: project.config.project_name,
      projectArg,
      outputFolder: project.paths.outputFolder,
      state
    }))
  );
  writes.push(...(await writeProjectBoard(project, { force: true })));

  const created = listCreated(writes, project.root);
  const skipped = listSkipped(writes, project.root);
  const routeNote =
    provider === "manual" || provider === "external"
      ? "Prompt requests are ready. Use your chosen image or stock source, then save one file inside each event folder."
      : `The ${provider} route produced or refreshed the selected event assets.`;

  return `Supplemental visual asset step ready.

${routeNote}

Coverage:
- ${state.realAvailable}/${state.expected} real raster cutaways present
- ${state.mockPlaceholders} mock placeholders
- ${state.approved}/${state.expected} raster cutaways approved
- ${state.overlays} text/overlay events will be rendered in code
- ${state.transitions} transitions will be rendered in code

Review now:
output/04_images/events/review_board.html

After human review:
video-pack approve-visual-assets --project ${projectArg} --event <event-id> --status approved

Created:
${created.join("\n") || "- none"}

Skipped existing:
${skipped.join("\n") || "- none"}`;
}

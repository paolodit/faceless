import path from "node:path";
import fs from "fs-extra";
import { analyzeProjectCommand } from "./analyze.js";
import { approveImagesCommand } from "./approve-images.js";
import { generateImagesCommand } from "./generate-images.js";
import { packageProjectCommand } from "./pack.js";
import { planProjectCommand } from "./plan.js";
import { prepareProjectCommand } from "./prepare.js";
import { previewProjectCommand } from "./preview.js";
import { proposalProjectCommand } from "./proposal.js";
import { promptsProjectCommand } from "./prompts.js";
import { sceneAssetsCommand } from "./scene-assets.js";
import { visualEventsProjectCommand } from "./visual-events.js";
import { appendDecisionLogEntry } from "../lib/decision-log.js";
import { displayPath } from "../lib/files.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { normalizeImageProvider } from "../lib/providers.js";
import { loadValidProject } from "../lib/validation.js";

type NextAction =
  | "analyze"
  | "plan"
  | "proposal"
  | "prepare"
  | "visual-events"
  | "prompts"
  | "preview"
  | "generate-images"
  | "scene-assets"
  | "approve-images"
  | "package"
  | "done";

interface NextState {
  analysisReady: boolean;
  planReady: boolean;
  proposalReady: boolean;
  scenesReady: boolean;
  visualEventsReady: boolean;
  promptsReady: boolean;
  previewReady: boolean;
  fullImagesReady: boolean;
  sceneAssetsReady: boolean;
  approvalsExist: boolean;
  approvalsReady: boolean;
  packageReady: boolean;
}

export async function nextProjectCommand(
  projectPath: string,
  options: {
    force?: boolean;
    provider?: string;
    allowPaid?: boolean;
    approveAll?: boolean;
  } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const state = await readNextState(project.paths.outputFolder);
  const action = nextAction(state);

  if (action === "done") {
    return `Nothing urgent left in the core route.

Review:
- output/README_NEXT_STEPS.md
- output/08_remotion/README.md

Detailed status:
video-pack status --project ${projectArg}`;
  }

  if (action === "generate-images") {
    const provider = normalizeImageProvider(options.provider ?? project.config.generation.image_provider);
    if ((provider === "openai" || provider === "magnific") && !options.allowPaid) {
      await appendDecisionLogEntry(project.paths.outputFolder, {
        command: "next",
        decision: "Did not run paid image generation automatically",
        reason: `Provider "${provider}" may incur API costs and --allow-paid was not supplied.`,
        context: { provider }
      });
      await writeProjectBoard(project, { force: true });
      return `Next step is image generation with provider "${provider}", which may incur API costs.

I did not run it automatically.

Choose one:
- video-pack next --project ${projectArg} --allow-paid
- video-pack generate-images --project ${projectArg} --provider external
- video-pack generate-images --project ${projectArg} --provider mock

Tip:
Use external/manual for prompt packs, mock for local testing, or --allow-paid when you are ready for API generation.`;
    }

    const label = "Generate or place images";
    const output = await generateImagesCommand(project.root, { force: options.force, provider });
    await logAndRefreshBoard(project, label, action);
    return nextResult(label, output, projectArg);
  }

  if (action === "approve-images" && state.approvalsExist && !state.approvalsReady && !options.approveAll) {
    return `Next step is image review.

Review:
- output/04_images/review_board.md
- output/04_images/review_board.html

Approve one scene:
video-pack approve-images --project ${projectArg} --scene 1 --status approved

Approve everything when the board looks good:
video-pack next --project ${projectArg} --approve-all`;
  }

  const output = await runAction(action, project.root, {
    force: options.force,
    approveAll: options.approveAll
  });
  const label = labelFor(action);
  await logAndRefreshBoard(project, label, action);

  return nextResult(label, output, projectArg);
}

async function logAndRefreshBoard(
  project: Awaited<ReturnType<typeof loadValidProject>>,
  label: string,
  action: NextAction
): Promise<void> {
  await appendDecisionLogEntry(project.paths.outputFolder, {
    command: "next",
    decision: `Ran ${label}`,
    reason: `video-pack next selected "${action}" as the safest incomplete workflow step.`,
    context: {
      pipeline: project.config.pipeline,
      profile: project.config.profile,
      image_provider: project.config.generation.image_provider,
      scene_video_provider: project.config.generation.scene_video_provider
    }
  });
  await writeProjectBoard(project, { force: true });
}

async function runAction(
  action: Exclude<NextAction, "done" | "generate-images">,
  projectPath: string,
  options: { force?: boolean; approveAll?: boolean }
): Promise<string> {
  switch (action) {
    case "analyze":
      return analyzeProjectCommand(projectPath, { force: options.force });
    case "plan":
      return planProjectCommand(projectPath, { force: options.force });
    case "proposal":
      return proposalProjectCommand(projectPath, { force: options.force });
    case "prepare":
      return prepareProjectCommand(projectPath, { force: options.force });
    case "visual-events":
      return visualEventsProjectCommand(projectPath, { force: options.force });
    case "prompts":
      return promptsProjectCommand(projectPath, { force: options.force });
    case "preview":
      return previewProjectCommand(projectPath, { force: options.force, provider: "mock" });
    case "scene-assets":
      return sceneAssetsCommand(projectPath, { force: options.force });
    case "approve-images":
      return approveImagesCommand(projectPath, { approveAll: options.approveAll, force: options.force });
    case "package":
      return packageProjectCommand(projectPath, { force: options.force });
  }
}

function nextResult(label: string, commandOutput: string, projectArg: string): string {
  return `Ran next step: ${label}

${compactOutput(commandOutput)}

To continue:
video-pack next --project ${projectArg}

Project board:
output/BOARD.html`;
}

function compactOutput(output: string): string {
  const lines = output.split(/\r?\n/);
  const maxLines = 36;

  if (lines.length <= maxLines) {
    return output;
  }

  return `${lines.slice(0, 28).join("\n")}

... ${lines.length - 28} more lines hidden by video-pack next.
Run the underlying command directly if you need the full file list.`;
}

function nextAction(state: NextState): NextAction {
  if (!state.analysisReady) {
    return "analyze";
  }

  if (!state.planReady) {
    return "plan";
  }

  if (!state.proposalReady) {
    return "proposal";
  }

  if (!state.scenesReady) {
    return "prepare";
  }

  if (!state.visualEventsReady) {
    return "visual-events";
  }

  if (!state.promptsReady) {
    return "prompts";
  }

  if (!state.previewReady) {
    return "preview";
  }

  if (!state.fullImagesReady) {
    return "generate-images";
  }

  if (!state.sceneAssetsReady) {
    return "scene-assets";
  }

  if (!state.approvalsReady) {
    return "approve-images";
  }

  if (!state.packageReady) {
    return "package";
  }

  return "done";
}

function labelFor(action: NextAction): string {
  switch (action) {
    case "analyze":
      return "Analyze script";
    case "plan":
      return "Estimate scenes and cost";
    case "proposal":
      return "Review production route";
    case "prepare":
      return "Prepare scene timings";
    case "visual-events":
      return "Plan scene production and edit beats";
    case "prompts":
      return "Create image prompts";
    case "preview":
      return "Preview the look";
    case "generate-images":
      return "Generate or place images";
    case "scene-assets":
      return "Organize scene assets";
    case "approve-images":
      return "Approve images";
    case "package":
      return "Package edit files";
    case "done":
      return "Done";
  }
}

async function readNextState(outputFolder: string): Promise<NextState> {
  const scenesReady = await exists(outputFolder, "02_scenes", "scenes.json");
  const promptsReady = await exists(outputFolder, "03_prompts", "prompts.json");
  const visualEventsReady =
    ((await exists(outputFolder, "02_scenes", "visual_events.json")) &&
      (await exists(outputFolder, "06_edit_pack", "overlay_text.csv"))) ||
    promptsReady;
  const sceneAssetsReady = await sceneAssetsComplete(outputFolder);
  const approvals = await readApprovals(outputFolder);
  const approvalsExist = approvals.length > 0;
  const approvalsReady = approvalsExist && approvals.every((approval) => approval.status === "approved");
  const packageOutputsReady = await packageOutputsComplete(outputFolder);

  return {
    analysisReady: await exists(outputFolder, "00_analysis", "content_analysis.md"),
    planReady: await exists(outputFolder, "cost_estimate.json"),
    proposalReady: (await exists(outputFolder, "00_proposal", "proposal.md")) || scenesReady,
    scenesReady,
    visualEventsReady,
    promptsReady,
    previewReady: await folderHasFiles(path.join(outputFolder, "04_images", "preview")),
    fullImagesReady: await folderHasFiles(path.join(outputFolder, "04_images", "full")),
    sceneAssetsReady,
    approvalsExist,
    approvalsReady,
    packageReady: packageOutputsReady && sceneAssetsReady && approvalsReady
  };
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

async function sceneAssetsComplete(outputFolder: string): Promise<boolean> {
  const scenesFolder = path.join(outputFolder, "04_images", "scenes");
  if (!(await fs.pathExists(scenesFolder))) {
    return false;
  }

  const entries = await fs.readdir(scenesFolder);
  return entries.some((entry) => entry.startsWith("scene_"));
}

async function readApprovals(outputFolder: string): Promise<Array<{ status: string }>> {
  const approvalsPath = path.join(outputFolder, "04_images", "approvals.json");
  if (!(await fs.pathExists(approvalsPath))) {
    return [];
  }

  return (await fs.readJson(approvalsPath)) as Array<{ status: string }>;
}

async function packageOutputsComplete(outputFolder: string): Promise<boolean> {
  return (
    (await exists(outputFolder, "05_captions", "captions.srt")) &&
    (await exists(outputFolder, "06_edit_pack", "edit_manifest.csv")) &&
    (await exists(outputFolder, "06_edit_pack", "timelines", "timeline.fcpxml")) &&
    (await exists(outputFolder, "07_publish", "copy_pack.md")) &&
    (await exists(outputFolder, "08_remotion", "package.json")) &&
    (await exists(outputFolder, "README_NEXT_STEPS.md"))
  );
}

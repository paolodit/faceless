import path from "node:path";
import fs from "fs-extra";
import { analyzeProjectCommand } from "./analyze.js";
import { approveImagesCommand } from "./approve-images.js";
import { claimsProjectCommand } from "./claims.js";
import { continuityProjectCommand } from "./continuity.js";
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
import { isClaimReviewCurrent } from "../lib/claims.js";
import { isContinuityReviewCurrent } from "../lib/continuity.js";
import { displayPath } from "../lib/files.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { normalizeImageProvider } from "../lib/providers.js";
import { isRouteQualityReviewCurrent } from "../lib/route-quality.js";
import { loadValidProject } from "../lib/validation.js";
import {
  inspectProjectWorkflowFreshness,
  type ProjectWorkflowFreshness
} from "../lib/workflow-freshness.js";
import {
  getApprovalState,
  getImageAssetState,
  getSceneAssetFolderState,
  readScenePrompts
} from "../lib/workflow-assets.js";

type NextAction =
  | "analyze"
  | "plan"
  | "proposal"
  | "prepare"
  | "claims"
  | "continuity"
  | "visual-events"
  | "prompts"
  | "preview"
  | "generate-images"
  | "await-images"
  | "scene-assets"
  | "approve-images"
  | "package"
  | "done";

interface NextState {
  analysisReady: boolean;
  planReady: boolean;
  proposalReady: boolean;
  scenesReady: boolean;
  claimsReady: boolean;
  continuityReady: boolean;
  visualEventsReady: boolean;
  promptsReady: boolean;
  previewReady: boolean;
  imageAssetsReady: boolean;
  imagePromptPackReady: boolean;
  imageAssetDetail: string;
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
  const scriptText = await fs.readFile(project.paths.scriptFile, "utf8");
  const freshness = await inspectProjectWorkflowFreshness(project);
  const state = await readNextState(
    project.paths.outputFolder,
    project.config,
    scriptText,
    project.characterBible.characters.map((character) => character.name),
    freshness,
    project.config.pipeline === "linkedin-vox-pop",
    project.evidence,
    project.config.pipeline === "narrated-visual-story",
    project.continuity
  );
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

  if (action === "await-images") {
    return `Your prompt pack is ready, but ${state.imageAssetDetail}.

Generate the scene images in your chosen external tool and save each one in:
output/04_images/full/

Use the expected filename from:
output/04_images/full/full_prompts.md

Then continue:
video-pack next --project ${projectArg}`;
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
  action: Exclude<NextAction, "done" | "generate-images" | "await-images">,
  projectPath: string,
  options: { force?: boolean; approveAll?: boolean }
): Promise<string> {
  switch (action) {
    case "analyze":
      return analyzeProjectCommand(projectPath, { force: true });
    case "plan":
      return planProjectCommand(projectPath, { force: true });
    case "proposal":
      return proposalProjectCommand(projectPath, { force: true });
    case "prepare":
      return prepareProjectCommand(projectPath, { force: true });
    case "claims":
      return claimsProjectCommand(projectPath, { force: true });
    case "continuity":
      return continuityProjectCommand(projectPath, { force: true });
    case "visual-events":
      return visualEventsProjectCommand(projectPath, { force: true });
    case "prompts":
      return promptsProjectCommand(projectPath, { force: true });
    case "preview":
      return previewProjectCommand(projectPath, { force: true, provider: "mock" });
    case "scene-assets":
      return sceneAssetsCommand(projectPath, { force: true });
    case "approve-images":
      return approveImagesCommand(projectPath, { approveAll: options.approveAll, force: options.force });
    case "package":
      return packageProjectCommand(projectPath, { force: true });
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

  if (!state.claimsReady) {
    return "claims";
  }

  if (!state.continuityReady) {
    return "continuity";
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

  if (!state.imageAssetsReady && state.imagePromptPackReady) {
    return "await-images";
  }

  if (!state.imageAssetsReady) {
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
    case "claims":
      return "Review LinkedIn claims and support";
    case "continuity":
      return "Review story-world continuity";
    case "visual-events":
      return "Plan scene production and edit beats";
    case "prompts":
      return "Create image prompts";
    case "preview":
      return "Preview scene layout";
    case "generate-images":
      return "Generate or place images";
    case "await-images":
      return "Place generated scene images";
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

async function readNextState(
  outputFolder: string,
  config: Awaited<ReturnType<typeof loadValidProject>>["config"],
  scriptText: string,
  characterNames: string[],
  freshness: ProjectWorkflowFreshness,
  requiresClaims: boolean,
  evidence: Awaited<ReturnType<typeof loadValidProject>>["evidence"],
  requiresContinuity: boolean,
  continuity: Awaited<ReturnType<typeof loadValidProject>>["continuity"]
): Promise<NextState> {
  const scenesReady = freshness.scenes;
  const promptsReady = freshness.prompts;
  const visualEventsReady = freshness.visualEvents || promptsReady;
  const prompts = await readScenePrompts(outputFolder);
  const imageAssets = await getImageAssetState(outputFolder, prompts);
  const approvalState = await getApprovalState(outputFolder, prompts, imageAssets);
  const sceneAssetsReady = (await getSceneAssetFolderState(outputFolder, prompts)).ready;
  const packageOutputsReady = freshness.package;

  return {
    analysisReady:
      (await exists(outputFolder, "00_analysis", "content_analysis.md")) &&
      (await isRouteQualityReviewCurrent({ outputFolder, config, scriptText, characterNames })),
    planReady: freshness.plan,
    proposalReady: freshness.proposal || scenesReady,
    scenesReady,
    claimsReady: !requiresClaims || (await isClaimReviewCurrent({ outputFolder, evidence })),
    continuityReady: !requiresContinuity || (await isContinuityReviewCurrent({ outputFolder, continuity })),
    visualEventsReady,
    promptsReady,
    previewReady: freshness.preview,
    imageAssetsReady: imageAssets.expected > 0 && imageAssets.available === imageAssets.expected,
    imagePromptPackReady: imageAssets.promptPackReady,
    imageAssetDetail: `${imageAssets.available}/${imageAssets.expected} real scene assets available`,
    sceneAssetsReady,
    approvalsExist: approvalState.approved > 0 || approvalState.pending < approvalState.expected,
    approvalsReady: approvalState.ready,
    packageReady: packageOutputsReady && sceneAssetsReady && approvalState.ready
  };
}

async function exists(root: string, ...parts: string[]): Promise<boolean> {
  return fs.pathExists(path.join(root, ...parts));
}

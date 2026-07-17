import path from "node:path";
import fs from "fs-extra";
import { displayPath } from "../lib/files.js";
import { isClaimReviewCurrent } from "../lib/claims.js";
import { isContinuityReviewCurrent } from "../lib/continuity.js";
import { getProductionPipeline } from "../lib/pipelines.js";
import { isRouteQualityReviewCurrent } from "../lib/route-quality.js";
import type { ContinuityFile, EvidenceFile, ProjectConfig } from "../lib/schemas.js";
import { formatValidationFailure, validateProject } from "../lib/validation.js";
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
import { getVisualEventAssetState } from "../lib/visual-event-assets.js";

type WizardGoal = "full" | "images" | "upscale" | "video" | "package";

interface WizardStep {
  label: string;
  done: boolean;
  command: string;
  why: string;
  review?: string;
}

export async function wizardCommand(projectPath?: string, options: { goal?: string } = {}): Promise<string> {
  if (!projectPath) {
    return `video-pack wizard

Fastest first run:
1. video-pack init my-video --type explainer
   or: --type linkedin / --type story
2. Replace my-video/input/script.txt with your spoken script
3. Leave the starter style and character files alone for the first pass
4. video-pack wizard --project ./my-video
5. video-pack next --project ./my-video

The three creator types:
- explainer: short, useful explainers for Shorts, TikTok or LinkedIn
- linkedin: LinkedIn POV, vox-pop and professional explainer videos
- story: narrated visual stories with recurring characters or places

Helpful setup docs:
- docs/QUICKSTART.md
- docs/CHATGPT_SETUP.md
- docs/INPUTS.md`;
  }

  const validation = await validateProject(projectPath);
  if (!validation.valid || !validation.project) {
    return `${formatValidationFailure(validation.issues)}

After fixing validation, run:
video-pack wizard --project ${projectPath}`;
  }

  const project = validation.project;
  const output = project.paths.outputFolder;
  const projectArg = displayPath(process.cwd(), project.root) || ".";
  const goal = normalizeGoal(options.goal);
  const isLinkedIn = project.config.pipeline === "linkedin-vox-pop";
  const isStory = project.config.pipeline === "narrated-visual-story";
  const scriptText = await fs.readFile(project.paths.scriptFile, "utf8");
  const freshness = await inspectProjectWorkflowFreshness(project);
  const state = await readWizardState(
    output,
    project.root,
    project.paths.audioFile,
    project.config,
    scriptText,
    project.characterBible.characters.map((character) => character.name),
    freshness,
    isLinkedIn,
    project.evidence,
    isStory,
    project.continuity
  );
  const steps = wizardSteps(projectArg, state, isLinkedIn, isStory);
  const next = nextStepFor(goal, steps, state, projectArg);
  const completed = steps.filter((step) => step.done).length;
  const usefulFiles = usefulFilesFor(next, state);
  const pipeline = getProductionPipeline(project.config.pipeline);

  return `video-pack wizard

Project: ${project.config.project_name}
Creator type: ${pipeline.title} (${pipeline.name})
Profile: ${project.config.profile}
Goal: ${goal}
Progress: ${completed}/${steps.length} core steps ready

Do this next:
${next.command}

Or let video-pack run the next safe step:
video-pack next --project ${projectArg}

Why:
${next.why}
${next.review ? `\nReview after:\n${next.review}` : ""}

Core route:
${steps.map(formatStep).join("\n")}

Useful files now:
${usefulFiles.map((item) => `- ${item}`).join("\n")}

Optional lanes:
${optionalLanes(projectArg, state).join("\n")}`;
}

function normalizeGoal(raw: string | undefined): WizardGoal {
  if (!raw) {
    return "full";
  }

  if (raw === "full" || raw === "images" || raw === "upscale" || raw === "video" || raw === "package") {
    return raw;
  }

  return "full";
}

function wizardSteps(projectArg: string, state: WizardState, isLinkedIn: boolean, isStory: boolean): WizardStep[] {
  return [
    {
      label: "Analyze script",
      done: state.analysisReady,
      command: `video-pack analyze --project ${projectArg} --force`,
      why: "Check hook, pacing and the structural promise of this specific creator route before making assets.",
      review: "output/00_analysis/route_review.html and output/00_analysis/content_analysis.md"
    },
    {
      label: "Estimate scenes and cost",
      done: state.planReady,
      command: `video-pack plan --project ${projectArg} --force`,
      why: "Get the scene count and cautious cost estimate before generating anything.",
      review: "output/cost_estimate.json"
    },
    {
      label: "Review production route",
      done: state.proposalReady,
      command: `video-pack proposal --project ${projectArg} --force`,
      why: "Confirm the selected creator route, provider path, cost watch and human checkpoints before asset-heavy work.",
      review: "output/00_proposal/proposal.md"
    },
    {
      label: "Add final narration",
      done: state.audioReady,
      command: "Add input/voice.mp3 (or voice.wav, voice.m4a, or voice.aac).",
      why: "Use the final voice delivery before timed scenes so cuts, captions and visual beats land against real audio.",
      review: "input/voice.* and output/01_transcript/audio_info.json"
    },
    {
      label: "Prepare scene timings",
      done: state.scenesReady,
      command: `video-pack prepare --project ${projectArg} --force`,
      why: "Turn the script into timed scenes that every later asset can line up with.",
      review: "output/02_scenes/scenes.md"
    },
    ...(isLinkedIn
      ? [
          {
            label: "Review LinkedIn claims and support",
            done: state.claimsReady,
            command: `video-pack claims --project ${projectArg} --force`,
            why: "Map factual statements to a source, first-hand experience, internal data or a declared editorial opinion before post copy and visuals amplify them.",
            review: "output/00_analysis/claim_review.md"
          }
        ]
      : []),
    ...(isStory
      ? [
          {
            label: "Review story-world continuity",
            done: state.continuityReady,
            command: `video-pack continuity --project ${projectArg} --force`,
            why: "Confirm the recurring world, character and place anchors before prompts or image generation turn a small inconsistency into many assets.",
            review: "output/02_scenes/continuity_review.html"
          }
        ]
      : []),
    {
      label: "Plan scene production and edit beats",
      done: state.visualEventsReady,
      command: `video-pack visual-events --project ${projectArg} --force`,
      why: "Choose scene layouts such as fast-cut, additive-slide, voxpop or montage, then create overlay, cutaway, transition and pacing notes.",
      review: "output/02_scenes/scene_production.html"
    },
    {
      label: "Create image prompts",
      done: state.promptsReady,
      command: `video-pack prompts --project ${projectArg} --force`,
      why: "Convert scenes, style and characters into reusable prompt packs.",
      review: "output/03_prompts/prompts.md"
    },
    {
      label: "Preview scene layout",
      done: state.previewReady,
      command: `video-pack preview --project ${projectArg} --count 5 --provider mock --force`,
      why: "Check scene count, framing and review-board flow with no-cost placeholders. This does not judge real art direction.",
      review: "output/04_images/preview/"
    },
    {
      label: "Place real scene assets",
      done: state.fullImagesReady,
      command: `video-pack generate-images --project ${projectArg}`,
      why: state.imagePromptPackReady
        ? "The prompt pack exists. Save a real image or clip for every scene before approval."
        : "Create the full prompt pack, mock images, or API-generated scene images.",
      review: "output/04_images/full/"
    },
    {
      label: "Organize scene assets",
      done: state.sceneAssetsReady,
      command: `video-pack scene-assets --project ${projectArg} --force`,
      why: "Put each scene's prompt, source image, approval alias, upscales, clips and notes in one folder.",
      review: "output/04_images/scenes/"
    },
    {
      label: "Approve images",
      done: state.approvalsReady,
      command: `video-pack approve-images --project ${projectArg}`,
      why: "Mark what is ready for edit and create the review board.",
      review: "output/04_images/review_board.md"
    },
    {
      label: "Create supporting cutaways",
      done: state.visualAssetsReady,
      command: `video-pack visual-assets --project ${projectArg} --provider external`,
      why: "Produce every planned raster cutaway beyond the primary scene frames. Text overlays and transitions remain code-rendered.",
      review: "output/04_images/events/review_board.html"
    },
    {
      label: "Approve supporting cutaways",
      done: state.visualAssetApprovalsReady,
      command: `video-pack approve-visual-assets --project ${projectArg}`,
      why: "Keep supporting cutaways out of the editor pack until a human has reviewed them.",
      review: "output/04_images/events/review_board.html"
    },
    {
      label: "Package edit files",
      done: state.packageReady,
      command: `video-pack package --project ${projectArg} --force`,
      why: "Create captions, timeline helpers, checklists, copy, and the Remotion draft.",
      review: "output/README_NEXT_STEPS.md"
    }
  ];
}

function nextStepFor(goal: WizardGoal, steps: WizardStep[], state: WizardState, projectArg: string): WizardStep {
  if (goal === "upscale" && state.sceneAssetsReady) {
    return {
      label: "Upscale images",
      done: false,
      command: `video-pack upscale-images --project ${projectArg} --provider manual`,
      why: "Prepare upscaling requests first; switch to --provider magnific when you want the API run.",
      review: "output/04_images/upscale_requests.md"
    };
  }

  if (goal === "video" && state.sceneAssetsReady) {
    return {
      label: "Generate scene videos",
      done: false,
      command: `video-pack generate-scene-videos --project ${projectArg} --provider manual`,
      why: "Prepare scene video requests first; use Magnific for direct API clips or Higgsfield for handoff.",
      review: "output/04_images/scene_video_requests.md"
    };
  }

  if (goal === "images") {
    if (!state.fullImagesReady && state.imagePromptPackReady) {
      return {
        label: "Place real scene assets",
        done: false,
        command: `video-pack next --project ${projectArg}`,
        why: "External/manual prompt files are ready, but real scene assets still need saving in output/04_images/full/.",
        review: "output/04_images/full/full_prompts.md"
      };
    }

    return steps.find((step) => !step.done && step.label !== "Approve images" && step.label !== "Package edit files") ?? {
      label: "Review images",
      done: false,
      command: `video-pack approve-images --project ${projectArg}`,
      why: "Images are present; the next useful move is review and approval.",
      review: "output/04_images/review_board.md"
    };
  }

  if (
    goal === "package" &&
    state.approvalsReady &&
    state.sceneAssetsReady &&
    state.visualAssetApprovalsReady &&
    state.audioReady
  ) {
    return steps.find((step) => step.label === "Package edit files")!;
  }

  return steps.find((step) => !step.done) ?? {
    label: "Review status",
    done: false,
    command: `video-pack status --project ${projectArg}`,
    why: "The core route is ready. Use status for the detailed file-by-file view.",
    review: "output/README_NEXT_STEPS.md"
  };
}

function usefulFilesFor(next: WizardStep, state: WizardState): string[] {
  if (next.review) {
    return [next.review];
  }

  if (state.packageReady) {
    return ["output/README_NEXT_STEPS.md", "output/08_remotion/README.md"];
  }

  if (state.sceneAssetsReady) {
    return ["output/04_images/scenes/", "output/04_images/review_board.md"];
  }

  return ["project.yml", "input/script.txt", "input/style-bible.yml", "input/characters.yml"];
}

function optionalLanes(projectArg: string, state: WizardState): string[] {
  if (!state.fullImagesReady) {
    return [
      state.imagePromptPackReady
        ? "- place external images: save expected filenames from output/04_images/full/full_prompts.md"
        : "- none yet; generate an image prompt pack first"
    ];
  }

  const lanes = [
    `- refresh scene folders: video-pack scene-assets --project ${projectArg} --force`,
    `- upscale requests: video-pack upscale-images --project ${projectArg} --provider manual`,
    `- scene video requests: video-pack generate-scene-videos --project ${projectArg} --provider manual`
  ];

  if (state.sceneAssetsReady) {
    lanes.push(`- Magnific upscale/API video: add --provider magnific`);
    lanes.push(`- Higgsfield handoff: video-pack generate-scene-videos --project ${projectArg} --provider higgsfield`);
  }

  return lanes;
}

function formatStep(step: WizardStep, index: number): string {
  return `${step.done ? "[x]" : "[ ]"} ${index + 1}. ${step.label}`;
}

async function readWizardState(
  outputFolder: string,
  projectRoot: string,
  audioFile: string | undefined,
  config: ProjectConfig,
  scriptText: string,
  characterNames: string[],
  freshness: ProjectWorkflowFreshness,
  requiresClaims: boolean,
  evidence?: EvidenceFile,
  requiresContinuity = false,
  continuity?: ContinuityFile
): Promise<WizardState> {
  const scenesReady = freshness.scenes;
  const prompts = await readScenePrompts(outputFolder);
  const imageAssets = await getImageAssetState(outputFolder, prompts);
  const approvalState = await getApprovalState(outputFolder, prompts, imageAssets);
  const sceneAssetsReady = (await getSceneAssetFolderState(outputFolder, prompts)).ready;
  const packageOutputsReady = freshness.package;
  const visualAssetState = await getVisualEventAssetState({ projectRoot, outputFolder });
  const promptsReady = freshness.prompts;
  const visualEventsReady = freshness.visualEvents || promptsReady;
  const audioReady = Boolean(audioFile && (await fs.pathExists(audioFile)));

  return {
    analysisReady:
      (await exists(outputFolder, "00_analysis", "content_analysis.md")) &&
      (await isRouteQualityReviewCurrent({ outputFolder, config, scriptText, characterNames })),
    planReady: freshness.plan,
    proposalReady: freshness.proposal || scenesReady,
    audioReady,
    scenesReady,
    claimsReady: !requiresClaims || (await isClaimReviewCurrent({ outputFolder, evidence })),
    continuityReady: !requiresContinuity || (await isContinuityReviewCurrent({ outputFolder, continuity })),
    visualEventsReady,
    promptsReady,
    previewReady: freshness.preview,
    fullImagesReady: imageAssets.expected > 0 && imageAssets.realAvailable === imageAssets.expected,
    imagePromptPackReady: imageAssets.promptPackReady,
    sceneAssetsReady,
    approvalsReady: approvalState.ready,
    visualAssetsReady: visualAssetState.expected === 0 || visualAssetState.realAvailable === visualAssetState.expected,
    visualAssetApprovalsReady: visualAssetState.expected === 0 || visualAssetState.approved === visualAssetState.expected,
    packageReady:
      packageOutputsReady &&
      audioReady &&
      sceneAssetsReady &&
      approvalState.ready &&
      (visualAssetState.expected === 0 || visualAssetState.approved === visualAssetState.expected)
  };
}

async function exists(root: string, ...parts: string[]): Promise<boolean> {
  return fs.pathExists(path.join(root, ...parts));
}


interface WizardState {
  analysisReady: boolean;
  planReady: boolean;
  proposalReady: boolean;
  audioReady: boolean;
  scenesReady: boolean;
  claimsReady: boolean;
  continuityReady: boolean;
  visualEventsReady: boolean;
  promptsReady: boolean;
  previewReady: boolean;
  fullImagesReady: boolean;
  imagePromptPackReady: boolean;
  sceneAssetsReady: boolean;
  approvalsReady: boolean;
  visualAssetsReady: boolean;
  visualAssetApprovalsReady: boolean;
  packageReady: boolean;
}

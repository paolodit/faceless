#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { analyzeProjectCommand } from "./commands/analyze.js";
import { approveImagesCommand } from "./commands/approve-images.js";
import { audioInfoProjectCommand } from "./commands/audio-info.js";
import { channelBibleCommand } from "./commands/channel-bible.js";
import { copyProjectCommand } from "./commands/copy.js";
import { exportTimelineCommand } from "./commands/export-timeline.js";
import { generateImagesCommand } from "./commands/generate-images.js";
import { generateThumbnailsCommand } from "./commands/generate-thumbnails.js";
import { guideCommand } from "./commands/guide.js";
import { statusProjectCommand } from "./commands/status.js";
import { stockAssetsProjectCommand } from "./commands/stock-assets.js";
import { initProject } from "./commands/init.js";
import { packageProjectCommand } from "./commands/pack.js";
import { planProjectCommand } from "./commands/plan.js";
import { prepareProjectCommand } from "./commands/prepare.js";
import { previewProjectCommand } from "./commands/preview.js";
import { profilesCommand } from "./commands/profiles.js";
import { promptsProjectCommand } from "./commands/prompts.js";
import { remotionProjectCommand } from "./commands/remotion.js";
import { transcribeProjectCommand } from "./commands/transcribe.js";
import { validateProjectCommand } from "./commands/validate.js";
import { visualEventsProjectCommand } from "./commands/visual-events.js";
import type { ApprovalStatus } from "./lib/schemas.js";

const program = new Command();

program
  .name("video-pack")
  .description("Create editable production packs from narrated video scripts.")
  .version("0.1.0");

program
  .command("init")
  .argument("<project-name>")
  .description("Create a new video-pack project.")
  .action((projectName: string) => run(() => initProject(projectName)));

program
  .command("validate")
  .requiredOption("--project <path>", "Project folder")
  .description("Validate project inputs and config.")
  .action((options: { project: string }) => run(() => validateProjectCommand(options.project)));

program
  .command("profiles")
  .option("--json", "Print profile data as JSON")
  .description("List built-in output profiles.")
  .action((options: { json?: boolean }) => runSync(() => profilesCommand(options)));

program
  .command("channel-bible")
  .argument("<file>")
  .option("--name <name>", "Channel name")
  .option("--force", "Overwrite existing channel bible")
  .description("Create a reusable channel-bible YAML file.")
  .action((file: string, options: { name?: string; force?: boolean }) =>
    run(() => channelBibleCommand(file, options))
  );

program
  .command("status")
  .requiredOption("--project <path>", "Project folder")
  .description("Show pipeline progress and the next useful command.")
  .action((options: { project: string }) => run(() => statusProjectCommand(options.project)));

program
  .command("guide")
  .option("--project <path>", "Project folder")
  .description("Show a friendly workflow guide and recommended next step.")
  .action((options: { project?: string }) => run(() => guideCommand(options.project)));

program
  .command("analyze")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated analysis")
  .description("Analyze hook strength, pacing and platform fit before production.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => analyzeProjectCommand(options.project, options))
  );

program
  .command("audio-info")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated audio info")
  .description("Detect local audio duration and write audio metadata.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => audioInfoProjectCommand(options.project, options))
  );

program
  .command("transcribe")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated transcript files")
  .option("--provider <script|openai>", "Transcription provider")
  .description("Transcribe configured audio into transcript files.")
  .action((options: { project: string; force?: boolean; provider?: string }) =>
    run(() => transcribeProjectCommand(options.project, options))
  );

program
  .command("plan")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated cost estimate")
  .description("Estimate scenes, costs and output files.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => planProjectCommand(options.project, options))
  );

program
  .command("prepare")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated transcript and scenes")
  .description("Create transcript, timestamps and scenes from script text.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => prepareProjectCommand(options.project, options))
  );

program
  .command("visual-events")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated visual event planning files")
  .description("Create visual event, overlay text and stock asset planning files.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => visualEventsProjectCommand(options.project, options))
  );

program
  .command("stock-assets")
  .requiredOption("--project <path>", "Project folder")
  .option("--provider <mock|pexels|pixabay>", "Stock provider")
  .option("--media <photo|video>", "Stock media type")
  .option("--limit <number>", "Maximum stock events to download")
  .option("--dry-run", "Write the plan and reports without downloading assets")
  .option("--force", "Overwrite existing downloaded stock assets")
  .description("Optionally download free stock assets from planned stock search events.")
  .action(
    (options: {
      project: string;
      provider?: string;
      media?: string;
      limit?: string;
      dryRun?: boolean;
      force?: boolean;
    }) => run(() => stockAssetsProjectCommand(options.project, options))
  );

program
  .command("prompts")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated prompts")
  .option("--provider <manual|external|mock|openai>", "Provider to stamp on prompt records")
  .description("Create image prompts from scenes, style and characters.")
  .action((options: { project: string; force?: boolean; provider?: string }) =>
    run(() => promptsProjectCommand(options.project, options))
  );

program
  .command("preview")
  .requiredOption("--project <path>", "Project folder")
  .option("--count <number>", "Number of prompt/images to prepare")
  .option("--force", "Overwrite generated preview files")
  .option("--provider <manual|external|mock|openai>", "Provider for preview")
  .description("Prepare a preview batch.")
  .action((options: { project: string; count?: string; force?: boolean; provider?: string }) =>
    run(() => previewProjectCommand(options.project, options))
  );

program
  .command("generate-images")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated image files")
  .option("--resume", "Continue missing images")
  .option("--scene <numbers>", "Specific scene number(s), comma-separated")
  .option("--from-scene <number>", "Start from this scene number")
  .option("--provider <manual|external|mock|openai>", "Provider for generation")
  .description("Prepare or generate full image set.")
  .action(
    (options: {
      project: string;
      force?: boolean;
      resume?: boolean;
      scene?: string;
      fromScene?: string;
      provider?: string;
    }) => run(() => generateImagesCommand(options.project, options))
  );

program
  .command("generate-thumbnails")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated thumbnail files")
  .option("--provider <manual|external|mock|openai>", "Provider for thumbnail generation")
  .description("Generate or prepare thumbnail assets from thumbnail prompts.")
  .action((options: { project: string; force?: boolean; provider?: string }) =>
    run(() => generateThumbnailsCommand(options.project, options))
  );

program
  .command("approve-images")
  .requiredOption("--project <path>", "Project folder")
  .option("--scene <number>", "Scene number to update")
  .option("--status <pending|approved|rejected|needs-regen>", "Approval status")
  .option("--notes <text>", "Review notes")
  .option("--approve-all", "Mark all prompt images approved")
  .description("Create or update the image approval sheet.")
  .action(
    (options: {
      project: string;
      scene?: string;
      status?: ApprovalStatus;
      notes?: string;
      approveAll?: boolean;
    }) => run(() => approveImagesCommand(options.project, options))
  );

program
  .command("package")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated package files")
  .description("Create captions, edit manifest, Remotion draft, run report and next-step guide.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => packageProjectCommand(options.project, options))
  );

program
  .command("remotion")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated Remotion files and copied assets")
  .description("Create an optional Remotion preview/render project from scenes, assets and visual events.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => remotionProjectCommand(options.project, options))
  );

program
  .command("export-timeline")
  .requiredOption("--project <path>", "Project folder")
  .option("--format <all|premiere|davinci|fcpxml|capcut>", "Timeline export format")
  .option("--force", "Overwrite generated timeline files")
  .description("Export timeline helper files for Premiere, DaVinci Resolve, FCPXML, or CapCut assembly.")
  .action((options: { project: string; format?: "all" | "premiere" | "davinci" | "fcpxml" | "capcut"; force?: boolean }) =>
    run(() => exportTimelineCommand(options.project, options))
  );

program
  .command("copy")
  .requiredOption("--project <path>", "Project folder")
  .option("--force", "Overwrite generated copy pack")
  .description("Generate richer title, description and platform post copy.")
  .action((options: { project: string; force?: boolean }) =>
    run(() => copyProjectCommand(options.project, options))
  );

await program.parseAsync(process.argv);

async function run(action: () => Promise<string>): Promise<void> {
  try {
    console.log(await action());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function runSync(action: () => string): void {
  try {
    console.log(action());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

import path from "node:path";
import fs from "fs-extra";
import { ZodError } from "zod";
import {
  ASPECT_RATIOS,
  IMAGE_PROVIDERS,
  PROFILE_NAMES,
  PRODUCTION_PIPELINES,
  SCENE_VIDEO_PROVIDERS,
  type AspectRatio,
  type ImageProvider,
  type ProfileName,
  type SceneVideoProvider
} from "./constants.js";
import { displayPath, readYamlFile, resolveProjectFile } from "./files.js";
import { normalizeProductionPipelineName } from "./pipelines.js";
import { getProfile, listProfileNames, suggestProfileName, type OutputProfile } from "./profiles.js";
import {
  characterBibleSchema,
  channelBibleSchema,
  continuityFileSchema,
  evidenceFileSchema,
  projectConfigSchema,
  styleBibleSchema,
  type CharacterBible,
  type ChannelBible,
  type ContinuityFile,
  type EvidenceFile,
  type ProjectConfig,
  type StyleBible
} from "./schemas.js";

export interface ValidationIssue {
  message: string;
  suggestion?: string;
}

export interface LoadedProject {
  root: string;
  config: ProjectConfig;
  profile: OutputProfile;
  styleBible: StyleBible;
  characterBible: CharacterBible;
  channelBible?: ChannelBible;
  evidence?: EvidenceFile;
  continuity?: ContinuityFile;
  paths: {
    projectFile: string;
    scriptFile: string;
    audioFile?: string;
    styleBible: string;
    characterBible: string;
    channelBible?: string;
    evidenceFile?: string;
    continuityFile?: string;
    assetsFolder: string;
    outputFolder: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  project?: LoadedProject;
}

export async function validateProject(projectPath: string): Promise<ValidationResult> {
  const root = path.resolve(projectPath);
  const projectFile = path.join(root, "project.yml");
  const issues: ValidationIssue[] = [];

  if (!(await fs.pathExists(root))) {
    return {
      valid: false,
      issues: [
        {
          message: `Project folder does not exist:\n${projectPath}`,
          suggestion: "Create it with:\nvideo-pack init my-project"
        }
      ]
    };
  }

  if (!(await fs.pathExists(projectFile))) {
    return {
      valid: false,
      issues: [
        {
          message: "Could not find project.yml.",
          suggestion: "Run this from a video-pack project or create one with:\nvideo-pack init my-project"
        }
      ]
    };
  }

  let rawConfig: unknown;
  try {
    rawConfig = await readYamlFile(projectFile);
  } catch (error) {
    return {
      valid: false,
      issues: [{ message: `Could not read project.yml:\n${messageFrom(error)}` }]
    };
  }

  const parsedConfig = projectConfigSchema.safeParse(rawConfig);
  if (!parsedConfig.success) {
    issues.push(...zodIssues("project.yml", parsedConfig.error));
    return { valid: false, issues };
  }

  const config = parsedConfig.data;
  const normalizedPipeline = normalizeProductionPipelineName(config.pipeline);

  if (!isProfileName(config.profile)) {
    issues.push(unknownProfileIssue(config.profile));
  }

  if (!normalizedPipeline) {
    issues.push({
      message: `Unknown creator type: "${config.pipeline}"`,
      suggestion: `Valid creator types:\n${PRODUCTION_PIPELINES.map((pipeline) => `- ${pipeline}`).join("\n")}`
    });
  }

  if (!isAspectRatio(config.aspect_ratio)) {
    issues.push({
      message: `Unknown aspect ratio: "${config.aspect_ratio}"`,
      suggestion: `Valid aspect ratios:\n${ASPECT_RATIOS.map((ratio) => `- ${ratio}`).join("\n")}`
    });
  }

  if (!isImageProvider(config.generation.image_provider)) {
    issues.push({
      message: `Unknown image provider: "${config.generation.image_provider}"`,
      suggestion: `Valid providers:\n${IMAGE_PROVIDERS.map((provider) => `- ${provider}`).join("\n")}`
    });
  }

  if (!isSceneVideoProvider(config.generation.scene_video_provider)) {
    issues.push({
      message: `Unknown scene video provider: "${config.generation.scene_video_provider}"`,
      suggestion: `Valid providers:\n${SCENE_VIDEO_PROVIDERS.map((provider) => `- ${provider}`).join("\n")}`
    });
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const typedConfig = { ...config, pipeline: normalizedPipeline! } as ProjectConfig;
  const scriptFile = resolveProjectFile(root, typedConfig.input.script_file);
  const audioFile = typedConfig.input.audio_file
    ? resolveProjectFile(root, typedConfig.input.audio_file)
    : await findConventionalAudioFile(root);
  const styleFile = resolveProjectFile(root, typedConfig.input.style_bible);
  const characterFile = resolveProjectFile(root, typedConfig.input.character_bible);
  const channelFile = typedConfig.input.channel_bible
    ? resolveProjectFile(root, typedConfig.input.channel_bible)
    : undefined;
  const evidenceFile = typedConfig.input.evidence_file
    ? resolveProjectFile(root, typedConfig.input.evidence_file)
    : undefined;
  const continuityFile = typedConfig.input.continuity_file
    ? resolveProjectFile(root, typedConfig.input.continuity_file)
    : undefined;
  const assetsFolder = path.join(root, "input", "assets");
  const outputFolder = resolveProjectFile(root, typedConfig.output.folder);

  if (!(await fs.pathExists(scriptFile))) {
    issues.push({
      message: `Could not find script file:\n${displayPath(root, scriptFile)}`,
      suggestion: `Add a script file or update project.yml:\n\ninput:\n  script_file: "./path/to/script.txt"`
    });
  }

  if (audioFile && !(await fs.pathExists(audioFile))) {
    issues.push({
      message: `Could not find audio file:\n${displayPath(root, audioFile)}`,
      suggestion: `Add the audio file or leave audio_file blank in project.yml:\n\ninput:\n  audio_file: ""`
    });
  }

  if (!(await fs.pathExists(styleFile))) {
    issues.push({
      message: `Could not find style bible:\n${displayPath(root, styleFile)}`,
      suggestion: `Create the file or update project.yml:\n\ninput:\n  style_bible: "./input/style-bible.yml"`
    });
  }

  if (!(await fs.pathExists(characterFile))) {
    issues.push({
      message: `Could not find character bible:\n${displayPath(root, characterFile)}`,
      suggestion: `Create the file or update project.yml:\n\ninput:\n  character_bible: "./input/characters.yml"`
    });
  }

  if (channelFile && !(await fs.pathExists(channelFile))) {
    issues.push({
      message: `Could not find channel bible:\n${displayPath(root, channelFile)}`,
      suggestion: `Create the file or update project.yml:\n\ninput:\n  channel_bible: "./input/channel-bible.yml"`
    });
  }

  if (evidenceFile && !(await fs.pathExists(evidenceFile))) {
    issues.push({
      message: `Could not find evidence file:\n${displayPath(root, evidenceFile)}`,
      suggestion: `Add the file or leave evidence_file blank in project.yml:\n\ninput:\n  evidence_file: ""`
    });
  }

  if (continuityFile && !(await fs.pathExists(continuityFile))) {
    issues.push({
      message: `Could not find continuity file:\n${displayPath(root, continuityFile)}`,
      suggestion: `Add the file or leave continuity_file blank in project.yml:\n\ninput:\n  continuity_file: ""`
    });
  }

  let styleBible: StyleBible | undefined;
  if (await fs.pathExists(styleFile)) {
    try {
      styleBible = styleBibleSchema.parse(await readYamlFile(styleFile));
    } catch (error) {
      issues.push(...schemaReadIssues("style bible", error));
    }
  }

  let characterBible: CharacterBible | undefined;
  if (await fs.pathExists(characterFile)) {
    try {
      characterBible = characterBibleSchema.parse(await readYamlFile(characterFile));
    } catch (error) {
      issues.push(...schemaReadIssues("character bible", error));
    }
  }

  let channelBible: ChannelBible | undefined;
  if (channelFile && (await fs.pathExists(channelFile))) {
    try {
      channelBible = channelBibleSchema.parse(await readYamlFile(channelFile));
    } catch (error) {
      issues.push(...schemaReadIssues("channel bible", error));
    }
  }

  let evidence: EvidenceFile | undefined;
  if (evidenceFile && (await fs.pathExists(evidenceFile))) {
    try {
      evidence = evidenceFileSchema.parse(await readYamlFile(evidenceFile));
    } catch (error) {
      issues.push(...schemaReadIssues("evidence file", error));
    }
  }

  let continuity: ContinuityFile | undefined;
  if (continuityFile && (await fs.pathExists(continuityFile))) {
    try {
      continuity = continuityFileSchema.parse(await readYamlFile(continuityFile));
    } catch (error) {
      issues.push(...schemaReadIssues("continuity file", error));
    }
  }

  try {
    await fs.ensureDir(outputFolder);
  } catch (error) {
    issues.push({
      message: `Could not create output folder:\n${displayPath(root, outputFolder)}`,
      suggestion: messageFrom(error)
    });
  }

  if (issues.length > 0 || !styleBible || !characterBible) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    project: {
      root,
      config: typedConfig,
      profile: getProfile(typedConfig.profile)!,
      styleBible,
      characterBible,
      channelBible,
      evidence,
      continuity,
      paths: {
        projectFile,
        scriptFile,
        audioFile,
        styleBible: styleFile,
        characterBible: characterFile,
        channelBible: channelFile,
        evidenceFile,
        continuityFile,
        assetsFolder,
        outputFolder
      }
    }
  };
}

async function findConventionalAudioFile(root: string): Promise<string | undefined> {
  const candidates = ["voice.mp3", "voice.wav", "voice.m4a", "voice.aac"].map((filename) =>
    path.join(root, "input", filename)
  );
  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export async function loadValidProject(projectPath: string): Promise<LoadedProject> {
  const result = await validateProject(projectPath);
  if (!result.valid || !result.project) {
    throw new Error(formatValidationFailure(result.issues));
  }

  return result.project;
}

export function formatValidationFailure(issues: ValidationIssue[]): string {
  const lines = ["Validation failed.", ""];
  issues.forEach((issue, index) => {
    lines.push(`${index + 1}. ${issue.message}`);
    if (issue.suggestion) {
      lines.push("");
      lines.push("Suggested fix:");
      lines.push("");
      lines.push(issue.suggestion);
    }
    if (index < issues.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\n");
}

function zodIssues(context: string, error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    message: `Missing or invalid field in ${context}:\n${issue.path.join(".") || "(root)"}`,
    suggestion: issue.message
  }));
}

function schemaReadIssues(context: string, error: unknown): ValidationIssue[] {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => {
      const field = issue.path.join(".");
      if (context === "style bible" && field === "visual_style.medium") {
        return {
          message: `Your style bible is missing:\n\n${field}`,
          suggestion: `visual_style:\n  medium: "simple hand-drawn cartoon"`
        };
      }

      return {
        message: `Missing or invalid field in ${context}:\n${field || "(root)"}`,
        suggestion: issue.message
      };
    });
  }

  return [{ message: `Could not read ${context}:\n${messageFrom(error)}` }];
}

function unknownProfileIssue(profile: string): ValidationIssue {
  const suggestion = suggestProfileName(profile);
  const suggestionLines = suggestion ? [`Did you mean:`, suggestion, ""] : [];

  return {
    message: `Unknown profile: "${profile}"`,
    suggestion: [...suggestionLines, "Valid profiles:", ...listProfileNames().map((name) => `- ${name}`)].join("\n")
  };
}

function isProfileName(value: string): value is ProfileName {
  return (PROFILE_NAMES as readonly string[]).includes(value);
}

function isAspectRatio(value: string): value is AspectRatio {
  return (ASPECT_RATIOS as readonly string[]).includes(value);
}

function isImageProvider(value: string): value is ImageProvider {
  return (IMAGE_PROVIDERS as readonly string[]).includes(value);
}

function isSceneVideoProvider(value: string): value is SceneVideoProvider {
  return (SCENE_VIDEO_PROVIDERS as readonly string[]).includes(value);
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

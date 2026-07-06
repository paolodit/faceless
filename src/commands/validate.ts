import { displayPath } from "../lib/files.js";
import { formatValidationFailure, validateProject } from "../lib/validation.js";

export async function validateProjectCommand(projectPath: string): Promise<string> {
  const result = await validateProject(projectPath);

  if (!result.valid || !result.project) {
    throw new Error(formatValidationFailure(result.issues));
  }

  const project = result.project;
  return `Validation passed.

Project: ${project.config.project_name}
Profile: ${project.config.profile}
Image provider: ${project.config.generation.image_provider}
Scene video provider: ${project.config.generation.scene_video_provider}
Script: ${displayPath(project.root, project.paths.scriptFile)}
Style bible: ${displayPath(project.root, project.paths.styleBible)}
Characters: ${displayPath(project.root, project.paths.characterBible)}
Channel bible: ${project.paths.channelBible ? displayPath(project.root, project.paths.channelBible) : "(none)"}

Next step:
video-pack analyze --project ${projectPath}`;
}

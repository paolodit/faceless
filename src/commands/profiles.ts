import { profiles } from "../lib/profiles.js";

export function profilesCommand(options: { json?: boolean } = {}): string {
  const values = Object.values(profiles);

  if (options.json) {
    return JSON.stringify(values, null, 2);
  }

  return `Available profiles

${values
  .map(
    (profile) => `## ${profile.name}
Aspect ratio: ${profile.aspectRatio}
Scene timing: ${profile.minSceneSeconds}-${profile.maxSceneSeconds}s, target ${profile.targetSceneSeconds}s
Recommended length: ${profile.recommendedLengthSeconds.min}-${profile.recommendedLengthSeconds.max}s
Captions: ${profile.captionStyle}
Guidance: ${profile.guidance}`
  )
  .join("\n\n")}

Use one in project.yml:

profile: "tiktok"`;
}

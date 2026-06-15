import path from "node:path";
import { writeTextFile } from "../lib/files.js";
import { slugifyName } from "../lib/format.js";

export async function channelBibleCommand(
  filePath: string,
  options: { name?: string; force?: boolean } = {}
): Promise<string> {
  const resolved = path.resolve(process.cwd(), filePath);
  const name = options.name ?? (slugifyName(path.basename(filePath, path.extname(filePath))) || "my-channel");
  const result = await writeTextFile(resolved, channelBibleTemplate(name), options);

  return `${result.written ? "Created" : "Skipped existing"} channel bible:
${resolved}

Use it in project.yml:

input:
  channel_bible: "${filePath.replace(/\\/g, "/")}"`;
}

function channelBibleTemplate(name: string): string {
  return `channel_name: ${JSON.stringify(name)}
audience: "specific audience this channel serves"
platform_priorities:
  - "tiktok"
  - "youtube-shorts"

voice:
  tone: "clear, useful, distinctive"
  point_of_view: "first person narrator"
  pacing: "strong hook, clean middle, memorable payoff"

content_pillars:
  - "pillar one"
  - "pillar two"
  - "pillar three"

recurring_formats:
  - "repeatable format one"
  - "repeatable format two"

publishing:
  default_cta: "Follow for more."
  description_boilerplate: ""
  hashtags:
    - "#shorts"

prompt_rules:
  always_include:
    - "single clear focal point"
  avoid:
    - "busy composition"
    - "small unreadable text"
  thumbnail_rules:
    - "strong simple silhouette"
  title_rules:
    - "specific tension"
`;
}

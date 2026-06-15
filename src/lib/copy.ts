import type { ChannelBible, Scene } from "./schemas.js";

export interface CopyPack {
  project_name: string;
  profile: string;
  core_promise: string;
  payoff: string;
  title_options: string[];
  short_description: string;
  long_description: string;
  platform_posts: Record<string, string>;
  hashtags: string[];
}

export function createCopyPack(
  projectName: string,
  profile: string,
  scenes: Scene[],
  channelBible?: ChannelBible,
  titleCount = 8
): CopyPack {
  const opening = scenes[0]?.transcript ?? "";
  const payoff = scenes.at(-1)?.transcript ?? "";
  const tension = cleanSentence(opening);
  const cta = channelBible?.publishing.default_cta ?? "Follow for more.";
  const hashtags = channelBible?.publishing.hashtags ?? [];
  const titles = unique([
    tension,
    `${tension} (then this happened)`,
    `The tiny problem hiding in ${keyword(tension)}`,
    `I thought this would be simple`,
    `Why ${keyword(tension)} feels bigger than it is`,
    `${projectName}: ${tension}`,
    `The part nobody tells you about ${keyword(tension)}`,
    `A small reminder about ${keyword(tension)}`
  ])
    .filter(Boolean)
    .slice(0, titleCount)
    .map((title) => shorten(title, 76));

  const shortDescription = `${opening} ${cta}`.trim();
  const boilerplate = channelBible?.publishing.description_boilerplate;
  const longDescription = [
    opening,
    payoff && payoff !== opening ? `\nPayoff: ${payoff}` : "",
    boilerplate ? `\n${boilerplate}` : "",
    cta ? `\n${cta}` : "",
    hashtags.length > 0 ? `\n${hashtags.join(" ")}` : ""
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  return {
    project_name: projectName,
    profile,
    core_promise: opening,
    payoff,
    title_options: titles,
    short_description: shortDescription,
    long_description: longDescription,
    platform_posts: {
      tiktok: `${shorten(opening, 120)}\n\n${hashtags.join(" ")}`.trim(),
      "youtube-shorts": `${shorten(titles[0] ?? projectName, 80)}\n\n${shortDescription}`,
      "youtube-long": `${titles[0] ?? projectName}\n\n${longDescription}`,
      "linkedin-video": linkedinPost(opening, payoff, cta, hashtags)
    },
    hashtags
  };
}

export function copyPackToMarkdown(pack: CopyPack): string {
  return `# Copy Pack

Project: ${pack.project_name}
Profile: ${pack.profile}

## Core Promise

${pack.core_promise || "(Add a clear opening promise.)"}

## Payoff

${pack.payoff || "(Add a clear payoff.)"}

## Title Options

${pack.title_options.map((title) => `- ${title}`).join("\n")}

## Short Description

${pack.short_description}

## Long Description

${pack.long_description}

## Platform Posts

${Object.entries(pack.platform_posts)
  .map(([platform, post]) => `### ${platform}\n\n${post || "(empty)"}`)
  .join("\n\n")}
`;
}

function linkedinPost(opening: string, payoff: string, cta: string, hashtags: string[]): string {
  return [
    opening,
    "",
    payoff && payoff !== opening ? `The useful bit: ${payoff}` : "",
    "",
    cta,
    "",
    hashtags.join(" ")
  ]
    .filter((part) => part !== undefined)
    .join("\n")
    .trim();
}

function cleanSentence(value: string): string {
  return shorten(value.replace(/[.!?]+$/g, "").trim(), 82);
}

function keyword(value: string): string {
  const words = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

  return words.slice(0, 3).join(" ") || "this";
}

function shorten(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 3).trim()}...`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

const STOP_WORDS = new Set([
  "this",
  "that",
  "then",
  "with",
  "about",
  "from",
  "today",
  "going",
  "thought",
  "would",
  "could",
  "should"
]);

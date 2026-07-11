import type { ProductionPipelineName } from "./constants.js";
import type { ClaimReview } from "./claims.js";
import type { ChannelBible, Scene } from "./schemas.js";

export interface CopyPack {
  project_name: string;
  profile: string;
  creator_type: ProductionPipelineName;
  publishing_angle: string;
  title_direction: string;
  review_checks: string[];
  source_review?: {
    status: ClaimReview["status"];
    summary: string;
    warnings: string[];
    review_file: string;
  };
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
  titleCount = 8,
  creatorType: ProductionPipelineName = "narrated-explainer",
  claimReview?: ClaimReview
): CopyPack {
  const opening = scenes[0]?.transcript ?? "";
  const payoff = scenes.at(-1)?.transcript ?? "";
  const tension = cleanSentence(opening);
  const topic = keyword(tension);
  const route = copyRoute(creatorType);
  const cta = channelBible?.publishing.default_cta ?? "Follow for more.";
  const hashtags = channelBible?.publishing.hashtags ?? [];
  const titles = routeTitles(creatorType, projectName, tension, topic)
    .filter(Boolean)
    .slice(0, titleCount)
    .map((title) => shorten(title, 76));
  const shortDescription = route.shortDescription(opening, payoff, cta);
  const boilerplate = channelBible?.publishing.description_boilerplate;
  const longDescription = [
    route.longDescription(opening, payoff),
    boilerplate,
    cta,
    hashtags.length > 0 ? hashtags.join(" ") : ""
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    project_name: projectName,
    profile,
    creator_type: creatorType,
    publishing_angle: route.publishingAngle,
    title_direction: route.titleDirection,
    review_checks: route.reviewChecks,
    source_review:
      creatorType === "linkedin-vox-pop" && claimReview
        ? {
            status: claimReview.status,
            summary: claimReviewSummary(claimReview),
            warnings: claimReview.publishing_warnings,
            review_file: "output/00_analysis/claim_review.md"
          }
        : undefined,
    core_promise: opening,
    payoff,
    title_options: titles,
    short_description: shortDescription,
    long_description: longDescription,
    platform_posts: {
      tiktok: route.shortPost(opening, payoff, cta, hashtags),
      "youtube-shorts": `${shorten(titles[0] ?? projectName, 80)}\n\n${shortDescription}`,
      "youtube-long": `${titles[0] ?? projectName}\n\n${longDescription}`,
      "linkedin-video": linkedinPost(creatorType, opening, payoff, cta, hashtags)
    },
    hashtags
  };
}

export function copyPackToMarkdown(pack: CopyPack): string {
  return `# Copy Pack

Project: ${pack.project_name}
Profile: ${pack.profile}
Creator type: ${pack.creator_type}

## Publishing Angle

${pack.publishing_angle}

## Title Direction

${pack.title_direction}

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

${pack.source_review ? `## Source Review

Status: **${pack.source_review.status}**

${pack.source_review.summary}

${pack.source_review.warnings.length > 0 ? pack.source_review.warnings.map((warning) => `- ${warning}`).join("\n") : "- No unresolved mapping or support warnings."}

Review: \`${pack.source_review.review_file}\`

` : ""}## Review Before Posting

${pack.review_checks.map((check) => `- ${check}`).join("\n")}
`;
}

function claimReviewSummary(review: ClaimReview): string {
  const { summary } = review;
  return `${summary.supported_claims} source-backed claim card${plural(summary.supported_claims)}, ${summary.declared_claims} declared-support claim card${plural(summary.declared_claims)}, and ${summary.scenes_unmapped} unmapped factual scene statement${plural(summary.scenes_unmapped)}.`;
}

function plural(count: number): string {
  return count === 1 ? "" : "s";
}

interface CopyRoute {
  publishingAngle: string;
  titleDirection: string;
  reviewChecks: string[];
  shortDescription: (opening: string, payoff: string, cta: string) => string;
  longDescription: (opening: string, payoff: string) => string;
  shortPost: (opening: string, payoff: string, cta: string, hashtags: string[]) => string;
}

function copyRoute(creatorType: ProductionPipelineName): CopyRoute {
  if (creatorType === "linkedin-vox-pop") {
    return {
      publishingAngle: "Lead with a credible point of view, then make the practical implication easy to repeat.",
      titleDirection: "Make one clear professional claim. Prefer useful tension over vague inspiration.",
      reviewChecks: [
        "Rewrite the LinkedIn post in your own voice before publishing.",
        "Check every claim, example and statistic against a source or lived experience.",
        "Make the first written line add context rather than repeat the opening frame."
      ],
      shortDescription: (opening, payoff, cta) => `${opening}\n\nThe practical point: ${payoff || opening}\n\n${cta}`.trim(),
      longDescription: (opening, payoff) =>
        [opening, payoff && payoff !== opening ? `The practical takeaway: ${payoff}` : ""].filter(Boolean).join("\n\n"),
      shortPost: (opening, payoff, cta, hashtags) =>
        [
          opening,
          payoff && payoff !== opening ? `The point: ${payoff}` : "",
          "Worth keeping in mind before the next decision.",
          cta,
          hashtags.join(" ")
        ]
          .filter(Boolean)
          .join("\n\n")
    };
  }

  if (creatorType === "narrated-visual-story") {
    return {
      publishingAngle: "Invite people into a specific world, then let the final image or turn carry the emotional payoff.",
      titleDirection: "Name the story, place, character or turning point. Keep it evocative but grounded in the actual video.",
      reviewChecks: [
        "Choose a title that promises the same feeling as the first and final scenes.",
        "Check the thumbnail or first frame recognisably belongs to this story world.",
        "Keep character and place names consistent between the video, caption and description."
      ],
      shortDescription: (opening, payoff, cta) => `${opening}\n\n${payoff || "Stay for the turn."}\n\n${cta}`.trim(),
      longDescription: (opening, payoff) =>
        [
          opening,
          payoff && payoff !== opening ? `A short visual story that lands here: ${payoff}` : ""
        ]
          .filter(Boolean)
          .join("\n\n"),
      shortPost: (opening, payoff, cta, hashtags) =>
        [opening, payoff && payoff !== opening ? payoff : "", cta, hashtags.join(" ")]
          .filter(Boolean)
          .join("\n\n")
    };
  }

  return {
    publishingAngle: "Make one useful idea clear quickly, then state the takeaway in plain language.",
    titleDirection: "Name the question, problem or misconception the viewer will understand by the end.",
    reviewChecks: [
      "Make sure the title and first frame promise the same useful idea.",
      "Check that the written caption adds a takeaway instead of repeating the script.",
      "Remove any title wording that the video cannot genuinely support."
    ],
    shortDescription: (opening, payoff, cta) => `${opening}\n\nThe takeaway: ${payoff || opening}\n\n${cta}`.trim(),
    longDescription: (opening, payoff) =>
      [opening, payoff && payoff !== opening ? `By the end: ${payoff}` : ""].filter(Boolean).join("\n\n"),
    shortPost: (opening, payoff, cta, hashtags) =>
      [opening, payoff && payoff !== opening ? `The takeaway: ${payoff}` : "", cta, hashtags.join(" ")]
        .filter(Boolean)
        .join("\n\n")
  };
}

function routeTitles(
  creatorType: ProductionPipelineName,
  projectName: string,
  tension: string,
  topic: string
): string[] {
  if (creatorType === "linkedin-vox-pop") {
    return unique([
      `Most teams miss this about ${topic}`,
      `Before your next decision: ${tension}`,
      `A clearer way to think about ${topic}`,
      `The professional cost of getting ${topic} wrong`,
      `${projectName}: ${tension}`,
      `The useful question behind ${topic}`,
      `Why ${topic} deserves a better conversation`,
      tension
    ]);
  }

  if (creatorType === "narrated-visual-story") {
    return unique([
      tension,
      `A short story about ${topic}`,
      `The moment ${topic} changed everything`,
      `A small story with a big ${topic} turn`,
      `${projectName}: ${tension}`,
      `Inside ${projectName}`,
      `What happened after ${topic}`,
      `A place, a person and ${topic}`
    ]);
  }

  return unique([
    tension,
    `What ${topic} actually means`,
    `The simple truth about ${topic}`,
    `A clearer way to think about ${topic}`,
    `${projectName}: ${tension}`,
    `The part nobody tells you about ${topic}`,
    `Why ${topic} feels bigger than it is`,
    `The useful takeaway on ${topic}`
  ]);
}

function linkedinPost(
  creatorType: ProductionPipelineName,
  opening: string,
  payoff: string,
  cta: string,
  hashtags: string[]
): string {
  if (creatorType === "linkedin-vox-pop") {
    return [
      opening,
      payoff && payoff !== opening ? `The useful point: ${payoff}` : "",
      "What would you change after seeing it this way?",
      cta,
      hashtags.join(" ")
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (creatorType === "narrated-visual-story") {
    return [
      opening,
      payoff && payoff !== opening ? `The turn: ${payoff}` : "",
      "Some stories make their point better through a scene than a slogan.",
      cta,
      hashtags.join(" ")
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    opening,
    payoff && payoff !== opening ? `The takeaway: ${payoff}` : "",
    "A useful idea is only useful when people can act on it.",
    cta,
    hashtags.join(" ")
  ]
    .filter(Boolean)
    .join("\n\n");
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

  return words.sort((left, right) => right.length - left.length)[0] || "this";
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

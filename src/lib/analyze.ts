import { countWords } from "./format.js";
import { estimateProductionPlan } from "./plan.js";
import type { OutputProfile } from "./profiles.js";
import type { ProjectConfig } from "./schemas.js";
import { splitScriptIntoBeats } from "./script.js";

export interface AnalysisCheck {
  label: string;
  status: "pass" | "watch" | "needs-work";
  detail: string;
}

export interface BeatAnalysis {
  beat_number: number;
  text: string;
  word_count: number;
  estimated_seconds: number;
}

export interface ContentAnalysis {
  project_name: string;
  profile: string;
  aspect_ratio: string;
  script_words: number;
  estimated_duration_seconds: number;
  estimated_scenes: number;
  hook: {
    text: string;
    word_count: number;
    estimated_seconds: number;
    target_seconds: number;
    status: AnalysisCheck["status"];
  };
  platform_fit: {
    status: AnalysisCheck["status"];
    notes: string[];
  };
  checks: AnalysisCheck[];
  recommendations: string[];
  beats: BeatAnalysis[];
}

export function analyzeContent(
  config: ProjectConfig,
  profile: OutputProfile,
  scriptText: string
): ContentAnalysis {
  const plan = estimateProductionPlan(config, profile, scriptText);
  const wordsPerMinute = config.generation.words_per_minute;
  const hookTargetSeconds = hookTargetForProfile(profile.name);
  const beats = splitScriptIntoBeats(scriptText, {
    targetSceneSeconds:
      config.generation.scene_duration_target_seconds ?? profile.targetSceneSeconds,
    minSceneSeconds: config.generation.min_scene_duration_seconds ?? profile.minSceneSeconds,
    maxSceneSeconds: config.generation.max_scene_duration_seconds ?? profile.maxSceneSeconds,
    wordsPerMinute,
    primaryCharacter: "Main Character"
  }).map((beat, index) => ({
    beat_number: index + 1,
    text: beat,
    word_count: countWords(beat),
    estimated_seconds: secondsForWords(countWords(beat), wordsPerMinute)
  }));

  const hookText = firstSentenceOrBeat(scriptText, beats[0]?.text ?? "");
  const hookWordCount = countWords(hookText);
  const hookSeconds = secondsForWords(hookWordCount, wordsPerMinute);
  const hookStatus: AnalysisCheck["status"] =
    hookSeconds <= hookTargetSeconds ? "pass" : hookSeconds <= hookTargetSeconds + 1.5 ? "watch" : "needs-work";
  const checks = buildChecks(config, profile, plan.estimatedDurationSeconds, plan.estimatedScenes, hookSeconds);
  const platformStatus = combineStatuses(checks.map((check) => check.status));
  const recommendations = buildRecommendations(config, profile, checks, beats);

  return {
    project_name: config.project_name,
    profile: config.profile,
    aspect_ratio: config.aspect_ratio,
    script_words: plan.scriptWords,
    estimated_duration_seconds: plan.estimatedDurationSeconds,
    estimated_scenes: plan.estimatedScenes,
    hook: {
      text: hookText,
      word_count: hookWordCount,
      estimated_seconds: hookSeconds,
      target_seconds: hookTargetSeconds,
      status: hookStatus
    },
    platform_fit: {
      status: platformStatus,
      notes: checks.map((check) => `${check.label}: ${check.detail}`)
    },
    checks,
    recommendations,
    beats
  };
}

export function analysisToMarkdown(analysis: ContentAnalysis): string {
  const checks = analysis.checks
    .map((check) => `| ${check.label} | ${check.status} | ${check.detail} |`)
    .join("\n");
  const recommendations = analysis.recommendations.map((item) => `- ${item}`).join("\n");
  const beats = analysis.beats
    .map(
      (beat) =>
        `| ${beat.beat_number} | ${beat.word_count} | ${beat.estimated_seconds}s | ${escapeCell(
          beat.text
        )} |`
    )
    .join("\n");

  return `# Content Analysis

Project: ${analysis.project_name}
Profile: ${analysis.profile}
Aspect ratio: ${analysis.aspect_ratio}

## Summary

- Script words: ${analysis.script_words}
- Estimated duration: ${analysis.estimated_duration_seconds}s
- Estimated scenes: ${analysis.estimated_scenes}
- Platform fit: ${analysis.platform_fit.status}

## Hook

Target: first ${analysis.hook.target_seconds}s

Status: ${analysis.hook.status}

Opening line:

${analysis.hook.text || "(empty)"}

Estimated hook length: ${analysis.hook.estimated_seconds}s

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Recommendations

${recommendations || "- No major issues found. Move to prepare and keep the manual review loop."}

## Beat Map

| Beat | Words | Est. seconds | Text |
| --- | ---: | ---: | --- |
${beats || "| - | - | - | No beats found. |"}
`;
}

function buildChecks(
  config: ProjectConfig,
  profile: OutputProfile,
  duration: number,
  scenes: number,
  hookSeconds: number
): AnalysisCheck[] {
  const checks: AnalysisCheck[] = [];
  const hookTarget = hookTargetForProfile(profile.name);

  checks.push({
    label: "Opening hook",
    status: hookSeconds <= hookTarget ? "pass" : hookSeconds <= hookTarget + 1.5 ? "watch" : "needs-work",
    detail:
      hookSeconds <= hookTarget
        ? `Opening thought fits inside the ${hookTarget}s hook window.`
        : `Opening thought is about ${hookSeconds}s; tighten the premise toward ${hookTarget}s.`
  });

  checks.push({
    label: "Platform length",
    status:
      duration >= profile.recommendedLengthSeconds.min && duration <= profile.recommendedLengthSeconds.max
        ? "pass"
        : duration === 0
          ? "needs-work"
          : "watch",
    detail: `Estimated ${duration}s. Recommended range is ${profile.recommendedLengthSeconds.min}-${profile.recommendedLengthSeconds.max}s.`
  });

  checks.push({
    label: "Scene density",
    status: scenes <= maxSceneCountForProfile(profile.name) ? "pass" : "watch",
    detail: `${scenes} estimated scenes against a comfortable limit of ${maxSceneCountForProfile(profile.name)}.`
  });

  checks.push({
    label: "Visual pacing",
    status: minSceneSeconds(config, profile) <= maxSceneSeconds(config, profile) ? "pass" : "needs-work",
    detail: `Scene timing range is ${minSceneSeconds(config, profile)}-${maxSceneSeconds(config, profile)}s.`
  });

  checks.push({
    label: "Generation cost visibility",
    status: config.costs.image_cost_per_generation >= 0 ? "pass" : "needs-work",
    detail: `${config.costs.currency} ${config.costs.image_cost_per_generation.toFixed(2)} per image configured.`
  });

  return checks;
}

function buildRecommendations(
  config: ProjectConfig,
  profile: OutputProfile,
  checks: AnalysisCheck[],
  beats: BeatAnalysis[]
): string[] {
  const recommendations: string[] = [];
  const byLabel = new Map(checks.map((check) => [check.label, check]));

  if (byLabel.get("Opening hook")?.status !== "pass") {
    recommendations.push(
      `Move the clearest tension or payoff into the first ${hookTargetForProfile(profile.name)} seconds.`
    );
  }

  if (byLabel.get("Platform length")?.status !== "pass") {
    recommendations.push(
      `Adjust script length toward ${profile.recommendedLengthSeconds.min}-${profile.recommendedLengthSeconds.max} seconds for ${profile.name}.`
    );
  }

  if (byLabel.get("Scene density")?.status !== "pass") {
    recommendations.push("Combine adjacent beats or reduce image count before generating the full set.");
  }

  if (profile.name === "linkedin-video") {
    recommendations.push("Make the first sentence useful without sound; LinkedIn viewers often skim before committing.");
  }

  if (profile.name === "tiktok" || profile.name === "youtube-shorts") {
    recommendations.push("Check the first frame as a thumbnail: one obvious idea, no tiny text, high contrast.");
  }

  if (beats.length <= 2 && countWords(beats.map((beat) => beat.text).join(" ")) > 40) {
    recommendations.push("Break long paragraphs into shorter narrated beats for easier visual variation.");
  }

  if (config.generation.image_provider === "manual") {
    recommendations.push("Run a manual preview first and only generate the full set once the style bible is behaving.");
  }

  return [...new Set(recommendations)];
}

function hookTargetForProfile(profileName: string): number {
  switch (profileName) {
    case "tiktok":
      return 2;
    case "youtube-shorts":
      return 3;
    case "linkedin-video":
      return 4;
    case "youtube-long":
    default:
      return 15;
  }
}

function maxSceneCountForProfile(profileName: string): number {
  switch (profileName) {
    case "tiktok":
    case "youtube-shorts":
      return 20;
    case "linkedin-video":
      return 28;
    case "youtube-long":
    default:
      return 180;
  }
}

function minSceneSeconds(config: ProjectConfig, profile: OutputProfile): number {
  return config.generation.min_scene_duration_seconds ?? profile.minSceneSeconds;
}

function maxSceneSeconds(config: ProjectConfig, profile: OutputProfile): number {
  return config.generation.max_scene_duration_seconds ?? profile.maxSceneSeconds;
}

function firstSentenceOrBeat(scriptText: string, fallback: string): string {
  const match = scriptText.trim().match(/[^.!?]+[.!?]+|[^.!?]+$/);
  return (match?.[0] ?? fallback).trim();
}

function secondsForWords(words: number, wordsPerMinute: number): number {
  if (words === 0) {
    return 0;
  }

  return Math.round((words / (wordsPerMinute / 60)) * 10) / 10;
}

function combineStatuses(statuses: AnalysisCheck["status"][]): AnalysisCheck["status"] {
  if (statuses.includes("needs-work")) {
    return "needs-work";
  }

  if (statuses.includes("watch")) {
    return "watch";
  }

  return "pass";
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

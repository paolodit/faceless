import { createHash } from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import { escapeMarkdownTableCell } from "./format.js";
import { writeJsonFile, writeTextFile, type WriteResult } from "./files.js";
import type { ContinuityCharacter, ContinuityFile, ContinuityLocation, Prompt, Scene } from "./schemas.js";

export type ContinuitySceneStatus = "ready" | "needs-attention";
export type PromptCoverageStatus = "not-generated" | "covered" | "missing";

export interface ContinuitySceneReview {
  scene_number: number;
  transcript: string;
  score: number;
  status: ContinuitySceneStatus;
  character_anchors: string[];
  location_anchors: string[];
  prompt_coverage: PromptCoverageStatus;
  warnings: string[];
}

export interface ContinuityReview {
  status: "ready" | "needs-attention";
  input_fingerprint: string;
  continuity_file?: string;
  world?: ContinuityFile["world"];
  summary: {
    scenes: number;
    ready_scenes: number;
    scenes_needing_attention: number;
    average_score: number;
    prompts_checked: number;
    prompts_missing_anchors: number;
  };
  warnings: string[];
  scene_checks: ContinuitySceneReview[];
}

export interface ContinuityWriteResult {
  review: ContinuityReview;
  writes: WriteResult[];
}

export function continuityContextForScene(continuity: ContinuityFile | undefined, scene: Scene): string[] {
  if (!continuity) {
    return [];
  }

  const characters = matchingCharacters(continuity, scene);
  const locations = matchingLocations(continuity, scene);

  return [
    `Story world: ${continuity.world.name}; setting: ${continuity.world.setting_anchor}`,
    `World visual constants: ${continuity.world.visual_constants.join(", ")}`,
    ...characters.map((character) => `Character continuity: ${character.name}: ${character.visual_anchor}`),
    ...locations.map((location) => `Location continuity: ${location.name}: ${location.visual_anchor}`)
  ];
}

export function createContinuityReview(options: {
  scenes: Scene[];
  continuity?: ContinuityFile;
  prompts?: Prompt[];
  continuityFile?: string;
}): ContinuityReview {
  const promptByScene = new Map((options.prompts ?? []).map((prompt) => [prompt.scene_number, prompt]));
  const sceneChecks = options.scenes.map((scene) => reviewScene(scene, options.continuity, promptByScene.get(scene.scene_number)));
  const promptsChecked = sceneChecks.filter((scene) => scene.prompt_coverage !== "not-generated").length;
  const promptsMissingAnchors = sceneChecks.filter((scene) => scene.prompt_coverage === "missing").length;
  const summary = {
    scenes: sceneChecks.length,
    ready_scenes: sceneChecks.filter((scene) => scene.status === "ready").length,
    scenes_needing_attention: sceneChecks.filter((scene) => scene.status === "needs-attention").length,
    average_score: sceneChecks.length
      ? Math.round(sceneChecks.reduce((total, scene) => total + scene.score, 0) / sceneChecks.length)
      : 0,
    prompts_checked: promptsChecked,
    prompts_missing_anchors: promptsMissingAnchors
  };
  const warnings = reviewWarnings(summary, options.continuity, options.continuityFile);

  return {
    status: warnings.length === 0 ? "ready" : "needs-attention",
    input_fingerprint: continuityFingerprint(options.scenes, options.continuity, options.prompts),
    continuity_file: options.continuityFile,
    world: options.continuity?.world,
    summary,
    warnings,
    scene_checks: sceneChecks
  };
}

export async function writeContinuityReview(options: {
  projectName: string;
  outputFolder: string;
  scenes: Scene[];
  continuity?: ContinuityFile;
  continuityFile?: string;
  prompts?: Prompt[];
  force?: boolean;
}): Promise<ContinuityWriteResult> {
  const review = createContinuityReview({
    scenes: options.scenes,
    continuity: options.continuity,
    prompts: options.prompts,
    continuityFile: options.continuityFile
  });
  const folder = path.join(options.outputFolder, "02_scenes");
  const writes = await Promise.all([
    writeJsonFile(path.join(folder, "continuity_review.json"), review, { force: options.force }),
    writeTextFile(path.join(folder, "continuity_review.md"), continuityReviewToMarkdown(options.projectName, review), {
      force: options.force
    }),
    writeTextFile(path.join(folder, "continuity_review.html"), continuityReviewToHtml(options.projectName, review), {
      force: options.force
    })
  ]);

  return { review, writes };
}

export async function isContinuityReviewCurrent(options: {
  outputFolder: string;
  continuity?: ContinuityFile;
}): Promise<boolean> {
  if (!options.continuity) {
    return false;
  }

  const scenesPath = path.join(options.outputFolder, "02_scenes", "scenes.json");
  const promptsPath = path.join(options.outputFolder, "03_prompts", "prompts.json");
  const reviewPath = path.join(options.outputFolder, "02_scenes", "continuity_review.json");
  if (!(await fs.pathExists(scenesPath)) || !(await fs.pathExists(reviewPath))) {
    return false;
  }

  const hasPrompts = await fs.pathExists(promptsPath);
  const [scenes, prompts, review] = await Promise.all([
    fs.readJson(scenesPath) as Promise<Scene[]>,
    hasPrompts ? (fs.readJson(promptsPath) as Promise<Prompt[]>) : Promise.resolve([]),
    fs.readJson(reviewPath) as Promise<ContinuityReview>
  ]);
  return review.input_fingerprint === continuityFingerprint(scenes, options.continuity, prompts);
}

export function continuityReviewToMarkdown(projectName: string, review: ContinuityReview): string {
  const warningList = review.warnings.length > 0
    ? review.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- No planning or prompt-anchor warnings.";
  const sceneRows = review.scene_checks
    .map(
      (scene) =>
        `| ${scene.scene_number} | ${scene.score}/100 | ${scene.status} | ${escapeMarkdownTableCell(scene.character_anchors.join(", ") || "-")} | ${escapeMarkdownTableCell(scene.location_anchors.join(", ") || "-")} | ${scene.prompt_coverage} | ${escapeMarkdownTableCell(scene.warnings.join(" ") || "-")} |`
    )
    .join("\n");

  return `# Continuity Review

Project: ${projectName}
Status: **${review.status}**
Continuity file: ${review.continuity_file || "not configured"}

This checks story-world planning and generated prompt coverage. It cannot inspect generated pixels, so use the image review board for the final visual judgement.

## World Anchor

${review.world ? `- Name: ${review.world.name}\n- Setting: ${review.world.setting_anchor}\n- Visual constants: ${review.world.visual_constants.join("; ")}` : "- No continuity file is configured."}

## Warnings

${warningList}

## Summary

| Scenes | Ready | Need attention | Average score | Prompts checked | Prompts missing anchors |
| --- | --- | --- | --- | --- | --- |
| ${review.summary.scenes} | ${review.summary.ready_scenes} | ${review.summary.scenes_needing_attention} | ${review.summary.average_score}/100 | ${review.summary.prompts_checked} | ${review.summary.prompts_missing_anchors} |

## Scene Checks

| Scene | Score | Review | Character anchors | Location anchors | Prompt coverage | Warnings |
| --- | --- | --- | --- | --- | --- |
${sceneRows || "| - | - | - | - | - | - | No scenes prepared yet. |"}

## Next Move

1. Edit the continuity file to add explicit \`scene_numbers\` for recurring characters or locations.
2. Run \`video-pack continuity --project . --force\` after scene or prompt changes.
3. Review \`output/04_images/review_board.html\` after asset generation for the final visual continuity check.
`;
}

function continuityReviewToHtml(projectName: string, review: ContinuityReview): string {
  const warnings = review.warnings.length > 0
    ? `<ul>${review.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
    : "<p>No planning or prompt-anchor warnings.</p>";
  const rows = review.scene_checks
    .map(
      (scene) => `<article class="scene ${scene.status}">
  <div class="scene-head"><h2>Scene ${scene.scene_number}</h2><span>${scene.score}/100</span></div>
  <p><strong>Characters:</strong> ${escapeHtml(scene.character_anchors.join(", ") || "none")}</p>
  <p><strong>Locations:</strong> ${escapeHtml(scene.location_anchors.join(", ") || "none")}</p>
  <p><strong>Prompt coverage:</strong> ${escapeHtml(scene.prompt_coverage)}</p>
  ${scene.warnings.length > 0 ? `<ul>${scene.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : "<p class=\"ok\">Ready for image review.</p>"}
</article>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Continuity Review</title>
  <style>
    :root { --bg:#f6f8fb; --panel:#fff; --text:#17202f; --muted:#5f6c7b; --line:#d9e0ea; --accent:#116466; --warn:#9a4d00; --ok:#1f7a4d; }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--text); font-family:Inter,ui-sans-serif,system-ui,sans-serif; line-height:1.5; }
    main { width:min(1100px,calc(100% - 32px)); margin:0 auto; padding:28px 0 48px; } h1,h2,p { margin:0; } h1 { font-size:34px; line-height:1.1; } h2 { font-size:17px; } .muted { color:var(--muted); } .summary,.scene { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:14px; } .summary { margin:20px 0; } .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; } .scene-head { display:flex; justify-content:space-between; gap:12px; align-items:start; } .scene-head span { background:#e7f2f2; color:var(--accent); border-radius:999px; padding:3px 8px; font-size:12px; white-space:nowrap; } .scene.needs-attention .scene-head span { background:#fff4e5; color:var(--warn); } .scene p { margin-top:7px; color:var(--muted); font-size:14px; } ul { margin:8px 0 0 18px; padding:0; } .ok { color:var(--ok)!important; } @media (max-width:600px) { main { width:min(100% - 20px,1100px); padding-top:18px; } }
  </style>
</head>
<body>
  <main>
    <h1>Continuity Review</h1>
    <p class="muted">${escapeHtml(projectName)} | ${escapeHtml(review.status)} | planning and prompt coverage, not pixel inspection</p>
    <section class="summary">
      <h2>World</h2>
      <p>${escapeHtml(review.world ? `${review.world.name}: ${review.world.setting_anchor}` : "No continuity file configured.")}</p>
      <h2 style="margin-top:16px">Warnings</h2>
      ${warnings}
    </section>
    <section class="grid">
      ${rows || "<p>No scenes prepared yet.</p>"}
    </section>
  </main>
</body>
</html>`;
}

function reviewScene(
  scene: Scene,
  continuity: ContinuityFile | undefined,
  prompt: Prompt | undefined
): ContinuitySceneReview {
  if (!continuity) {
    return {
      scene_number: scene.scene_number,
      transcript: scene.transcript,
      score: 0,
      status: "needs-attention",
      character_anchors: [],
      location_anchors: [],
      prompt_coverage: "not-generated",
      warnings: ["No continuity file is configured for this visual-story project."]
    };
  }

  const characters = matchingCharacters(continuity, scene);
  const locations = matchingLocations(continuity, scene);
  const expectedAnchors = [
    continuity.world.setting_anchor,
    ...continuity.world.visual_constants,
    ...characters.map((character) => character.visual_anchor),
    ...locations.map((location) => location.visual_anchor)
  ];
  const warnings: string[] = [];
  let score = 60;

  if (characters.length > 0) {
    score += 20;
  }
  if (locations.length > 0) {
    score += 20;
  }
  if (characters.length === 0 && locations.length === 0) {
    warnings.push("No named character or location anchor is mapped to this scene; it may drift from the established story world.");
  }

  let promptCoverage: PromptCoverageStatus = "not-generated";
  if (prompt) {
    const missingAnchors = expectedAnchors.filter((anchor) => !promptContainsAnchor(prompt.prompt, anchor));
    promptCoverage = missingAnchors.length === 0 ? "covered" : "missing";
    if (missingAnchors.length > 0) {
      score -= Math.min(40, missingAnchors.length * 10);
      warnings.push(`Prompt is missing continuity anchor${missingAnchors.length === 1 ? "" : "s"}: ${missingAnchors.join("; ")}`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    scene_number: scene.scene_number,
    transcript: scene.transcript,
    score,
    status: warnings.length === 0 ? "ready" : "needs-attention",
    character_anchors: characters.map((character) => character.name),
    location_anchors: locations.map((location) => location.name),
    prompt_coverage: promptCoverage,
    warnings
  };
}

function matchingCharacters(continuity: ContinuityFile, scene: Scene): ContinuityCharacter[] {
  return continuity.characters.filter((character) => anchorMatchesScene(character.name, character.scene_numbers, scene));
}

function matchingLocations(continuity: ContinuityFile, scene: Scene): ContinuityLocation[] {
  return continuity.locations.filter((location) => anchorMatchesScene(location.name, location.scene_numbers, scene));
}

function anchorMatchesScene(name: string, sceneNumbers: number[], scene: Scene): boolean {
  if (sceneNumbers.includes(scene.scene_number)) {
    return true;
  }

  const text = `${scene.transcript} ${scene.visual_goal}`.toLowerCase();
  const terms = meaningfulTerms(name);
  return terms.length > 0 && terms.every((term) => text.includes(term));
}

function promptContainsAnchor(prompt: string, anchor: string): boolean {
  return prompt.toLowerCase().includes(anchor.toLowerCase());
}

function continuityFingerprint(scenes: Scene[], continuity: ContinuityFile | undefined, prompts: Prompt[] | undefined): string {
  const input = {
    scenes: scenes.map((scene) => ({ scene_number: scene.scene_number, transcript: scene.transcript, visual_goal: scene.visual_goal })),
    continuity: continuity ?? null,
    prompts: (prompts ?? []).map((prompt) => ({ scene_number: prompt.scene_number, prompt: prompt.prompt }))
  };
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function reviewWarnings(
  summary: ContinuityReview["summary"],
  continuity: ContinuityFile | undefined,
  continuityFile: string | undefined
): string[] {
  const warnings: string[] = [];
  if (!continuityFile || !continuity) {
    warnings.push("No continuity file is configured. Add input/continuity.yml before generating story assets.");
  }
  if (summary.scenes_needing_attention > 0) {
    warnings.push(`${summary.scenes_needing_attention} scene${summary.scenes_needing_attention === 1 ? " needs" : "s need"} continuity attention.`);
  }
  if (summary.prompts_missing_anchors > 0) {
    warnings.push(`${summary.prompts_missing_anchors} prompt${summary.prompts_missing_anchors === 1 ? " is" : "s are"} missing expected continuity anchors.`);
  }
  return warnings;
}

function meaningfulTerms(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const STOP_WORDS = new Set(["the", "and", "for", "with", "from", "same", "story", "setting", "place"]);

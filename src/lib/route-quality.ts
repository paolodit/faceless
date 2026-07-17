import { createHash } from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import type { ProductionPipelineName } from "./constants.js";
import { writeJsonFile, writeTextFile, type WriteResult } from "./files.js";
import { getProductionPipeline } from "./pipelines.js";
import type { ProjectConfig } from "./schemas.js";

export type RouteQualityStatus = "ready" | "needs-review";
export type RouteCheckStatus = "pass" | "watch" | "needs-work";

export interface RouteQualityCheck {
  id: string;
  label: string;
  status: RouteCheckStatus;
  detail: string;
  evidence: string;
  suggestion: string;
}

export interface RouteBeat {
  beat_number: number;
  role: string;
  text: string;
}

export interface RouteQualityReview {
  pipeline: ProductionPipelineName;
  pipeline_title: string;
  status: RouteQualityStatus;
  score: number;
  input_fingerprint: string;
  route_promise: string;
  checks: RouteQualityCheck[];
  beat_map: RouteBeat[];
  human_questions: string[];
  rewrite_priorities: string[];
  note: string;
}

export interface RouteQualityWriteResult {
  review: RouteQualityReview;
  writes: WriteResult[];
}

interface ReviewContext {
  pipeline: ProductionPipelineName;
  profile: string;
  scriptText: string;
  characterNames?: string[];
}

export function createRouteQualityReview(context: ReviewContext): RouteQualityReview {
  const script = context.scriptText.trim();
  const paragraphs = splitParagraphs(context.scriptText);
  const pipeline = getProductionPipeline(context.pipeline);
  const checks = checksForRoute(context, script, paragraphs);
  const score = checks.reduce((total, check) => total + checkScore(check.status), 0);
  const rewritePriorities = checks
    .filter((check) => check.status !== "pass")
    .sort((a, b) => checkScore(a.status) - checkScore(b.status))
    .map((check) => check.suggestion);

  return {
    pipeline: context.pipeline,
    pipeline_title: pipeline.title,
    status: checks.some((check) => check.status === "needs-work") || score < 70 ? "needs-review" : "ready",
    score,
    input_fingerprint: routeQualityFingerprint(
      context.pipeline,
      context.profile,
      context.scriptText,
      context.characterNames
    ),
    route_promise: pipeline.summary,
    checks,
    beat_map: beatMapForRoute(context.pipeline, paragraphs),
    human_questions: humanQuestions(context.pipeline),
    rewrite_priorities: rewritePriorities,
    note: "This is a transparent structural heuristic, not a judgement of truth, originality, humour or emotional impact. Use the questions and evidence to make the final editorial decision."
  };
}

export async function writeRouteQualityReview(options: ReviewContext & {
  projectName: string;
  outputFolder: string;
  force?: boolean;
}): Promise<RouteQualityWriteResult> {
  const review = createRouteQualityReview(options);
  const folder = path.join(options.outputFolder, "00_analysis");
  const writes = await Promise.all([
    writeJsonFile(path.join(folder, "route_review.json"), review, { force: options.force }),
    writeTextFile(path.join(folder, "route_review.md"), routeQualityToMarkdown(options.projectName, review), {
      force: options.force
    }),
    writeTextFile(path.join(folder, "route_review.html"), routeQualityToHtml(options.projectName, review), {
      force: options.force
    })
  ]);

  return { review, writes };
}

export async function isRouteQualityReviewCurrent(options: {
  outputFolder: string;
  config: ProjectConfig;
  scriptText: string;
  characterNames?: string[];
}): Promise<boolean> {
  const reviewPath = path.join(options.outputFolder, "00_analysis", "route_review.json");
  if (!(await fs.pathExists(reviewPath))) {
    return false;
  }

  const review = (await fs.readJson(reviewPath)) as RouteQualityReview;
  return review.input_fingerprint === routeQualityFingerprint(
    options.config.pipeline,
    options.config.profile,
    options.scriptText,
    options.characterNames
  );
}

export function routeQualityToMarkdown(projectName: string, review: RouteQualityReview): string {
  const checkRows = review.checks
    .map(
      (check) =>
        `| ${check.label} | ${check.status} | ${escapeCell(check.detail)} | ${escapeCell(check.evidence || "-")} |`
    )
    .join("\n");
  const beats = review.beat_map
    .map((beat) => `| ${beat.beat_number} | ${beat.role} | ${escapeCell(beat.text)} |`)
    .join("\n");

  return `# Route Review

Project: ${projectName}
Creator type: ${review.pipeline_title} (${review.pipeline})
Status: **${review.status}**
Score: **${review.score}/100**

## Creator Promise

${review.route_promise}

## Structural Checks

| Check | Status | What the heuristic found | Script evidence |
| --- | --- | --- | --- |
${checkRows}

## Rewrite Priorities

${review.rewrite_priorities.length > 0 ? review.rewrite_priorities.map((item) => `- ${item}`).join("\n") : "- No structural rewrite priority detected. Read the human questions before moving on."}

## Beat Map

| Beat | Suggested role | Script text |
| --- | --- | --- |
${beats}

## Human Questions

${review.human_questions.map((question) => `- [ ] ${question}`).join("\n")}

## Honest Limit

${review.note}
`;
}

function routeQualityToHtml(projectName: string, review: RouteQualityReview): string {
  const checks = review.checks
    .map(
      (check) => `<article class="check ${check.status}">
  <div class="check-head"><h2>${escapeHtml(check.label)}</h2><span>${escapeHtml(check.status)}</span></div>
  <p>${escapeHtml(check.detail)}</p>
  <p class="evidence"><strong>Evidence:</strong> ${escapeHtml(check.evidence || "No clear signal found.")}</p>
  ${check.status === "pass" ? "" : `<p class="suggestion"><strong>Try:</strong> ${escapeHtml(check.suggestion)}</p>`}
</article>`
    )
    .join("\n");
  const beats = review.beat_map
    .map(
      (beat) => `<article class="beat"><span>Beat ${beat.beat_number}</span><strong>${escapeHtml(beat.role)}</strong><p>${escapeHtml(beat.text)}</p></article>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(projectName)} Route Review</title>
  <style>
    :root { --bg:#f6f7f9; --panel:#fff; --text:#17202f; --muted:#5f6c7b; --line:#d9e0e8; --accent:#116466; --ok:#1f7a4d; --watch:#8a5a00; --bad:#a73535; }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--text); font-family:Inter,ui-sans-serif,system-ui,sans-serif; line-height:1.5; }
    main { width:min(1120px,calc(100% - 32px)); margin:0 auto; padding:28px 0 48px; } h1,h2,p { margin:0; } h1 { font-size:34px; line-height:1.1; letter-spacing:0; } h2 { font-size:16px; }
    .lede { color:var(--muted); margin-top:8px; max-width:760px; } .summary { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; } .pill { border:1px solid var(--line); background:var(--panel); border-radius:999px; padding:5px 9px; font-size:13px; }
    .section-title { margin:28px 0 12px; font-size:20px; } .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:10px; } .check,.beat,.questions { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:13px; }
    .check-head { display:flex; justify-content:space-between; gap:12px; align-items:start; } .check-head span { font-size:12px; font-weight:700; text-transform:uppercase; color:var(--ok); } .check.watch .check-head span { color:var(--watch); } .check.needs-work .check-head span { color:var(--bad); }
    .check p,.beat p { color:var(--muted); font-size:14px; margin-top:7px; } .suggestion { color:var(--text)!important; } .beat { display:grid; grid-template-columns:auto 1fr; gap:4px 10px; } .beat span { color:var(--muted); font-size:12px; } .beat p { grid-column:1 / -1; }
    .questions ul { margin:0; padding-left:20px; } .note { color:var(--muted); margin-top:12px; font-size:13px; } @media (max-width:600px) { main { width:min(100% - 20px,1120px); padding-top:18px; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(review.pipeline_title)} Route Review</h1>
    <p class="lede">${escapeHtml(projectName)}. A route-specific script check before scene planning and asset work.</p>
    <div class="summary"><span class="pill">${escapeHtml(review.status)}</span><span class="pill">${review.score}/100</span><span class="pill">${escapeHtml(review.pipeline)}</span></div>
    <h2 class="section-title">Structural Checks</h2>
    <section class="grid">${checks}</section>
    <h2 class="section-title">Suggested Beat Map</h2>
    <section class="grid">${beats}</section>
    <h2 class="section-title">Human Review</h2>
    <section class="questions"><ul>${review.human_questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul><p class="note">${escapeHtml(review.note)}</p></section>
  </main>
</body>
</html>`;
}

function checksForRoute(context: ReviewContext, script: string, paragraphs: string[]): RouteQualityCheck[] {
  switch (context.pipeline) {
    case "linkedin-vox-pop":
      return linkedinChecks(script, paragraphs);
    case "narrated-visual-story":
      return storyChecks(script, paragraphs, context.characterNames ?? []);
    case "narrated-explainer":
      return explainerChecks(script, paragraphs);
  }
}

function explainerChecks(script: string, paragraphs: string[]): RouteQualityCheck[] {
  const normalizedScript = normalize(script);
  const openingText = paragraphs[0] ?? "";
  const endingText = paragraphs.at(-1) ?? "";
  const opening = normalize(openingText);
  const ending = normalize(endingText);
  const loopedEnding = opening.length > 0 && opening === ending && paragraphs.length >= 4;
  const premise = signal(opening, [/\?/, /\bwhy\b/, /\bhow\b/, /\bwhat\b/, /the (?:simple |real )?(?:answer|reason|idea)/]);
  const explanationPatterns = [/\bbecause\b/, /\bmeans\b/, /the (?:simple |stranger |real )?answer/, /\bthe reason\b/, /\bworks? by\b/, /\bcauses?\b/, /\bobviously not\b/, /\bcame before\b/, /\bevolved from\b/];
  const examplePatterns = [/for example/, /for instance/, /such as/, /\bimagine\b/, /\bconsider\b/, /\bif\b/, /\bwhen\b/, /\bonce\b/, /\blike\b/, /\blong before\b/];
  const explanation = signal(normalizedScript, explanationPatterns);
  const example = signal(normalizedScript, examplePatterns);
  const progression = paragraphs.length >= 4 && signal(normalizedScript, [/\bbut\b/, /\bthen\b/, /\bso\b/, /\bonce\b/, /\bsometimes\b/]);
  const landing = loopedEnding || signal(ending, [/\bso\b/, /that means/, /next time/, /remember/, /sometimes/, /the point/, /takeaway/, /which is why/, /before you/]);

  return [
    check("premise", "Immediate question or premise", premise ? "pass" : "needs-work", premise ? "The opening names a question or explanatory tension." : "The opening does not clearly signal what the viewer will understand.", evidence(openingText, premise), "Rewrite the first sentence as one plain-language question, surprising fact or tension."),
    check("explanation", "Clear explanatory answer", explanation ? "pass" : "needs-work", explanation ? "The script contains a direct answer, causal link or origin mechanism." : "No strong answer, definition or causal link is visible.", evidenceFor(script, explanationPatterns), "State the answer in one sentence, then explain why it is true."),
    check("example", "Concrete example", example ? "pass" : "watch", example ? "The explanation is grounded in an example, historical mechanism or scenario." : "The idea may remain abstract for a short-form viewer.", evidenceFor(script, examplePatterns), "Add one concrete, visual example that can carry a full scene."),
    check("progression", "Progressive explanation", progression ? "pass" : paragraphs.length >= 3 ? "watch" : "needs-work", progression ? "The script has enough separate beats and connective movement." : "The explanation has limited visible progression between beats.", `${paragraphs.length} spoken beats detected.`, "Shape the middle as answer, example, implication rather than several versions of the same statement."),
    check("landing", "Memorable takeaway", landing ? "pass" : "watch", loopedEnding ? "The final beat deliberately loops back to the opening after the explanation." : landing ? "The final beat reframes or applies the idea." : "The final beat may end without a distinct takeaway.", evidence(endingText, landing), "End with the one sentence the viewer should remember or notice next time.")
  ];
}

function linkedinChecks(script: string, paragraphs: string[]): RouteQualityCheck[] {
  const normalizedScript = normalize(script);
  const openingText = paragraphs[0] ?? "";
  const endingText = paragraphs.at(-1) ?? "";
  const opening = normalize(openingText);
  const ending = normalize(endingText);
  const stance = signal(normalizedScript, [/\bi\b/, /\bwe\b/, /\bmy\b/, /\bour\b/, /the useful question/, /here'?s what/, /\bis not\b/, /\bbeats?\b/, /\bshould\b/, /pause before/, /still needs/]);
  const tension = signal(normalizedScript, [/everyone says/, /\bbut\b/, /\binstead\b/, /\bproblem\b/, /\bwrong\b/, /\bmistake\b/, /\bno real\b/, /complicat/, /\bjargon\b/]);
  const support = signal(normalizedScript, [/for example/, /in practice/, /\bbecause\b/, /\bteams?\b/, /\bclients?\b/, /\bdata\b/, /\bexperience\b/, /\bobserved\b/, /\baccording to\b/]);
  const action = signal(ending, [/\bstart\b/, /\btry\b/, /\bask\b/, /\bstop\b/, /\bbefore\b/, /\bshould\b/, /\bneed\b/, /\bdo\b/]) || signal(lastThird(normalizedScript), [/\bstart\b/, /\btry\b/, /\bask\b/, /\bstop\b/, /\bbefore\b/]);
  const badCta = signal(ending, [/follow for/, /like and/, /subscribe/]);
  const conversation = /\?\s*$/.test(ending) || signal(ending, [/what are you/, /what do you/, /in practice/, /start there/, /pause before/]);

  return [
    check("hook", "Useful feed-first opening", opening.length > 0 && opening.split(/\s+/).length <= 18 ? "pass" : "watch", "The first sentence should earn attention before sound or context.", truncate(openingText), "Lead with the useful tension or claim in roughly one caption-sized sentence."),
    check("stance", "Recognisable point of view", stance ? "pass" : "needs-work", stance ? "The script signals a position rather than neutral summary." : "The speaker's position is difficult to distinguish from generic advice.", evidenceFor(script, [/\bi\b/, /\bwe\b/, /the useful question/, /\bis not\b/, /\bbeats?\b/, /\bshould\b/, /pause before/]), "State what you believe, reject or do differently in practice."),
    check("tension", "Specific tension or misconception", tension ? "pass" : "watch", tension ? "The point of view pushes against a familiar assumption or problem." : "The script may agree with the feed without creating useful tension.", evidenceFor(script, [/everyone says/, /\bbut\b/, /\binstead\b/, /\bproblem\b/, /\bwrong\b/, /complicat/, /\bjargon\b/]), "Name the common advice, mistake or trade-off your point of view responds to."),
    check("support", "Concrete support", support ? "pass" : "watch", support ? "The claim has a practical example, context or support signal." : "The stance needs a concrete example or observed consequence.", evidenceFor(script, [/for example/, /in practice/, /\bbecause\b/, /\bteams?\b/, /\bclients?\b/, /\bdata\b/, /\bexperience\b/]), "Add one real example, observed pattern or source-backed fact; the claim review will handle evidence detail."),
    check("action", "Practical, conversation-ready landing", badCta ? "needs-work" : action && conversation ? "pass" : action ? "watch" : "needs-work", badCta ? "The spoken landing uses a generic engagement CTA." : action ? "The ending gives the viewer a practical next move." : "The ending lacks a practical action or decision.", truncate(endingText), "End with a useful action or question that invites peers to add experience, not generic engagement.")
  ];
}

function storyChecks(script: string, paragraphs: string[], characterNames: string[]): RouteQualityCheck[] {
  const normalizedScript = normalize(script);
  const endingText = paragraphs.at(-1) ?? "";
  const ending = normalize(endingText);
  const namedCharacter = characterNames.some((name) => name.length > 1 && normalizedScript.includes(normalize(name)));
  const character = namedCharacter || signal(normalizedScript, [/\bboy\b/, /\bgirl\b/, /\bkid\b/, /\bdog\b/, /\bwoman\b/, /\bman\b/, /\bfriend\b/, /\bhe\b/, /\bshe\b/]);
  const place = signal(normalizedScript, [/\btown\b/, /\bcity\b/, /\bvillage\b/, /\bstreet\b/, /\bhome\b/, /\bpier\b/, /\bsea\b/, /\bpromenade\b/, /\bforest\b/, /\broom\b/, /\bschool\b/]);
  const turn = signal(normalizedScript, [/\bbut\b/, /\bthen\b/, /\buntil\b/, /\bwhen\b/, /\bsuddenly\b/, /\bexpected\b/]);
  const stakes = signal(normalizedScript, [/had to/, /\bmust\b/, /\brisk\b/, /\bsave\b/, /\blose\b/, /\brose\b/, /\bdanger\b/, /toward the/, /against the/, /before it/]);
  const payoff = signal(ending, [/by the time/, /\bfinally\b/, /\bbecame\b/, /\bturned\b/, /\bfound\b/, /\bsaved\b/, /\blegend\b/, /\bchanged\b/, /\bhome\b/]);

  return [
    check("character", "Character to follow", character ? "pass" : "needs-work", character ? "The script gives the viewer a person, creature or recognisable subject to follow." : "No clear story subject is visible.", evidenceFor(script, characterNames.map((name) => new RegExp(`\\b${escapeRegExp(normalize(name))}\\b`)).concat([/\bboy\b/, /\bgirl\b/, /\bkid\b/, /\bdog\b/, /\bhe\b/, /\bshe\b/])), "Name or clearly identify the character whose situation changes."),
    check("place", "Specific story world", place ? "pass" : "watch", place ? "The narration includes a concrete place cue." : "The story world is not yet specific in the spoken script.", evidenceFor(script, [/\btown\b/, /\bcity\b/, /\bvillage\b/, /\bstreet\b/, /\bpier\b/, /\bpromenade\b/, /\bforest\b/, /\bschool\b/]), "Add one place detail that could not belong to every story."),
    check("turn", "Inciting turn", turn ? "pass" : "needs-work", turn ? "The script contains a visible change from setup into action." : "The setup does not clearly turn into a new situation.", evidenceFor(script, [/\bbut\b/, /\bthen\b/, /\buntil\b/, /\bwhen\b/, /\bsuddenly\b/]), "Give the story a clear 'then something changed' beat."),
    check("stakes", "Choice, risk or escalation", stakes ? "pass" : "watch", stakes ? "The middle contains pressure, movement or consequence." : "The character may have little to do or lose in the middle.", evidenceFor(script, [/had to/, /\bmust\b/, /\brisk\b/, /\bsave\b/, /\blose\b/, /\brose\b/, /\bdanger\b/, /toward the/]), "Add a choice, obstacle or consequence that forces the character into action."),
    check("payoff", "Earned payoff", payoff ? "pass" : "watch", payoff ? "The final beat signals a changed state or story payoff." : "The ending may stop without showing what changed.", truncate(endingText), "End on the changed relationship, image or meaning that makes the setup worthwhile.")
  ];
}

function beatMapForRoute(pipeline: ProductionPipelineName, paragraphs: string[]): RouteBeat[] {
  const count = paragraphs.length;
  return paragraphs.map((text, index) => ({
    beat_number: index + 1,
    role: beatRole(pipeline, index, count, normalize(text)),
    text
  }));
}

function beatRole(pipeline: ProductionPipelineName, index: number, count: number, text: string): string {
  if (index === 0) {
    return pipeline === "narrated-visual-story" ? "setup / story promise" : "hook / promise";
  }
  if (index === count - 1) {
    return pipeline === "narrated-visual-story" ? "payoff / changed state" : pipeline === "linkedin-vox-pop" ? "action / conversation" : "takeaway / reframe";
  }
  if (pipeline === "linkedin-vox-pop") {
    if (signal(text, [/for example/, /in practice/, /\bbecause\b/, /\bwhen\b/])) return "support / example";
    if (signal(text, [/\bbut\b/, /\binstead\b/, /\bwrong\b/, /\bproblem\b/])) return "tension / stance";
    return "claim / implication";
  }
  if (pipeline === "narrated-visual-story") {
    if (signal(text, [/\bbut\b/, /\bthen\b/, /\bwhen\b/, /\bsuddenly\b/])) return "turn / escalation";
    return index >= Math.floor(count * 0.65) ? "climax / consequence" : "character / world build";
  }
  if (signal(text, [/for example/, /for instance/, /\blong before\b/, /\bif\b/, /\bwhen\b/, /\bonce\b/])) return "example / application";
  if (signal(text, [/\bbecause\b/, /\bmeans\b/, /\banswer\b/, /\breason\b/, /\bobviously not\b/, /\bcame before\b/, /\bevolved from\b/])) return "answer / explanation";
  return "explanation / implication";
}

function humanQuestions(pipeline: ProductionPipelineName): string[] {
  if (pipeline === "linkedin-vox-pop") {
    return [
      "Would a peer know exactly what I believe after the first two beats?",
      "Can I defend every factual-looking claim with evidence, direct experience or a clearly declared opinion?",
      "Does the ending give people something useful to try or discuss without begging for engagement?"
    ];
  }
  if (pipeline === "narrated-visual-story") {
    return [
      "Whose story is this, and what changes for them?",
      "Could the setting be recognised from details rather than a title card?",
      "Does the final image pay off the exact promise made at the start?"
    ];
  }
  return [
    "Can a viewer repeat the one idea in a sentence after watching once?",
    "Is there a concrete example that makes the explanation visual rather than merely verbal?",
    "Does every middle beat move from question to answer to implication?"
  ];
}

function check(
  id: string,
  label: string,
  status: RouteCheckStatus,
  detail: string,
  evidenceText: string,
  suggestion: string
): RouteQualityCheck {
  return { id, label, status, detail, evidence: evidenceText, suggestion };
}

function checkScore(status: RouteCheckStatus): number {
  return status === "pass" ? 20 : status === "watch" ? 10 : 0;
}

function signal(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function evidence(value: string, found: boolean): string {
  return found ? truncate(value) : "";
}

function evidenceFor(script: string, patterns: RegExp[]): string {
  const sentences = splitSentences(script);
  return truncate(sentences.find((sentence) => signal(normalize(sentence), patterns)) ?? "");
}

function splitParagraphs(value: string): string[] {
  const paragraphs = value.split(/\r?\n\s*\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs;
  }
  return splitSentences(value);
}

function splitSentences(value: string): string[] {
  return (value.match(/[^.!?]+[.!?]+["']*|[^.!?]+$/g) ?? []).map((item) => item.trim()).filter(Boolean);
}

function lastThird(value: string): string {
  const start = Math.floor(value.length * 0.66);
  return value.slice(start);
}

function routeQualityFingerprint(
  pipeline: ProductionPipelineName,
  profile: string,
  scriptText: string,
  characterNames: string[] = []
): string {
  return createHash("sha256")
    .update(JSON.stringify({ pipeline, profile, script: scriptText.trim(), characterNames: [...characterNames].sort() }))
    .digest("hex");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function truncate(value: string, max = 180): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 3).trim()}...`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

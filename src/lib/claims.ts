import path from "node:path";
import { createHash } from "node:crypto";
import fs from "fs-extra";
import { escapeMarkdownTableCell } from "./format.js";
import { writeJsonFile, writeTextFile, type WriteResult } from "./files.js";
import type { EvidenceClaim, EvidenceFile, Scene } from "./schemas.js";

export type ClaimReviewStatus = "ready" | "needs-review";
export type ClaimSupportStatus = "supported" | "declared" | "needs-source";
export type SceneClaimStatus = "supported" | "needs-source" | "unmapped" | "not-claim";

export interface ClaimCardReview {
  id: string;
  claim: string;
  support_type: EvidenceClaim["support_type"];
  support_status: ClaimSupportStatus;
  source_title?: string;
  source_url?: string;
  notes?: string;
  scene_numbers: number[];
}

export interface SceneClaimReview {
  scene_number: number;
  transcript: string;
  status: SceneClaimStatus;
  claim_ids: string[];
  note: string;
}

export interface ClaimReview {
  status: ClaimReviewStatus;
  input_fingerprint: string;
  evidence_file?: string;
  claim_cards: ClaimCardReview[];
  scene_checks: SceneClaimReview[];
  summary: {
    claims: number;
    supported_claims: number;
    declared_claims: number;
    claims_needing_source: number;
    scenes_supported: number;
    scenes_needing_source: number;
    scenes_unmapped: number;
  };
  publishing_warnings: string[];
}

export interface ClaimReviewWriteResult {
  review: ClaimReview;
  writes: WriteResult[];
}

export function createClaimReview(options: {
  scenes: Scene[];
  evidence?: EvidenceFile;
  evidenceFile?: string;
}): ClaimReview {
  const claims = options.evidence?.claims ?? [];
  const claimCards = claims.map((claim) => reviewClaimCard(claim, options.scenes));
  const claimById = new Map(claimCards.map((claim) => [claim.id, claim]));
  const sceneChecks = options.scenes.map((scene) => reviewScene(scene, claimCards));
  const summary = {
    claims: claimCards.length,
    supported_claims: claimCards.filter((claim) => claim.support_status === "supported").length,
    declared_claims: claimCards.filter((claim) => claim.support_status === "declared").length,
    claims_needing_source: claimCards.filter((claim) => claim.support_status === "needs-source").length,
    scenes_supported: sceneChecks.filter((scene) => scene.status === "supported").length,
    scenes_needing_source: sceneChecks.filter((scene) => scene.status === "needs-source").length,
    scenes_unmapped: sceneChecks.filter((scene) => scene.status === "unmapped").length
  };
  const warnings = publishingWarnings(summary, claimCards, sceneChecks, claimById, options.evidenceFile);

  return {
    status: warnings.length === 0 ? "ready" : "needs-review",
    input_fingerprint: claimReviewFingerprint(options.scenes, options.evidence),
    evidence_file: options.evidenceFile,
    claim_cards: claimCards,
    scene_checks: sceneChecks,
    summary,
    publishing_warnings: warnings
  };
}

export async function isClaimReviewCurrent(options: {
  outputFolder: string;
  evidence?: EvidenceFile;
}): Promise<boolean> {
  const scenesPath = path.join(options.outputFolder, "02_scenes", "scenes.json");
  const reviewPath = path.join(options.outputFolder, "00_analysis", "claim_review.json");
  if (!(await fs.pathExists(scenesPath)) || !(await fs.pathExists(reviewPath))) {
    return false;
  }

  const [scenes, review] = await Promise.all([
    fs.readJson(scenesPath) as Promise<Scene[]>,
    fs.readJson(reviewPath) as Promise<ClaimReview>
  ]);
  return review.input_fingerprint === claimReviewFingerprint(scenes, options.evidence);
}

export async function writeClaimReview(options: {
  projectName: string;
  outputFolder: string;
  scenes: Scene[];
  evidence?: EvidenceFile;
  evidenceFile?: string;
  force?: boolean;
}): Promise<ClaimReviewWriteResult> {
  const review = createClaimReview({
    scenes: options.scenes,
    evidence: options.evidence,
    evidenceFile: options.evidenceFile
  });
  const folder = path.join(options.outputFolder, "00_analysis");
  const writes = await Promise.all([
    writeJsonFile(path.join(folder, "claim_review.json"), review, { force: options.force }),
    writeTextFile(path.join(folder, "claim_review.md"), claimReviewToMarkdown(options.projectName, review), {
      force: options.force
    })
  ]);

  return { review, writes };
}

export function claimReviewToMarkdown(projectName: string, review: ClaimReview): string {
  const warningSection =
    review.publishing_warnings.length > 0
      ? review.publishing_warnings.map((warning) => `- ${warning}`).join("\n")
      : "- No unmapped factual scene statements or incomplete claim cards found.";
  const claimRows = review.claim_cards.length
    ? review.claim_cards
        .map(
          (claim) =>
            `| ${escapeMarkdownTableCell(claim.id)} | ${escapeMarkdownTableCell(claim.claim)} | ${claim.support_type} | ${claim.support_status} | ${escapeMarkdownTableCell(claim.source_title ?? "")} | ${claim.scene_numbers.join(", ") || "-"} |`
        )
        .join("\n")
    : "| - | No claim cards declared yet. | - | needs-review | - | - |";
  const sceneRows = review.scene_checks
    .map(
      (scene) =>
        `| ${scene.scene_number} | ${scene.status} | ${escapeMarkdownTableCell(scene.claim_ids.join(", ") || "-")} | ${escapeMarkdownTableCell(scene.transcript)} | ${escapeMarkdownTableCell(scene.note)} |`
    )
    .join("\n");

  return `# Claim Review

Project: ${projectName}
Status: **${review.status}**
Evidence file: ${review.evidence_file || "not configured"}

This is a mapping and completeness review, not an automatic fact check. Resolve warnings by adding a claim card, adding source detail, or marking the statement as first-hand or editorial opinion.

## Publishing Warnings

${warningSection}

## Summary

| Claim cards | Source-backed | Declared support | Need source detail | Supported scenes | Unmapped scenes |
| --- | --- | --- | --- | --- | --- |
| ${review.summary.claims} | ${review.summary.supported_claims} | ${review.summary.declared_claims} | ${review.summary.claims_needing_source} | ${review.summary.scenes_supported} | ${review.summary.scenes_unmapped} |

## Claim Cards

| ID | Claim | Support type | Review | Source | Scene mapping |
| --- | --- | --- | --- | --- | --- |
${claimRows}

## Scene Review

| Scene | Review | Claim cards | Transcript | Note |
| --- | --- | --- | --- | --- |
${sceneRows}

## Next Move

1. Edit the evidence file to add or correct claim cards.
2. Add \`scene_numbers\` when you want an explicit scene mapping.
3. Run \`video-pack claims --project . --force\` again.
4. Review \`output/07_publish/copy_pack.md\` before publishing.
`;
}

function reviewClaimCard(claim: EvidenceClaim, scenes: Scene[]): ClaimCardReview {
  const sceneNumbers = scenes
    .filter((scene) => claimMatchesScene(claim, scene))
    .map((scene) => scene.scene_number);

  return {
    id: claim.id,
    claim: claim.claim,
    support_type: claim.support_type,
    support_status: supportStatus(claim),
    source_title: claim.source_title,
    source_url: claim.source_url,
    notes: claim.notes,
    scene_numbers: sceneNumbers
  };
}

function claimReviewFingerprint(scenes: Scene[], evidence?: EvidenceFile): string {
  const input = {
    scenes: scenes.map((scene) => ({ scene_number: scene.scene_number, transcript: scene.transcript })),
    claims: evidence?.claims ?? []
  };
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function reviewScene(scene: Scene, claims: ClaimCardReview[]): SceneClaimReview {
  const matchingClaims = claims.filter((claim) => claim.scene_numbers.includes(scene.scene_number));
  const claimIds = matchingClaims.map((claim) => claim.id);

  if (matchingClaims.length > 0 && matchingClaims.every((claim) => claim.support_status !== "needs-source")) {
    return {
      scene_number: scene.scene_number,
      transcript: scene.transcript,
      status: "supported",
      claim_ids: claimIds,
      note: "Mapped to a source-backed or declared-support claim card."
    };
  }

  if (matchingClaims.some((claim) => claim.support_status === "needs-source")) {
    return {
      scene_number: scene.scene_number,
      transcript: scene.transcript,
      status: "needs-source",
      claim_ids: claimIds,
      note: "A mapped claim card needs a usable source or support detail."
    };
  }

  if (looksClaimLike(scene.transcript)) {
    return {
      scene_number: scene.scene_number,
      transcript: scene.transcript,
      status: "unmapped",
      claim_ids: [],
      note: "This reads like a factual statement or definition but has no matching claim card."
    };
  }

  return {
    scene_number: scene.scene_number,
    transcript: scene.transcript,
    status: "not-claim",
    claim_ids: [],
    note: "No source review needed for this scene unless you want to support a specific phrase."
  };
}

function supportStatus(claim: EvidenceClaim): ClaimSupportStatus {
  if (isPlaceholder(claim.claim)) {
    return "needs-source";
  }

  if (claim.support_type === "editorial-opinion" || claim.support_type === "first-hand") {
    return "declared";
  }

  const hasSourceTitle = Boolean(claim.source_title && !isPlaceholder(claim.source_title));
  const hasUsableUrl = Boolean(claim.source_url && !claim.source_url.includes("example.com"));
  const hasNotes = Boolean(claim.notes && !isPlaceholder(claim.notes));

  if (claim.support_type === "internal-data") {
    return hasSourceTitle || hasNotes ? "supported" : "needs-source";
  }

  return hasSourceTitle || hasUsableUrl ? "supported" : "needs-source";
}

function claimMatchesScene(claim: EvidenceClaim, scene: Scene): boolean {
  if (claim.scene_numbers.includes(scene.scene_number)) {
    return true;
  }

  const claimTerms = meaningfulTerms(claim.claim);
  const sceneTerms = new Set(meaningfulTerms(scene.transcript));
  const shared = claimTerms.filter((term) => sceneTerms.has(term));
  const required = claimTerms.length <= 1 ? 1 : 2;
  return shared.length >= required;
}

function looksClaimLike(value: string): boolean {
  const text = value.toLowerCase().trim();
  if (text.length < 24 || /^(here is .*episode|if |try |consider |ask |pause |avoid )/.test(text)) {
    return false;
  }

  return /\b(is|are|means|can|will|does|do|beat|beats|better|worse|most|all|never|always|usually|must|needs|need|keeps|keep)\b/.test(text);
}

function meaningfulTerms(value: string): string[] {
  return [...new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
  )];
}

function publishingWarnings(
  summary: ClaimReview["summary"],
  claims: ClaimCardReview[],
  scenes: SceneClaimReview[],
  claimById: Map<string, ClaimCardReview>,
  evidenceFile?: string
): string[] {
  const warnings: string[] = [];

  if (!evidenceFile) {
    warnings.push("No evidence file is configured. Add input/evidence.yml before using this as a source-reviewed LinkedIn post.");
  }

  if (summary.claims === 0) {
    warnings.push("No claim cards are declared, so factual scene statements have not been mapped to support.");
  }

  if (summary.claims_needing_source > 0) {
    warnings.push(`${summary.claims_needing_source} claim card${plural(summary.claims_needing_source)} need usable source or support detail.`);
  }

  if (summary.scenes_needing_source > 0) {
    warnings.push(`${summary.scenes_needing_source} scene${plural(summary.scenes_needing_source)} map to claim cards that still need source detail.`);
  }

  if (summary.scenes_unmapped > 0) {
    warnings.push(`${summary.scenes_unmapped} factual scene statement${plural(summary.scenes_unmapped)} are unmapped. Add a claim card or mark the statement as declared opinion/first-hand.`);
  }

  const unmappedClaimCards = claims.filter((claim) => claim.scene_numbers.length === 0 && claim.support_status !== "needs-source");
  if (unmappedClaimCards.length > 0) {
    warnings.push(`${unmappedClaimCards.length} claim card${plural(unmappedClaimCards.length)} do not match a scene yet. Add scene_numbers for explicit mapping.`);
  }

  const sceneClaimIds = new Set(scenes.flatMap((scene) => scene.claim_ids));
  const orphaned = [...claimById.values()].filter((claim) => !sceneClaimIds.has(claim.id));
  if (orphaned.length > 0 && !warnings.some((warning) => warning.includes("do not match a scene"))) {
    warnings.push(`${orphaned.length} claim card${plural(orphaned.length)} do not match a scene yet. Add scene_numbers for explicit mapping.`);
  }

  return warnings;
}

function isPlaceholder(value: string): boolean {
  return /replace this|replace-with|add the|add a|example\.com|what this source proves/i.test(value);
}

function plural(count: number): string {
  return count === 1 ? "" : "s";
}

const STOP_WORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "your",
  "have",
  "they",
  "them",
  "into",
  "about",
  "what",
  "when",
  "then",
  "than",
  "will",
  "would",
  "should",
  "could",
  "being",
  "been"
]);

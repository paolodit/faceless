import path from "node:path";
import fs from "fs-extra";
import { writeJsonFile, writeTextFile, type WriteResult } from "./files.js";

export interface DecisionLogEntry {
  timestamp: string;
  command: string;
  decision: string;
  reason: string;
  context?: Record<string, string | number | boolean | null | undefined>;
}

export async function appendDecisionLogEntry(
  outputFolder: string,
  entry: Omit<DecisionLogEntry, "timestamp">
): Promise<WriteResult[]> {
  const logPath = path.join(outputFolder, "decision_log.json");
  const entries = await readDecisionLog(outputFolder);
  entries.push({
    timestamp: new Date().toISOString(),
    ...entry
  });

  return writeDecisionLog(outputFolder, entries);
}

export async function readDecisionLog(outputFolder: string): Promise<DecisionLogEntry[]> {
  const logPath = path.join(outputFolder, "decision_log.json");
  if (!(await fs.pathExists(logPath))) {
    return [];
  }

  const raw = await fs.readJson(logPath);
  return Array.isArray(raw) ? (raw as DecisionLogEntry[]) : [];
}

export async function writeDecisionLog(
  outputFolder: string,
  entries: DecisionLogEntry[]
): Promise<WriteResult[]> {
  return Promise.all([
    writeJsonFile(path.join(outputFolder, "decision_log.json"), entries, { force: true }),
    writeTextFile(path.join(outputFolder, "decision_log.md"), decisionLogMarkdown(entries), { force: true })
  ]);
}

function decisionLogMarkdown(entries: DecisionLogEntry[]): string {
  if (entries.length === 0) {
    return `# Decision Log

No decisions recorded yet.
`;
  }

  return `# Decision Log

${entries
  .map(
    (entry, index) => `## ${index + 1}. ${entry.decision}

- Time: ${entry.timestamp}
- Command: ${entry.command}
- Reason: ${entry.reason}
${contextLines(entry.context)}
`
  )
  .join("\n")}`;
}

function contextLines(context: DecisionLogEntry["context"]): string {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }

  return `- Context: ${Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ")}`;
}

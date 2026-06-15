import path from "node:path";
import fs from "fs-extra";
import YAML from "yaml";

export interface WriteResult {
  filePath: string;
  written: boolean;
}

export function resolveProjectFile(projectRoot: string, filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return path.normalize(filePath);
  }

  return path.resolve(projectRoot, filePath);
}

export function displayPath(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
}

export async function readYamlFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return YAML.parse(raw) as T;
}

export async function writeTextFile(
  filePath: string,
  content: string,
  options: { force?: boolean } = {}
): Promise<WriteResult> {
  await fs.ensureDir(path.dirname(filePath));

  if (!options.force && (await fs.pathExists(filePath))) {
    return { filePath, written: false };
  }

  await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  return { filePath, written: true };
}

export async function writeJsonFile(
  filePath: string,
  value: unknown,
  options: { force?: boolean } = {}
): Promise<WriteResult> {
  return writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`, options);
}

export function listCreated(results: WriteResult[], projectRoot: string): string[] {
  return results
    .filter((result) => result.written)
    .map((result) => `- ${displayPath(projectRoot, result.filePath)}`);
}

export function listSkipped(results: WriteResult[], projectRoot: string): string[] {
  return results
    .filter((result) => !result.written)
    .map((result) => `- ${displayPath(projectRoot, result.filePath)}`);
}

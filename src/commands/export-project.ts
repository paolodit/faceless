import path from "node:path";
import { createWriteStream } from "node:fs";
import fs from "fs-extra";
import { ZipArchive } from "archiver";
import { displayPath, writeTextFile } from "../lib/files.js";
import { slugifyName } from "../lib/format.js";
import { inspectProductionReadiness } from "../lib/production-readiness.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { loadValidProject } from "../lib/validation.js";

export async function exportProjectCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<string> {
  const project = await loadValidProject(projectPath);
  await writeProjectBoard(project, { force: true });
  const readiness = await inspectProductionReadiness(project);
  const exportFolder = path.join(project.paths.outputFolder, "exports");
  const filename = `${slugifyName(project.config.project_name) || "faceless-production"}-handoff.zip`;
  const destination = path.join(exportFolder, filename);

  if (!options.force && (await fs.pathExists(destination))) {
    return `Portable production archive already exists.

Archive:
${displayPath(project.root, destination)}

Use --force to refresh it after production changes.`;
  }

  await fs.ensureDir(exportFolder);
  await writeTextFile(
    path.join(project.paths.outputFolder, "EXPORT_README.md"),
    exportReadme(project.config.project_name, readiness.label, readiness.summary),
    { force: true }
  );
  await createZip({ projectRoot: project.root, destination, externalAudio: project.paths.audioFile });
  const sizeMb = (await fs.stat(destination)).size / (1024 * 1024);

  return `Portable production archive created.

Archive:
${displayPath(project.root, destination)}

Size: ${sizeMb.toFixed(1)} MB
Current deliverable: ${readiness.label}

This single file is the recommended handoff from a remote agent workspace. It excludes environment files, common credential/key files, Git metadata, caches, dependencies and older exports. Review any private production archive before sharing it.`;
}

async function createZip(options: {
  projectRoot: string;
  destination: string;
  externalAudio?: string;
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(options.destination);
    const archive = new ZipArchive({ zlib: { level: 6 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", (error: Error & { code?: string }) => {
      if (error.code !== "ENOENT") {
        reject(error);
      }
    });
    archive.on("error", reject);
    archive.pipe(output);
    archive.glob("**/*", {
      cwd: options.projectRoot,
      dot: true,
      ignore: [
        ".env",
        ".env.*",
        "**/.env",
        "**/.env.*",
        "**/.npmrc",
        "**/.yarnrc",
        "**/.yarnrc.yml",
        "**/*.pem",
        "**/*.key",
        "**/*.p12",
        "**/*.pfx",
        "**/credentials.json",
        "**/credentials.*.json",
        "**/*service-account*.json",
        ".git/**",
        "**/.git/**",
        "node_modules/**",
        "output/exports/**",
        "**/.DS_Store",
        "**/Thumbs.db",
        "**/.cache/**",
        "**/node_modules/**"
      ]
    });

    if (options.externalAudio && path.isAbsolute(options.externalAudio)) {
      const relative = path.relative(options.projectRoot, options.externalAudio);
      if (relative.startsWith("..") && fs.existsSync(options.externalAudio)) {
        archive.file(options.externalAudio, { name: `portable-assets/${path.basename(options.externalAudio)}` });
      }
    }

    void archive.finalize();
  });
}

function exportReadme(projectName: string, label: string, summary: string): string {
  return `# Portable Production Handoff

Project: ${projectName}
Current deliverable: ${label}

${summary}

Start here after extracting:

1. Read \`output/SESSION_HANDOFF.md\`.
2. Open \`output/NEXT.html\` for the one recommended action.
3. Open \`output/PROGRESS.html\` for honest asset, audio and render coverage.
4. Use \`output/BOARD.html\` for the full scene-level production view.

Security note: this archive intentionally excludes environment files, common credential/key files, Git metadata, dependency folders, caches and older exports. Creator scripts and media are included because this is a private production handoff. Review the archive before sharing it and do not publish it as a repository fixture.
`;
}

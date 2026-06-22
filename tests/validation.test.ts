import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { initProject } from "../src/commands/init.js";
import { styleBibleSchema, characterBibleSchema } from "../src/lib/schemas.js";
import { validateProject } from "../src/lib/validation.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("validation", () => {
  it("validates an initialized project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample");
    } finally {
      process.chdir(cwd);
    }

    const result = await validateProject(path.join(root, "sample"));
    expect(result.valid).toBe(true);
    expect(result.project?.paths.assetsFolder.endsWith(path.join("input", "assets"))).toBe(true);
    expect(await fs.pathExists(path.join(root, "sample", "input", "assets"))).toBe(true);
  });

  it("requires style bible medium", () => {
    const parsed = styleBibleSchema.safeParse({
      style_name: "x",
      visual_style: {
        line_quality: "clean",
        colour_palette: "limited",
        background_style: "simple",
        visual_complexity: "low",
        emotional_tone: "warm"
      },
      composition_rules: {
        aspect_ratio: "9:16",
        framing: "single idea",
        readability: "mobile",
        subject_size: "large"
      },
      prompt_rules: { always_include: [], avoid: [] }
    });

    expect(parsed.success).toBe(false);
  });

  it("requires at least one character", () => {
    const parsed = characterBibleSchema.safeParse({ characters: [] });
    expect(parsed.success).toBe(false);
  });
});

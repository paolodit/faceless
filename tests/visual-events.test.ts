import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { initProject } from "../src/commands/init.js";
import { packageProjectCommand } from "../src/commands/pack.js";
import { prepareProjectCommand } from "../src/commands/prepare.js";
import { promptsProjectCommand } from "../src/commands/prompts.js";
import { stockAssetsProjectCommand } from "../src/commands/stock-assets.js";
import { visualEventsProjectCommand } from "../src/commands/visual-events.js";
import { projectConfigSchema, type ProjectConfig, type Scene } from "../src/lib/schemas.js";
import {
  createVisualEventScenePlans,
  flattenVisualEvents,
  overlayTextToCsv,
  visualEventsToCsv
} from "../src/lib/visual-events.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("visual event planning", () => {
  it("defaults visual event config on project parse", () => {
    const config = projectConfigSchema.parse(baseConfig());

    expect(config.visual_events.enabled).toBe(true);
    expect(config.visual_events.mode).toBe("auto");
    expect(config.visual_events.default_pacing).toBe("profile");
    expect(config.visual_events.max_events_per_scene).toBe(6);
    expect(config.scene_production.default_layout).toBe("auto");
    expect(config.scene_production.continuity).toBe("auto");
    expect(config.scene_production.additive_layers).toBe(3);
    expect(config.stock_assets.enabled).toBe(false);
    expect(config.stock_assets.provider).toBe("mock");
    expect(config.stock_assets.media_type).toBe("photo");
  });

  it("uses burst, additive and landing pacing for a LinkedIn jargon script", () => {
    const plans = createVisualEventScenePlans(linkedinConfig(), jargonScenes());

    expect(plans[0].pacing_mode).toBe("burst");
    expect(plans[0].production.layout_mode).toBe("fast-cut");
    expect(plans[1].pacing_mode).toBe("additive");
    expect(plans[1].production.layout_mode).toBe("additive-slide");
    expect(plans.at(-1)?.pacing_mode).toBe("landing");
    expect(plans[1].events.some((event) => event.text === "CONTEXT")).toBe(true);
  });

  it("renders visual event and overlay CSV rows", () => {
    const events = flattenVisualEvents(createVisualEventScenePlans(linkedinConfig(), jargonScenes()));
    const visualCsv = visualEventsToCsv(events);
    const overlayCsv = overlayTextToCsv(events);

    expect(visualCsv).toContain("event_id,scene_number,type,start_time,start_seconds,duration_seconds");
    expect(visualCsv).toContain("stock_scene_");
    expect(overlayCsv).toContain("overlay_id,scene_number,start_seconds,end_seconds,duration_seconds,text,style,animation,safe_area,notes");
    expect(overlayCsv).toContain("CONTEXT");
  });

  it("writes visual event files from the command before prompts exist", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-visual-events-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample");
      const projectPath = path.join(root, "sample");

      await prepareProjectCommand(projectPath, { force: true });
      const output = await visualEventsProjectCommand(projectPath, { force: true });

      expect(output).toContain("Generated visual event plan");
      expect(output).toContain("Scene layouts:");
      expect(await fs.pathExists(path.join(projectPath, "output", "02_scenes", "scene_production.html"))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, "output", "02_scenes", "scene_production.md"))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, "output", "02_scenes", "scene_production.json"))).toBe(true);
      expect(await fs.readFile(path.join(projectPath, "output", "02_scenes", "scene_production.html"), "utf8")).toContain("Review Route");
      expect(await fs.pathExists(path.join(projectPath, "output", "02_scenes", "visual_events.md"))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, "output", "06_edit_pack", "overlay_text.csv"))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, "output", "06_edit_pack", "stock_asset_queries.csv"))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });

  it("package auto-creates visual event files and includes local assets", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-package-events-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample");
      const projectPath = path.join(root, "sample");
      await fs.writeFile(path.join(projectPath, "input", "assets", "brand-note.txt"), "brand note");

      await prepareProjectCommand(projectPath, { force: true });
      await promptsProjectCommand(projectPath, { force: true });
      await packageProjectCommand(projectPath, { force: true });

      const output = path.join(projectPath, "output");
      expect(await fs.pathExists(path.join(output, "02_scenes", "visual_events.json"))).toBe(true);
      expect(await fs.pathExists(path.join(output, "02_scenes", "scene_production.json"))).toBe(true);
      expect(await fs.pathExists(path.join(output, "06_edit_pack", "asset_manifest.json"))).toBe(true);

      const manifest = await fs.readJson(path.join(output, "06_edit_pack", "asset_manifest.json"));
      expect(manifest.summary.local_assets_available).toBe(1);
      expect(manifest.summary.scene_production_layouts).toContain("fast-cut");
      expect(manifest.local_assets[0].relative_path).toBe("input/assets/brand-note.txt");
    } finally {
      process.chdir(cwd);
    }
  });

  it("downloads mock stock assets from planned stock events", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-stock-assets-"));
    cleanupPaths.push(root);
    const cwd = process.cwd();

    try {
      process.chdir(root);
      await initProject("sample");
      const projectPath = path.join(root, "sample");

      await prepareProjectCommand(projectPath, { force: true });
      await visualEventsProjectCommand(projectPath, { force: true });
      const output = await stockAssetsProjectCommand(projectPath, {
        provider: "mock",
        media: "photo",
        limit: "1",
        force: true
      });

      expect(output).toContain("Stock asset download complete");
      expect(await fs.pathExists(path.join(projectPath, "output", "06_edit_pack", "stock_assets", "download_report.json"))).toBe(true);

      const report = await fs.readJson(path.join(projectPath, "output", "06_edit_pack", "stock_assets", "download_report.json"));
      expect(report.results[0].status).toBe("downloaded");
      expect(report.results[0].relative_path).toContain("output/06_edit_pack/stock_assets/");
    } finally {
      process.chdir(cwd);
    }
  });
});

function baseConfig(): unknown {
  return {
    project_name: "sample",
    profile: "linkedin-video",
    aspect_ratio: "4:5",
    input: {
      script_file: "./input/script.txt",
      style_bible: "./input/style-bible.yml",
      character_bible: "./input/characters.yml"
    },
    output: {
      folder: "./output"
    }
  };
}

function linkedinConfig(): ProjectConfig {
  return projectConfigSchema.parse(baseConfig()) as ProjectConfig;
}

function jargonScenes(): Scene[] {
  return [
    scene(1, "00:00.000", "00:04.000", "AI jargon makes simple work sound complicated."),
    scene(2, "00:04.000", "00:09.000", "Context is the information the AI can see."),
    scene(3, "00:09.000", "00:14.000", "RAG means retrieval augmented generation."),
    scene(4, "00:14.000", "00:19.000", "If the tool cannot explain this clearly, pause before buying.")
  ];
}

function scene(sceneNumber: number, start: string, end: string, transcript: string): Scene {
  return {
    scene_number: sceneNumber,
    start,
    end,
    duration_seconds: 5,
    transcript,
    visual_goal: `Main Character explaining: ${transcript}`,
    characters: ["Main Character"],
    mood: "useful",
    notes: ""
  };
}

import { describe, expect, it } from "vitest";
import { createEditManifestRows, manifestRowsToCsv } from "../src/lib/manifest.js";
import type { Prompt, Scene } from "../src/lib/schemas.js";

const scenes: Scene[] = [
  {
    scene_number: 1,
    start: "00:00.000",
    end: "00:03.000",
    duration_seconds: 3,
    transcript: "Hello.",
    visual_goal: "Main Character waving.",
    characters: ["Main Character"],
    mood: "observational",
    notes: ""
  }
];

const prompts: Prompt[] = [
  {
    scene_number: 1,
    image_filename: "scene_001_00-00_to_00-03.png",
    prompt: "Prompt",
    negative_prompt: "",
    provider: "manual"
  }
];

describe("manifest", () => {
  it("joins scenes with prompt filenames", () => {
    const rows = createEditManifestRows(scenes, prompts);
    expect(rows[0].image_filename).toBe("scene_001_00-00_to_00-03.png");
  });

  it("writes CSV headers", () => {
    expect(manifestRowsToCsv(createEditManifestRows(scenes, prompts))).toContain(
      "scene_number,start,end,duration_seconds,image_filename,transcript,visual_goal"
    );
  });
});

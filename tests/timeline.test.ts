import { describe, expect, it } from "vitest";
import { createTimelineRows, secondsToTimecode, timelineRowsToFcpxml } from "../src/lib/timeline.js";
import type { Prompt, Scene } from "../src/lib/schemas.js";

const scenes: Scene[] = [
  {
    scene_number: 1,
    start: "00:00.000",
    end: "00:03.000",
    duration_seconds: 3,
    transcript: "Hello.",
    visual_goal: "Wave.",
    characters: ["Main Character"],
    mood: "observational",
    notes: ""
  }
];

const prompts: Prompt[] = [
  {
    scene_number: 1,
    image_filename: "scene_001.png",
    prompt: "Prompt",
    negative_prompt: "",
    provider: "manual"
  }
];

describe("timeline export", () => {
  it("formats timecode", () => {
    expect(secondsToTimecode(1.5, 30)).toBe("00:00:01:15");
  });

  it("creates FCPXML", () => {
    const rows = createTimelineRows("C:/project", scenes, prompts);
    expect(timelineRowsToFcpxml(rows, "test")).toContain("<fcpxml");
  });
});

import { describe, expect, it } from "vitest";
import { generateSrt, generateVtt } from "../src/lib/captions.js";
import type { Scene } from "../src/lib/schemas.js";

const scenes: Scene[] = [
  {
    scene_number: 1,
    start: "00:00.000",
    end: "00:04.500",
    duration_seconds: 4.5,
    transcript: "I thought I was going to relax today.",
    visual_goal: "Main Character reacting.",
    characters: ["Main Character"],
    mood: "observational",
    notes: ""
  }
];

describe("captions", () => {
  it("generates SRT", () => {
    expect(generateSrt(scenes)).toContain("00:00:00,000 --> 00:00:04,500");
  });

  it("generates VTT", () => {
    expect(generateVtt(scenes)).toContain("WEBVTT");
  });
});

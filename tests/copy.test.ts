import { describe, expect, it } from "vitest";
import { copyPackToMarkdown, createCopyPack } from "../src/lib/copy.js";
import type { Scene } from "../src/lib/schemas.js";

const scenes: Scene[] = [
  {
    scene_number: 1,
    start: "00:00.000",
    end: "00:03.000",
    duration_seconds: 3,
    transcript: "I thought I was going to relax today.",
    visual_goal: "Sofa.",
    characters: ["Main Character"],
    mood: "observational",
    notes: ""
  }
];

describe("copy pack", () => {
  it("generates title and platform copy", () => {
    const pack = createCopyPack("test", "tiktok", scenes);
    expect(pack.title_options.length).toBeGreaterThan(0);
    expect(pack.platform_posts.tiktok).toContain("relax");
  });

  it("renders markdown", () => {
    expect(copyPackToMarkdown(createCopyPack("test", "tiktok", scenes))).toContain("# Copy Pack");
  });
});

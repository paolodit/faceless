import { describe, expect, it } from "vitest";
import { splitTranscriptIntoScenes } from "../src/lib/script.js";

describe("script splitting", () => {
  it("creates timed scenes from script text", () => {
    const scenes = splitTranscriptIntoScenes("First thought. Second thought arrives.", {
      targetSceneSeconds: 3,
      minSceneSeconds: 2,
      maxSceneSeconds: 5,
      wordsPerMinute: 150,
      primaryCharacter: "Main Character"
    });

    expect(scenes).toHaveLength(1);
    expect(scenes[0].start).toBe("00:00.000");
    expect(scenes[0].characters).toEqual(["Main Character"]);
  });
});

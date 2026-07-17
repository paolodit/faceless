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

  it("does not force an explainer character into unrelated historical beats", () => {
    const scenes = splitTranscriptIntoScenes("Wind moved pollen. Bees arrived later.", {
      targetSceneSeconds: 1,
      minSceneSeconds: 1,
      maxSceneSeconds: 1.5,
      wordsPerMinute: 150,
      primaryCharacter: "Bee Workers",
      characters: [
        {
          name: "Bee Workers",
          role: "recurring bee workforce",
          appearance: { body_type: "bees", clothing: "none", hair: "none", expression_range: [] },
          personality: { traits: [] },
          prompt_anchor: "three recurring bee workers"
        }
      ],
      alwaysUsePrimaryCharacter: false
    });

    expect(scenes[0].characters).not.toContain("Bee Workers");
    expect(scenes.at(-1)?.characters).toContain("Bee Workers");
  });

  it("keeps a character when a combined beat contains both inclusion and exclusion cues", () => {
    const scenes = splitTranscriptIntoScenes(
      "The bees put on tiny jackets. Pollination came before bees.",
      {
        targetSceneSeconds: 10,
        minSceneSeconds: 2,
        maxSceneSeconds: 12,
        wordsPerMinute: 150,
        primaryCharacter: "Bee Workers",
        characters: [
          {
            name: "Bee Workers",
            role: "recurring bee workforce",
            scene_cues: ["bee", "bees"],
            scene_exclude_cues: ["pollination came before bees"],
            appearance: { body_type: "bees", clothing: "none", hair: "none", expression_range: [] },
            personality: { traits: [] },
            prompt_anchor: "three recurring bee workers"
          }
        ],
        alwaysUsePrimaryCharacter: false
      }
    );

    expect(scenes[0].characters).toContain("Bee Workers");
  });

  it("keeps closing quotation marks with the sentence they close", () => {
    const scenes = splitTranscriptIntoScenes(
      `Then a flower appears: "Right, lads. We need pollen delivered."\n\nAnd the bees get to work.`,
      {
        targetSceneSeconds: 4,
        minSceneSeconds: 2,
        maxSceneSeconds: 6,
        wordsPerMinute: 150,
        primaryCharacter: "Bee Workers"
      }
    );

    expect(scenes.every((scene) => !/^["']\s/.test(scene.transcript))).toBe(true);
    expect(scenes.map((scene) => scene.transcript).join(" ")).toContain('delivered."');
  });
});

import { pad, sceneTimeToFileLabel } from "./format.js";
import type { ImageProvider } from "./constants.js";
import type { CharacterBible, Prompt, Scene, StyleBible } from "./schemas.js";

export function createPrompts(
  scenes: Scene[],
  styleBible: StyleBible,
  characterBible: CharacterBible,
  provider: ImageProvider
): Prompt[] {
  return scenes.map((scene) => ({
    scene_number: scene.scene_number,
    image_filename: imageFilenameForScene(scene),
    prompt: buildPrompt(scene, styleBible, characterBible),
    negative_prompt: styleBible.prompt_rules.avoid.join(", "),
    provider
  }));
}

export function imageFilenameForScene(scene: Scene): string {
  return `scene_${pad(scene.scene_number, 3)}_${sceneTimeToFileLabel(scene.start)}_to_${sceneTimeToFileLabel(
    scene.end
  )}.png`;
}

function buildPrompt(scene: Scene, styleBible: StyleBible, characterBible: CharacterBible): string {
  const visualStyle = styleBible.visual_style;
  const composition = styleBible.composition_rules;
  const characterAnchors = scene.characters
    .map((name) => characterBible.characters.find((character) => character.name === name))
    .filter(Boolean)
    .map((character) => `${character!.name}: ${character!.prompt_anchor}`);

  const parts = [
    visualStyle.medium,
    `${visualStyle.line_quality} linework`,
    visualStyle.colour_palette,
    `${visualStyle.background_style} background`,
    `${visualStyle.visual_complexity} visual complexity`,
    `${visualStyle.emotional_tone} tone`,
    characterAnchors.length > 0 ? `Characters: ${characterAnchors.join("; ")}` : "",
    `Scene: ${scene.visual_goal}`,
    `Composition: ${composition.framing}; ${composition.readability}; ${composition.subject_size}; aspect ratio ${composition.aspect_ratio}`,
    styleBible.prompt_rules.always_include.length > 0
      ? `Always include: ${styleBible.prompt_rules.always_include.join(", ")}`
      : "",
    styleBible.prompt_rules.avoid.length > 0
      ? `Avoid: ${styleBible.prompt_rules.avoid.join(", ")}`
      : ""
  ];

  return parts
    .filter(Boolean)
    .join(". ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

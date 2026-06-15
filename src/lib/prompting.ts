import { pad, sceneTimeToFileLabel } from "./format.js";
import type { ImageProvider } from "./constants.js";
import type { ChannelBible, CharacterBible, Prompt, Scene, StyleBible, ThumbnailPrompt } from "./schemas.js";

export function createPrompts(
  scenes: Scene[],
  styleBible: StyleBible,
  characterBible: CharacterBible,
  provider: ImageProvider,
  channelBible?: ChannelBible
): Prompt[] {
  return scenes.map((scene) => ({
    scene_number: scene.scene_number,
    image_filename: imageFilenameForScene(scene),
    prompt: buildPrompt(scene, styleBible, characterBible, channelBible),
    negative_prompt: [...styleBible.prompt_rules.avoid, ...(channelBible?.prompt_rules.avoid ?? [])].join(", "),
    provider
  }));
}

export function createThumbnailPrompts(
  scenes: Scene[],
  styleBible: StyleBible,
  characterBible: CharacterBible,
  channelBible?: ChannelBible
): ThumbnailPrompt[] {
  const opening = scenes[0];
  const payoff = scenes.at(-1);
  const middle = scenes[Math.max(0, Math.floor(scenes.length / 2))];
  const candidates = [
    {
      title: "Opening tension",
      scene: opening,
      rationale: "Best when the first frame needs to make the premise instantly readable."
    },
    {
      title: "The turn",
      scene: middle,
      rationale: "Best when the video has a relatable middle twist or escalation."
    },
    {
      title: "Payoff frame",
      scene: payoff,
      rationale: "Best when the ending image carries curiosity or emotional payoff."
    }
  ].filter((candidate): candidate is { title: string; scene: Scene; rationale: string } => Boolean(candidate.scene));

  return candidates.map((candidate, index) => ({
    thumbnail_number: index + 1,
    title: candidate.title,
    image_filename: `thumbnail_${pad(index + 1, 2)}_${slug(candidate.title)}.png`,
    prompt: buildThumbnailPrompt(candidate.scene, styleBible, characterBible, channelBible),
    negative_prompt: [...styleBible.prompt_rules.avoid, ...(channelBible?.prompt_rules.avoid ?? [])].join(", "),
    rationale: candidate.rationale
  }));
}

export function imageFilenameForScene(scene: Scene): string {
  return `scene_${pad(scene.scene_number, 3)}_${sceneTimeToFileLabel(scene.start)}_to_${sceneTimeToFileLabel(
    scene.end
  )}.png`;
}

function buildPrompt(
  scene: Scene,
  styleBible: StyleBible,
  characterBible: CharacterBible,
  channelBible?: ChannelBible
): string {
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
    channelBible ? `Channel audience: ${channelBible.audience}` : "",
    channelBible ? `Channel voice: ${channelBible.voice.tone}` : "",
    styleBible.prompt_rules.always_include.length > 0
      ? `Always include: ${styleBible.prompt_rules.always_include.join(", ")}`
      : "",
    channelBible?.prompt_rules.always_include.length
      ? `Channel rules: ${channelBible.prompt_rules.always_include.join(", ")}`
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

function buildThumbnailPrompt(
  scene: Scene,
  styleBible: StyleBible,
  characterBible: CharacterBible,
  channelBible?: ChannelBible
): string {
  const base = buildPrompt(scene, styleBible, characterBible, channelBible);
  const thumbnailRules = channelBible?.prompt_rules.thumbnail_rules ?? [];
  return [
    base,
    "Thumbnail composition: bold single focal point, readable at small size, strong silhouette, clear emotional contrast",
    thumbnailRules.length > 0 ? `Thumbnail rules: ${thumbnailRules.join(", ")}` : "",
    "Avoid tiny text, multiple competing subjects, clutter, ambiguous expression"
  ]
    .filter(Boolean)
    .join(". ");
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

import type { Prompt } from "./schemas.js";

export function parseSceneSelection(raw: string): Set<number> {
  const sceneNumbers = raw
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((value) => Number(value));

  const invalidValue = sceneNumbers.find((value) => !Number.isInteger(value) || value < 1);

  if (sceneNumbers.length === 0 || invalidValue !== undefined) {
    throw new Error(`Invalid --scene value "${raw}". Use positive scene numbers like 1,5,7.`);
  }

  return new Set(sceneNumbers);
}

export function selectPrompts(
  prompts: Prompt[],
  options: { scene?: string; fromScene?: string | number } = {}
): { selected: Prompt[]; fromScene: number; sceneSelection?: Set<number>; filterDescription: string } {
  const fromScene = options.fromScene ? Number(options.fromScene) : 1;
  const sceneSelection = options.scene ? parseSceneSelection(options.scene) : undefined;
  const selected = sceneSelection
    ? prompts.filter((prompt) => sceneSelection.has(prompt.scene_number))
    : prompts.filter((prompt) => prompt.scene_number >= fromScene);
  const filterDescription = sceneSelection
    ? `scene(s) ${[...sceneSelection].join(", ")}`
    : `scene ${fromScene} or later`;

  return { selected, fromScene, sceneSelection, filterDescription };
}

import { stringify } from "csv-stringify/sync";
import type { Prompt, Scene } from "./schemas.js";

export interface EditManifestRow {
  scene_number: number;
  start: string;
  end: string;
  duration_seconds: number;
  image_filename: string;
  transcript: string;
  visual_goal: string;
}

export function createEditManifestRows(scenes: Scene[], prompts: Prompt[]): EditManifestRow[] {
  const promptsByScene = new Map(prompts.map((prompt) => [prompt.scene_number, prompt]));

  return scenes.map((scene) => ({
    scene_number: scene.scene_number,
    start: scene.start,
    end: scene.end,
    duration_seconds: scene.duration_seconds,
    image_filename: promptsByScene.get(scene.scene_number)?.image_filename ?? "",
    transcript: scene.transcript,
    visual_goal: scene.visual_goal
  }));
}

export function manifestRowsToCsv(rows: EditManifestRow[]): string {
  return stringify(rows, {
    header: true,
    columns: [
      "scene_number",
      "start",
      "end",
      "duration_seconds",
      "image_filename",
      "transcript",
      "visual_goal"
    ]
  });
}

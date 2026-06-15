import { sceneTimeToSrtTime, sceneTimeToVttTime } from "./format.js";
import type { Scene } from "./schemas.js";

export function generateSrt(scenes: Scene[]): string {
  return scenes
    .map(
      (scene) =>
        `${scene.scene_number}\n${sceneTimeToSrtTime(scene.start)} --> ${sceneTimeToSrtTime(
          scene.end
        )}\n${scene.transcript}`
    )
    .join("\n\n");
}

export function generateVtt(scenes: Scene[]): string {
  const cues = scenes
    .map(
      (scene) =>
        `${sceneTimeToVttTime(scene.start)} --> ${sceneTimeToVttTime(scene.end)}\n${scene.transcript}`
    )
    .join("\n\n");

  return `WEBVTT\n\n${cues}`;
}

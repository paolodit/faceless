import path from "node:path";
import { stringify } from "csv-stringify/sync";
import { sceneTimeToSeconds } from "./format.js";
import type { Prompt, Scene } from "./schemas.js";

export type TimelineCsvTarget = "premiere" | "davinci" | "capcut";

export function createTimelineRows(projectRoot: string, scenes: Scene[], prompts: Prompt[]): TimelineRow[] {
  const promptsByScene = new Map(prompts.map((prompt) => [prompt.scene_number, prompt]));

  return scenes.map((scene) => {
    const prompt = promptsByScene.get(scene.scene_number);
    return {
      scene_number: scene.scene_number,
      start_seconds: sceneTimeToSeconds(scene.start),
      end_seconds: sceneTimeToSeconds(scene.end),
      duration_seconds: scene.duration_seconds,
      start_timecode: secondsToTimecode(sceneTimeToSeconds(scene.start)),
      end_timecode: secondsToTimecode(sceneTimeToSeconds(scene.end)),
      asset_path: prompt
        ? path.join(projectRoot, "output", "04_images", "full", prompt.image_filename)
        : "",
      image_filename: prompt?.image_filename ?? "",
      transcript: scene.transcript,
      visual_goal: scene.visual_goal
    };
  });
}

export function timelineRowsToCsv(rows: TimelineRow[], target: TimelineCsvTarget): string {
  const columns =
    target === "premiere"
      ? [
          "scene_number",
          "start_timecode",
          "end_timecode",
          "duration_seconds",
          "image_filename",
          "transcript",
          "visual_goal"
        ]
      : target === "capcut"
        ? [
            "scene_number",
            "start_seconds",
            "duration_seconds",
            "image_filename",
            "asset_path",
            "transcript",
            "visual_goal",
            "assembly_note"
          ]
      : [
          "scene_number",
          "start_seconds",
          "end_seconds",
          "duration_seconds",
          "asset_path",
          "transcript",
          "visual_goal"
        ];

  return stringify(target === "capcut" ? createCapCutRows(rows) : rows, { header: true, columns });
}

export function createCapCutRows(rows: TimelineRow[]): CapCutTimelineRow[] {
  return rows.map((row) => ({
    ...row,
    assembly_note: `Import media, set duration to ${row.duration_seconds}s, align after scene ${row.scene_number - 1 || "start"}.`
  }));
}

export function capCutAssemblyGuide(projectName: string): string {
  return `# CapCut Assembly Pack

Project: ${projectName}

CapCut does not have a stable public timeline interchange format in this CLI. This pack is designed for reliable manual assembly.

## Import

1. Open CapCut and create a new project.
2. Import the voiceover from your input folder.
3. Import generated images from \`output/04_images/scenes/\` when available, or \`output/04_images/full/\` for the legacy flat set.
4. Import any downloaded stock assets from \`output/06_edit_pack/stock_assets/\`.
5. Import captions from \`output/05_captions/captions.srt\`.

## Assemble

Use:

- \`output/06_edit_pack/timelines/capcut_timeline.csv\`
- \`output/06_edit_pack/edit_manifest.csv\`
- \`output/06_edit_pack/overlay_text.csv\`

Set each image duration from the CSV, keep media in scene order, then add overlay text where it helps the edit.

## Notes

- Treat stock assets as optional cutaways.
- If a scene has \`video/clip.mp4\`, use it before the still image for that scene.
- Use \`output/06_edit_pack/stock_assets/credits.md\` if automatic stock downloads were used.
- Keep text overlays in CapCut rather than relying on generated image text for important words.
`;
}

export function timelineRowsToFcpxml(rows: TimelineRow[], projectName: string): string {
  const resources = rows
    .map(
      (row) => `    <asset id="asset${row.scene_number}" name="${xml(row.image_filename)}" src="${xml(
        fileUrl(row.asset_path)
      )}" hasVideo="1" />`
    )
    .join("\n");
  const clips = rows
    .map(
      (row) => `          <asset-clip name="${xml(row.image_filename || `Scene ${row.scene_number}`)}" ref="asset${
        row.scene_number
      }" offset="${secondsToFcpxml(row.start_seconds)}" duration="${secondsToFcpxml(row.duration_seconds)}">
            <note>${xml(row.transcript)}</note>
          </asset-clip>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="format1" name="FFVideoFormat1080p2997" frameDuration="1001/30000s" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)" />
${resources}
  </resources>
  <library>
    <event name="${xml(projectName)}">
      <project name="${xml(projectName)}">
        <sequence format="format1" duration="${secondsToFcpxml(rows.at(-1)?.end_seconds ?? 0)}">
          <spine>
${clips}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;
}

export function secondsToTimecode(seconds: number, fps = 30): string {
  const totalFrames = Math.round(seconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const secs = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}:${pad(frames)}`;
}

function secondsToFcpxml(seconds: number): string {
  return `${Math.max(1, Math.round(seconds * 1000))}/1000s`;
}

function fileUrl(filePath: string): string {
  if (!filePath) {
    return "";
  }

  return `file://localhost/${filePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1%3A")}`;
}

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export interface TimelineRow {
  scene_number: number;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  start_timecode: string;
  end_timecode: string;
  asset_path: string;
  image_filename: string;
  transcript: string;
  visual_goal: string;
}

export interface CapCutTimelineRow extends TimelineRow {
  assembly_note: string;
}

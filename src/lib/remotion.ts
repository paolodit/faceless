import path from "node:path";
import fs from "fs-extra";
import { displayPath, writeJsonFile, writeTextFile, type WriteResult } from "./files.js";
import { sceneTimeToSeconds, slugifyName } from "./format.js";
import type { OutputProfile } from "./profiles.js";
import type { ProjectConfig, Prompt, Scene, VisualEvent, VisualEventScenePlan } from "./schemas.js";

export interface RemotionExportOptions {
  projectRoot: string;
  outputFolder: string;
  config: ProjectConfig;
  profile: OutputProfile;
  scenes: Scene[];
  prompts: Prompt[];
  plans: VisualEventScenePlan[];
  events: VisualEvent[];
  audioFile?: string;
  force?: boolean;
}

export interface RemotionExportSummary {
  remotionFolder: string;
  copiedAssets: number;
  writes: WriteResult[];
}

interface CopiedAsset {
  src: string;
  filename: string;
  kind: "image" | "video" | "audio";
}

interface RemotionSceneData {
  sceneNumber: number;
  startSeconds: number;
  durationSeconds: number;
  transcript: string;
  visualGoal: string;
  image: CopiedAsset | null;
  pacingMode: string;
  events: RemotionEventData[];
}

interface RemotionEventData {
  eventId: string;
  type: string;
  sourceType: string;
  offsetSeconds: number;
  durationSeconds: number;
  text: string;
  label: string;
  style: string;
  animation: string;
  motion: string;
  notes: string;
  asset: CopiedAsset | null;
}

interface RemotionProjectData {
  projectName: string;
  profile: string;
  aspectRatio: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  durationSeconds: number;
  audio: CopiedAsset | null;
  scenes: RemotionSceneData[];
}

export async function writeRemotionProject(options: RemotionExportOptions): Promise<RemotionExportSummary> {
  const remotionFolder = path.join(options.outputFolder, "08_remotion");
  const publicFolder = path.join(remotionFolder, "public");
  const srcFolder = path.join(remotionFolder, "src");
  const dataFolder = path.join(srcFolder, "data");
  const imageAssets = await copySceneImages(options, path.join(publicFolder, "assets", "images"));
  const stockAssets = await copyStockAssets(options, path.join(publicFolder, "assets", "stock"));
  const audio = await copyAudioAsset(options, path.join(publicFolder, "assets", "audio"));
  const data = remotionProjectData(options, imageAssets.assets, stockAssets.assets, audio.asset);

  const writes = await Promise.all([
    writeTextFile(path.join(remotionFolder, "package.json"), remotionPackageJson(options.config.project_name), options),
    writeTextFile(path.join(remotionFolder, "tsconfig.json"), remotionTsConfig(), options),
    writeTextFile(path.join(remotionFolder, "README.md"), remotionReadme(options.config.project_name), options),
    writeTextFile(path.join(srcFolder, "index.ts"), remotionIndexTs(), options),
    writeTextFile(path.join(srcFolder, "Root.tsx"), remotionRootTsx(), options),
    writeJsonFile(path.join(dataFolder, "project-data.json"), data, options),
    writeTextFile(path.join(dataFolder, "project-data.ts"), remotionDataTs(data), options)
  ]);

  return {
    remotionFolder,
    copiedAssets: imageAssets.assets.size + stockAssets.assets.size + (audio.asset ? 1 : 0),
    writes: [...writes, ...imageAssets.writes, ...stockAssets.writes, ...audio.writes]
  };
}

function remotionProjectData(
  options: RemotionExportOptions,
  imageAssets: Map<string, CopiedAsset>,
  stockAssets: Map<string, CopiedAsset>,
  audio?: CopiedAsset
): RemotionProjectData {
  const dimensions = dimensionsForAspectRatio(options.profile.aspectRatio);
  const fps = 30;
  const promptByScene = new Map(options.prompts.map((prompt) => [prompt.scene_number, prompt]));
  const planByScene = new Map(options.plans.map((plan) => [plan.scene_number, plan]));
  const eventsByScene = groupEventsByScene(options.events);
  const durationSeconds = Math.max(
    1,
    ...options.scenes.map((scene) => sceneTimeToSeconds(scene.end)),
    options.scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0)
  );

  return {
    projectName: options.config.project_name,
    profile: options.config.profile,
    aspectRatio: options.profile.aspectRatio,
    width: dimensions.width,
    height: dimensions.height,
    fps,
    durationInFrames: Math.max(1, Math.ceil(durationSeconds * fps)),
    durationSeconds,
    audio: audio ?? null,
    scenes: options.scenes.map((scene) => {
      const prompt = promptByScene.get(scene.scene_number);
      const sceneEvents = eventsByScene.get(scene.scene_number) ?? [];

      return {
        sceneNumber: scene.scene_number,
        startSeconds: sceneTimeToSeconds(scene.start),
        durationSeconds: scene.duration_seconds,
        transcript: scene.transcript,
        visualGoal: scene.visual_goal,
        image: prompt ? imageAssets.get(prompt.image_filename) ?? null : null,
        pacingMode: planByScene.get(scene.scene_number)?.pacing_mode ?? "steady",
        events: sceneEvents.map((event) => ({
          eventId: event.event_id,
          type: event.type,
          sourceType: event.source_type ?? "",
          offsetSeconds: event.offset_seconds,
          durationSeconds: event.duration_seconds,
          text: event.text ?? "",
          label: event.label ?? "",
          style: event.style ?? "",
          animation: event.animation ?? "",
          motion: event.motion ?? "",
          notes: event.notes ?? "",
          asset: stockAssets.get(event.event_id) ?? null
        }))
      };
    })
  };
}

async function copySceneImages(
  options: RemotionExportOptions,
  destinationFolder: string
): Promise<{ assets: Map<string, CopiedAsset>; writes: WriteResult[] }> {
  const assets = new Map<string, CopiedAsset>();
  const writes: WriteResult[] = [];

  for (const prompt of options.prompts) {
    const source = path.join(options.outputFolder, "04_images", "full", prompt.image_filename);
    if (!(await fs.pathExists(source))) {
      continue;
    }

    const filename = safeAssetFilename(prompt.image_filename);
    const destination = path.join(destinationFolder, filename);
    writes.push(await copyOutputFile(source, destination, options.force));
    assets.set(prompt.image_filename, {
      src: `assets/images/${filename}`,
      filename,
      kind: "image"
    });
  }

  return { assets, writes };
}

async function copyStockAssets(
  options: RemotionExportOptions,
  destinationFolder: string
): Promise<{ assets: Map<string, CopiedAsset>; writes: WriteResult[] }> {
  const reportPath = path.join(options.outputFolder, "06_edit_pack", "stock_assets", "download_report.json");
  const assets = new Map<string, CopiedAsset>();
  const writes: WriteResult[] = [];

  if (!(await fs.pathExists(reportPath))) {
    return { assets, writes };
  }

  const report = (await fs.readJson(reportPath)) as {
    results?: Array<{ event_id?: string; relative_path?: string; status?: string; media_type?: string }>;
  };

  for (const result of report.results ?? []) {
    if (!result.event_id || !result.relative_path || (result.status !== "downloaded" && result.status !== "skipped")) {
      continue;
    }

    const source = path.resolve(options.projectRoot, result.relative_path);
    if (!(await fs.pathExists(source))) {
      continue;
    }

    const filename = safeAssetFilename(path.basename(source));
    const destination = path.join(destinationFolder, filename);
    writes.push(await copyOutputFile(source, destination, options.force));
    assets.set(result.event_id, {
      src: `assets/stock/${filename}`,
      filename,
      kind: result.media_type === "video" || isVideoFile(filename) ? "video" : "image"
    });
  }

  return { assets, writes };
}

async function copyAudioAsset(
  options: RemotionExportOptions,
  destinationFolder: string
): Promise<{ asset?: CopiedAsset; writes: WriteResult[] }> {
  if (!options.audioFile || !(await fs.pathExists(options.audioFile))) {
    return { writes: [] };
  }

  const extension = path.extname(options.audioFile) || ".mp3";
  const filename = `voiceover${extension.toLowerCase()}`;
  const destination = path.join(destinationFolder, filename);
  const write = await copyOutputFile(options.audioFile, destination, options.force);

  return {
    asset: {
      src: `assets/audio/${filename}`,
      filename,
      kind: "audio"
    },
    writes: [write]
  };
}

async function copyOutputFile(source: string, destination: string, force = false): Promise<WriteResult> {
  await fs.ensureDir(path.dirname(destination));

  if (!force && (await fs.pathExists(destination))) {
    return { filePath: destination, written: false };
  }

  await fs.copyFile(source, destination);
  return { filePath: destination, written: true };
}

function groupEventsByScene(events: VisualEvent[]): Map<number, VisualEvent[]> {
  const grouped = new Map<number, VisualEvent[]>();

  for (const event of events) {
    grouped.set(event.scene_number, [...(grouped.get(event.scene_number) ?? []), event]);
  }

  return grouped;
}

function dimensionsForAspectRatio(aspectRatio: string): { width: number; height: number } {
  if (aspectRatio === "16:9") {
    return { width: 1920, height: 1080 };
  }

  if (aspectRatio === "1:1") {
    return { width: 1080, height: 1080 };
  }

  if (aspectRatio === "4:5") {
    return { width: 1080, height: 1350 };
  }

  return { width: 1080, height: 1920 };
}

function safeAssetFilename(filename: string): string {
  const extension = path.extname(filename).toLowerCase();
  const stem = path.basename(filename, extension);
  const slug = slugifyName(stem) || "asset";
  return `${slug}${extension || ".png"}`;
}

function isVideoFile(filename: string): boolean {
  return [".mp4", ".mov", ".webm"].includes(path.extname(filename).toLowerCase());
}

function remotionPackageJson(projectName: string): string {
  const name = slugifyName(projectName) || "faceless-remotion-draft";

  return `${JSON.stringify(
    {
      name: `${name}-remotion`,
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: {
        dev: "remotion studio src/index.ts",
        preview: "remotion studio src/index.ts",
        render: "remotion render src/index.ts FacelessVideo render/video.mp4",
        still: "remotion still src/index.ts FacelessVideo stills/preview.png"
      },
      dependencies: {
        "@remotion/cli": "^4.0.0",
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        remotion: "^4.0.0"
      },
      devDependencies: {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        typescript: "^5.5.3"
      }
    },
    null,
    2
  )}\n`;
}

function remotionTsConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        lib: ["DOM", "DOM.Iterable", "ES2022"],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: "ESNext",
        moduleResolution: "Node",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx"
      },
      include: ["src"]
    },
    null,
    2
  )}\n`;
}

function remotionReadme(projectName: string): string {
  return `# Remotion Draft

Project: ${projectName}

This folder is an optional Remotion preview/render output generated by faceless video-pack.

It turns the approved scene images, optional stock assets, overlay events, captions and voiceover into a code-driven video draft.

## Preview

\`\`\`bash
npm install
npm run dev
\`\`\`

Remotion Studio opens in your browser. Use it to scrub the draft, inspect scene timing and make quick motion notes.

## Render

\`\`\`bash
npm run render
\`\`\`

The rendered MP4 is written to:

\`\`\`text
render/video.mp4
\`\`\`

## Notes

- Missing scene images render as readable placeholders.
- Regenerate this folder with \`video-pack remotion --project <project> --force\` after changing images, stock assets or visual events.
- This is a practical draft renderer, not a replacement for final human taste.
- Premiere, DaVinci, FCPXML and CapCut outputs are still available in \`../06_edit_pack/\`.
`;
}

function remotionIndexTs(): string {
  return `import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
`;
}

function remotionDataTs(data: RemotionProjectData): string {
  return `export const projectData = ${JSON.stringify(data, null, 2)} as const;
`;
}

function remotionRootTsx(): string {
  return `import React from "react";
import {
  AbsoluteFill,
  Composition,
  Html5Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import { projectData } from "./data/project-data";

type AssetData = {
  readonly src: string;
  readonly filename: string;
  readonly kind: "image" | "video" | "audio";
};

type EventData = {
  readonly eventId: string;
  readonly type: string;
  readonly sourceType: string;
  readonly offsetSeconds: number;
  readonly durationSeconds: number;
  readonly text: string;
  readonly label: string;
  readonly style: string;
  readonly animation: string;
  readonly motion: string;
  readonly notes: string;
  readonly asset: AssetData | null;
};

type SceneData = {
  readonly sceneNumber: number;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly transcript: string;
  readonly visualGoal: string;
  readonly image: AssetData | null;
  readonly pacingMode: string;
  readonly events: readonly EventData[];
};

type RemotionData = {
  readonly projectName: string;
  readonly profile: string;
  readonly aspectRatio: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly durationInFrames: number;
  readonly durationSeconds: number;
  readonly audio: AssetData | null;
  readonly scenes: readonly SceneData[];
};

const data = projectData as RemotionData;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FacelessVideo"
      component={FacelessVideo}
      durationInFrames={data.durationInFrames}
      fps={data.fps}
      width={data.width}
      height={data.height}
    />
  );
};

const FacelessVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#101113" }}>
      {data.audio ? <Html5Audio src={staticFile(data.audio.src)} /> : null}
      {data.scenes.map((scene) => (
        <Sequence
          key={scene.sceneNumber}
          from={Math.round(scene.startSeconds * fps)}
          durationInFrames={Math.max(1, Math.round(scene.durationSeconds * fps))}
        >
          <SceneFrame scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const SceneFrame: React.FC<{ scene: SceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationFrames = Math.max(1, Math.round(scene.durationSeconds * fps));
  const progress = Math.min(1, frame / durationFrames);
  const pad = Math.round(Math.min(width, height) * 0.055);
  const imageScale =
    scene.pacingMode === "burst"
      ? interpolate(progress, [0, 1], [1.09, 1.02])
      : scene.pacingMode === "landing"
        ? interpolate(progress, [0, 1], [1.02, 1])
        : interpolate(progress, [0, 1], [1.04, 1.09]);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: backgroundFor(scene.pacingMode) }}>
      <AbsoluteFill style={{ transform: \`scale(\${imageScale})\`, opacity: scene.image ? 1 : 0.45 }}>
        {scene.image ? <MediaAsset asset={scene.image} fit="cover" /> : <Placeholder scene={scene} />}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.04) 35%, rgba(0,0,0,0.68) 100%)"
        }}
      />
      <div
        style={{
          position: "absolute",
          top: pad,
          left: pad,
          borderRadius: 999,
          padding: "10px 16px",
          color: "white",
          background: "rgba(0,0,0,0.48)",
          fontFamily: fontStack,
          fontSize: Math.round(width * 0.022),
          fontWeight: 700,
          letterSpacing: 0
        }}
      >
        Scene {scene.sceneNumber} / {scene.pacingMode}
      </div>
      {scene.events
        .filter((event) => event.asset)
        .map((event, index) => (
          <Cutaway key={event.eventId} event={event} index={index} />
        ))}
      {scene.events
        .filter((event) => event.type === "text" || event.type === "overlay")
        .map((event, index) => (
          <Overlay key={event.eventId} event={event} index={index} />
        ))}
      <Caption text={scene.transcript} visualGoal={scene.visualGoal} />
    </AbsoluteFill>
  );
};

const MediaAsset: React.FC<{ asset: AssetData; fit?: "cover" | "contain" }> = ({ asset, fit = "cover" }) => {
  if (asset.kind === "video") {
    return (
      <OffthreadVideo
        src={staticFile(asset.src)}
        muted
        style={{ width: "100%", height: "100%", objectFit: fit }}
      />
    );
  }

  return <Img src={staticFile(asset.src)} style={{ width: "100%", height: "100%", objectFit: fit }} />;
};

const Cutaway: React.FC<{ event: EventData; index: number }> = ({ event, index }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const start = Math.round(event.offsetSeconds * fps);
  const end = start + Math.max(1, Math.round(event.durationSeconds * fps));

  if (!event.asset || frame < start || frame > end) {
    return null;
  }

  const local = frame - start;
  const opacity = interpolate(local, [0, 8, Math.max(9, end - start - 8), end - start], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const cardWidth = Math.round(width * (width > height ? 0.28 : 0.54));
  const cardHeight = Math.round(cardWidth * 0.62);
  const right = Math.round(width * 0.06);
  const top = Math.round(height * (0.16 + index * 0.12));

  return (
    <div
      style={{
        position: "absolute",
        right,
        top,
        width: cardWidth,
        height: cardHeight,
        opacity,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        border: "2px solid rgba(255,255,255,0.72)",
        transform: \`translateY(\${(1 - opacity) * 22}px)\`
      }}
    >
      <MediaAsset asset={event.asset} fit="cover" />
    </div>
  );
};

const Overlay: React.FC<{ event: EventData; index: number }> = ({ event, index }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const start = Math.round(event.offsetSeconds * fps);
  const end = start + Math.max(1, Math.round(event.durationSeconds * fps));

  if (!event.text || frame < start || frame > end) {
    return null;
  }

  const local = frame - start;
  const enter = interpolate(local, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [Math.max(start, end - 10), end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const opacity = Math.min(enter, exit);
  const isHeadline = event.style.includes("term") || event.type === "text";
  const maxWidth = width > height ? width * 0.56 : width * 0.82;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: isHeadline ? "22%" : \`\${35 + index * 9}%\`,
        maxWidth,
        transform: \`translate(-50%, \${(1 - enter) * 28}px) scale(\${0.96 + enter * 0.04})\`,
        opacity,
        color: "white",
        background: isHeadline ? "rgba(11,17,24,0.82)" : "rgba(255,255,255,0.92)",
        border: isHeadline ? "1px solid rgba(255,255,255,0.35)" : "0",
        borderRadius: isHeadline ? 18 : 14,
        padding: isHeadline ? "18px 26px" : "14px 20px",
        boxShadow: "0 22px 70px rgba(0,0,0,0.38)",
        fontFamily: fontStack,
        fontSize: isHeadline ? Math.round(width * 0.05) : Math.round(width * 0.032),
        fontWeight: isHeadline ? 900 : 760,
        lineHeight: 1.05,
        textAlign: "center",
        letterSpacing: 0
      }}
    >
      <span style={{ color: isHeadline ? "white" : "#111318" }}>{event.text}</span>
    </div>
  );
};

const Caption: React.FC<{ text: string; visualGoal: string }> = ({ text, visualGoal }) => {
  const { width, height } = useVideoConfig();
  const caption = text || visualGoal;
  const bottom = Math.round(height * 0.055);
  const side = Math.round(width * 0.065);

  if (!caption) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: side,
        right: side,
        bottom,
        color: "white",
        background: "rgba(7,9,12,0.74)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 16,
        padding: "18px 22px",
        fontFamily: fontStack,
        fontSize: Math.round(width * (width > height ? 0.023 : 0.044)),
        fontWeight: 760,
        lineHeight: 1.16,
        textAlign: "center",
        boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
        overflow: "hidden",
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 4
      }}
    >
      {caption}
    </div>
  );
};

const Placeholder: React.FC<{ scene: SceneData }> = ({ scene }) => {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: "10%",
        fontFamily: fontStack,
        color: "white",
        background:
          "linear-gradient(135deg, rgba(30,39,46,1) 0%, rgba(47,57,66,1) 44%, rgba(20,22,25,1) 100%)"
      }}
    >
      <div style={{ fontSize: 44, fontWeight: 900, marginBottom: 20 }}>Scene {scene.sceneNumber}</div>
      <div style={{ fontSize: 26, maxWidth: 760, lineHeight: 1.18, textAlign: "center", opacity: 0.86 }}>
        {scene.visualGoal || "Image placeholder"}
      </div>
    </AbsoluteFill>
  );
};

function backgroundFor(pacingMode: string): string {
  if (pacingMode === "burst") {
    return "#171b21";
  }

  if (pacingMode === "additive") {
    return "#18211f";
  }

  if (pacingMode === "landing") {
    return "#201c18";
  }

  return "#15181d";
}

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
`;
}

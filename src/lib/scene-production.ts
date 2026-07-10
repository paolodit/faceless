import { escapeMarkdownTableCell, pad } from "./format.js";
import type { ConcreteSceneLayoutMode } from "./constants.js";
import type {
  PacingMode,
  ProjectConfig,
  Scene,
  SceneProductionContinuity,
  SceneProductionLayer,
  SceneProductionPlan
} from "./schemas.js";

export function createSceneProductionPlan(options: {
  config: ProjectConfig;
  scene: Scene;
  index: number;
  totalScenes: number;
  pacing: PacingMode;
}): SceneProductionPlan {
  const requested = options.config.scene_production.default_layout;
  const layout =
    requested === "auto"
      ? selectLayoutMode(options.config, options.scene, options.pacing)
      : requested;
  const continuity = selectContinuity(options.config, options.config.scene_production.continuity, layout);
  const continuityGroup = continuityGroupFor(layout, continuity, options.index, options.scene.scene_number);
  const anatomy = anatomyForLayout(options.config, options.scene, layout, options.pacing);
  const layers = layersForLayout(options.config, options.scene, layout, options.pacing);

  return {
    scene_number: options.scene.scene_number,
    layout_mode: layout,
    requested_layout: requested,
    continuity_group: continuityGroup,
    continuity,
    pacing_mode: options.pacing,
    ...anatomy,
    expected_assets: expectedAssets(layout, layers),
    layers,
    editor_notes: editorNotesFor(layout, options.pacing)
  };
}

export function sceneProductionMarkdown(plans: SceneProductionPlan[], scenes: Scene[]): string {
  const sceneByNumber = new Map(scenes.map((scene) => [scene.scene_number, scene]));
  const sections = plans.map((plan) => {
    const scene = sceneByNumber.get(plan.scene_number);
    const layerRows = plan.layers
      .map(
        (layer) =>
          `| ${layer.layer_id} | ${layer.role} | ${escapeMarkdownTableCell(layer.description)} | ${escapeMarkdownTableCell(
            layer.timing
          )} | ${escapeMarkdownTableCell(layer.asset_hint)} |`
      )
      .join("\n");

    return `## Scene ${plan.scene_number} - ${plan.layout_mode}

Time: ${scene?.start ?? ""} to ${scene?.end ?? ""}

Pacing: \`${plan.pacing_mode}\`

Continuity: \`${plan.continuity}\` / \`${plan.continuity_group}\`

Base frame:

${plan.base_frame}

Background / middle / foreground:

- Background: ${plan.background}
- Middle ground: ${plan.middle_ground}
- Foreground: ${plan.foreground}

Camera / motion:

- Camera: ${plan.camera}
- Motion: ${plan.motion}
- Layering: ${plan.layering}

Expected assets:

${plan.expected_assets.map((asset) => `- ${asset}`).join("\n")}

Editor notes:

${plan.editor_notes.map((note) => `- ${note}`).join("\n")}

| Layer | Role | Description | Timing | Asset hint |
| --- | --- | --- | --- | --- |
${layerRows}
`;
  });

  return `# Scene Production

This is the scene grammar layer. It explains how each scene should be built before prompts, images, clips or editor assembly.

Layout modes:

- \`fast-cut\`: quick visual changes inside one narration beat.
- \`additive-slide\`: one base frame that gains layers or overlays over time.
- \`voxpop\`: consistent background, middle-ground subject and foreground props.
- \`montage\`: supporting cutaways and references carry the scene.
- \`single-image\`: one strong image hold.

${sections.join("\n")}`;
}

export function sceneProductionHtml(plans: SceneProductionPlan[], scenes: Scene[]): string {
  const sceneByNumber = new Map(scenes.map((scene) => [scene.scene_number, scene]));
  const summary = sceneProductionSummary(plans);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Scene Production Review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f8fb;
      --panel: #ffffff;
      --text: #17202f;
      --muted: #5f6c7b;
      --line: #d9e0ea;
      --accent: #116466;
      --accent-soft: #e7f2f2;
      --warn-soft: #fff4e5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.48;
    }
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 48px;
    }
    header {
      display: grid;
      gap: 14px;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: clamp(28px, 5vw, 44px); line-height: 1.05; letter-spacing: 0; }
    h2 { font-size: 20px; margin: 28px 0 12px; }
    h3 { font-size: 16px; }
    .muted { color: var(--muted); }
    .pills, .review-route, .assets {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pill {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 999px;
      padding: 5px 9px;
      color: var(--muted);
      font-size: 13px;
    }
    .callout {
      border-left: 4px solid var(--accent);
      background: var(--panel);
      padding: 14px 16px;
      border-radius: 6px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .scene, .guide {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 14px;
      min-width: 0;
    }
    .scene-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .layout {
      background: var(--accent-soft);
      color: var(--accent);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 12px;
      white-space: nowrap;
    }
    .body-grid {
      display: grid;
      gap: 10px;
    }
    .zone {
      border: 1px solid var(--line);
      border-radius: 5px;
      padding: 9px;
      background: #fbfcfe;
    }
    .zone strong {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    ul {
      margin: 6px 0 0 18px;
      padding: 0;
    }
    li { margin: 2px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 13px;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      padding: 7px 5px;
    }
    th { color: var(--muted); font-size: 12px; }
    .next {
      background: var(--warn-soft);
      border-color: #f0d3a6;
    }
    @media (max-width: 620px) {
      main { width: min(100% - 20px, 1180px); padding-top: 18px; }
      .scene-head { display: grid; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Scene Production Review</h1>
      <p class="muted">Review this before prompt generation, image generation, upscaling or scene video. It explains how each scene should be built.</p>
      <div class="pills">
        <span class="pill">${plans.length} scenes</span>
        <span class="pill">${escapeHtml(summary || "no layouts")}</span>
      </div>
      <section class="callout">
        <h2>Review Route</h2>
        <div class="review-route">
          <span class="pill">1. Check layout mode</span>
          <span class="pill">2. Check base frame</span>
          <span class="pill">3. Check layers</span>
          <span class="pill">4. Generate prompts</span>
          <span class="pill">5. Review images</span>
        </div>
      </section>
    </header>

    <section>
      <h2>Layout Guide</h2>
      <div class="grid">
        ${layoutGuideHtml()}
      </div>
    </section>

    <section>
      <h2>Scenes</h2>
      <div class="grid">
        ${plans.map((plan) => sceneCardHtml(plan, sceneByNumber.get(plan.scene_number))).join("\n")}
      </div>
    </section>
  </main>
</body>
</html>`;
}

export function sceneProductionSummary(plans: SceneProductionPlan[]): string {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    counts.set(plan.layout_mode, (counts.get(plan.layout_mode) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([layout, count]) => `${layout}: ${count}`)
    .join(", ");
}

function layoutGuideHtml(): string {
  const rows: Array<[string, string]> = [
    ["fast-cut", "Several quick readable beats inside one narration scene."],
    ["additive-slide", "One base frame that gains overlays or foreground elements over time."],
    ["voxpop", "A consistent interview-style setup with stable background and subject scale."],
    ["montage", "Anchor image plus cutaways, references or stock assets."],
    ["single-image", "One strong image hold carries the scene."]
  ];

  return rows
    .map(
      ([layout, detail]) => `<article class="guide">
  <h3>${escapeHtml(layout)}</h3>
  <p class="muted">${escapeHtml(detail)}</p>
</article>`
    )
    .join("\n");
}

function sceneCardHtml(plan: SceneProductionPlan, scene: Scene | undefined): string {
  return `<article class="scene">
  <div class="scene-head">
    <div>
      <h3>Scene ${plan.scene_number}</h3>
      <p class="muted">${escapeHtml(scene ? `${scene.start} to ${scene.end}` : "")}</p>
    </div>
    <span class="layout">${escapeHtml(plan.layout_mode)}</span>
  </div>
  <div class="body-grid">
    <div class="zone next">
      <strong>Use This When Reviewing</strong>
      <p>${escapeHtml(reviewInstruction(plan))}</p>
    </div>
    <div class="zone">
      <strong>Base Frame</strong>
      <p>${escapeHtml(plan.base_frame)}</p>
    </div>
    <div class="zone">
      <strong>Background</strong>
      <p>${escapeHtml(plan.background)}</p>
    </div>
    <div class="zone">
      <strong>Middle Ground</strong>
      <p>${escapeHtml(plan.middle_ground)}</p>
    </div>
    <div class="zone">
      <strong>Foreground</strong>
      <p>${escapeHtml(plan.foreground)}</p>
    </div>
    <div class="zone">
      <strong>Camera / Motion / Continuity</strong>
      <p>${escapeHtml(plan.camera)}</p>
      <p class="muted">${escapeHtml(plan.motion)}</p>
      <p class="muted">${escapeHtml(`${plan.continuity}: ${plan.continuity_group}`)}</p>
    </div>
    <div class="zone">
      <strong>Layering</strong>
      <p>${escapeHtml(plan.layering)}</p>
      <table>
        <thead><tr><th>Layer</th><th>Role</th><th>Timing</th><th>Asset</th></tr></thead>
        <tbody>
          ${plan.layers
            .map(
              (layer) => `<tr>
            <td>${escapeHtml(layer.description)}</td>
            <td>${escapeHtml(layer.role)}</td>
            <td>${escapeHtml(layer.timing)}</td>
            <td>${escapeHtml(layer.asset_hint)}</td>
          </tr>`
            )
            .join("\n")}
        </tbody>
      </table>
    </div>
    <div class="zone">
      <strong>Expected Assets</strong>
      <div class="assets">
        ${plan.expected_assets.map((asset) => `<span class="pill">${escapeHtml(asset)}</span>`).join("\n")}
      </div>
    </div>
    <div class="zone">
      <strong>Editor Notes</strong>
      <ul>${plan.editor_notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("\n")}</ul>
    </div>
  </div>
</article>`;
}

function reviewInstruction(plan: SceneProductionPlan): string {
  if (plan.layout_mode === "additive-slide") {
    return "The first image is the base slide. Later beats should build on it, not replace it with unrelated images.";
  }

  if (plan.layout_mode === "voxpop") {
    return "Check the background, subject scale and foreground prop stay consistent across this continuity group.";
  }

  if (plan.layout_mode === "fast-cut") {
    return "Check each visual beat is simple enough to read quickly.";
  }

  if (plan.layout_mode === "montage") {
    return "Check references, cutaways and stock assets are useful and can be credited.";
  }

  return "Check the single image is strong enough to carry the narration without extra clutter.";
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function selectLayoutMode(
  config: ProjectConfig,
  scene: Scene,
  pacing: PacingMode
): ConcreteSceneLayoutMode {
  const text = `${scene.transcript} ${scene.visual_goal} ${scene.notes}`.toLowerCase();

  if (config.pipeline === "linkedin-vox-pop") {
    if (pacing === "burst") {
      return "fast-cut";
    }

    return pacing === "additive" ? "additive-slide" : "voxpop";
  }

  if (/\b(vox ?pop|vox-pop|street interview|asked people|person on the street|interview)\b/i.test(text)) {
    return "voxpop";
  }

  if (pacing === "burst") {
    return "fast-cut";
  }

  if (pacing === "additive") {
    return "additive-slide";
  }

  return "single-image";
}

function selectContinuity(
  config: ProjectConfig,
  requested: SceneProductionContinuity,
  layout: ConcreteSceneLayoutMode
): Exclude<SceneProductionContinuity, "auto"> {
  if (requested !== "auto") {
    return requested;
  }

  if (layout === "voxpop") {
    return "segment";
  }

  if (config.pipeline === "narrated-visual-story") {
    return "segment";
  }

  if (layout === "additive-slide" || layout === "single-image") {
    return "scene";
  }

  return "none";
}

function continuityGroupFor(
  layout: ConcreteSceneLayoutMode,
  continuity: Exclude<SceneProductionContinuity, "auto">,
  index: number,
  sceneNumber: number
): string {
  if (continuity === "none") {
    return "none";
  }

  if (continuity === "segment") {
    return `${layout}_segment_${pad(Math.floor(index / 3) + 1, 2)}`;
  }

  return `scene_${pad(sceneNumber, 3)}`;
}

function anatomyForLayout(
  config: ProjectConfig,
  scene: Scene,
  layout: ConcreteSceneLayoutMode,
  pacing: PacingMode
): Omit<SceneProductionPlan, "scene_number" | "layout_mode" | "requested_layout" | "continuity_group" | "continuity" | "pacing_mode" | "expected_assets" | "layers" | "editor_notes"> {
  if (layout === "additive-slide") {
    return {
      base_frame: `Use the first frame as the stable visual anchor for scene ${scene.scene_number}.`,
      background: "Keep the background quiet and stable so later layers read clearly.",
      middle_ground: scene.visual_goal,
      foreground: "Add one readable overlay or visual object at a time.",
      camera: "Locked or very slow push; avoid reframing during the build.",
      motion: "Build in layers on top of the base frame.",
      layering: `Base frame plus up to ${config.scene_production.additive_layers} clear layers.`
    };
  }

  if (layout === "voxpop") {
    return {
      base_frame: "Use a reusable interview-style base frame for this segment.",
      background: config.scene_production.voxpop_background,
      middle_ground: config.scene_production.voxpop_middle_ground,
      foreground: config.scene_production.voxpop_foreground,
      camera: "Locked-off medium shot with consistent eyeline and framing.",
      motion: "Subtle subject motion or gentle push only; consistency matters more than spectacle.",
      layering: "Background stays stable, subject changes expression, foreground props/captions carry the beat."
    };
  }

  if (layout === "fast-cut") {
    return {
      base_frame: "No long base frame; use quick readable visual beats.",
      background: "Simple backgrounds that do not fight the fast pacing.",
      middle_ground: scene.visual_goal,
      foreground: "Large hook text or one bold prop/action.",
      camera: "Punchy crops, quick push-ins, or clean hard cuts.",
      motion: "Fast cutaway rhythm.",
      layering: "One idea per cut; do not stack too many elements at once."
    };
  }

  if (layout === "montage") {
    return {
      base_frame: "Use one anchor image plus optional reference/cutaway assets.",
      background: "Contextual location, texture, document, screenshot, or stock cutaway.",
      middle_ground: scene.visual_goal,
      foreground: "Short label, quote-style card, or evidence cue.",
      camera: "Editorial holds with clean cuts between supporting assets.",
      motion: "Slow push on anchor image; cutaways only when they add evidence.",
      layering: "Anchor, cutaway, reference, then return to anchor if useful."
    };
  }

  return {
    base_frame: "Use one strong readable frame for the whole scene.",
    background: "Simple background that supports the main idea.",
    middle_ground: scene.visual_goal,
    foreground: "Optional small prop or overlay if it clarifies the point.",
    camera: pacing === "landing" ? "Gentle hold." : "Subtle slow push.",
    motion: pacing === "landing" ? "Let the final frame breathe." : "Keep motion secondary to narration.",
    layering: "Avoid unnecessary layers; make the single visual do the work."
  };
}

function layersForLayout(
  config: ProjectConfig,
  scene: Scene,
  layout: ConcreteSceneLayoutMode,
  pacing: PacingMode
): SceneProductionLayer[] {
  if (layout === "additive-slide") {
    const maxLayers = config.scene_production.additive_layers;
    return [
      layer(scene, 1, "base", "Base frame for the scene", "start of scene", "image.png"),
      layer(scene, 2, "overlay", "First concept or label appears over the base frame", "early beat", "overlay_text.csv"),
      ...(maxLayers >= 2
        ? [layer(scene, 3, "foreground", "Second visual element or supporting object is added", "middle beat", "generated layer or editor shape")]
        : []),
      ...(maxLayers >= 3
        ? [layer(scene, 4, "overlay", "Final takeaway or contrast line completes the build", "late beat", "overlay_text.csv")]
        : [])
    ];
  }

  if (layout === "voxpop") {
    return [
      layer(scene, 1, "background", "Consistent interview background", "whole scene", "reuse within continuity group"),
      layer(scene, 2, "middle_ground", "Presenter or interview subject", "whole scene", "image.png"),
      layer(scene, 3, "foreground", "Mic, phone, caption card, or reaction object", "as needed", "foreground prop or overlay"),
      layer(scene, 4, "overlay", "Short speaker label or punchline caption", "key beat", "overlay_text.csv")
    ];
  }

  if (layout === "fast-cut") {
    return [
      layer(scene, 1, "base", "Opening hook frame", "first beat", "image.png"),
      layer(scene, 2, "cutaway", "Secondary hook cutaway", "middle beat", "stock or generated cutaway"),
      layer(scene, 3, "overlay", "Large readable hook text", "first or middle beat", "overlay_text.csv")
    ];
  }

  if (layout === "montage") {
    return [
      layer(scene, 1, "base", "Anchor visual", "start or return beat", "image.png"),
      layer(scene, 2, "reference", "Reference, screenshot, document, or stock cutaway", "supporting beat", "input/assets/ or stock_assets/"),
      layer(scene, 3, "overlay", "Short context label", "as needed", "overlay_text.csv")
    ];
  }

  return [layer(scene, 1, "base", "Single strong scene image", "whole scene", "image.png")];
}

function layer(
  scene: Scene,
  sequence: number,
  role: SceneProductionLayer["role"],
  description: string,
  timing: string,
  assetHint: string
): SceneProductionLayer {
  return {
    layer_id: `sp_${pad(scene.scene_number, 3)}_${pad(sequence, 2)}_${role}`,
    role,
    description,
    timing,
    asset_hint: assetHint
  };
}

function expectedAssets(layout: ConcreteSceneLayoutMode, layers: SceneProductionLayer[]): string[] {
  const assets = new Set<string>(["prompt.md", "image.png"]);

  if (layout === "additive-slide") {
    assets.add("scene_production.json");
    assets.add("overlay_text.csv");
  }

  if (layout === "voxpop") {
    assets.add("scene_production.json");
    assets.add("continuity reference for the voxpop segment");
  }

  if (layout === "montage" || layout === "fast-cut") {
    assets.add("optional stock or local cutaway assets");
  }

  for (const item of layers) {
    assets.add(item.asset_hint);
  }

  return [...assets];
}

function editorNotesFor(layout: ConcreteSceneLayoutMode, pacing: PacingMode): string[] {
  if (layout === "additive-slide") {
    return [
      "Treat the first image as the base slide for this scene.",
      "Add elements over time; do not regenerate a totally different composition for each beat.",
      "Keep all text or labels large enough for mobile review."
    ];
  }

  if (layout === "voxpop") {
    return [
      "Keep background, camera height and subject scale consistent inside the continuity group.",
      "Use foreground objects or short captions for variety.",
      "Do not let background changes imply a new location unless intended."
    ];
  }

  if (layout === "fast-cut") {
    return [
      "Favor two or three quick visual beats instead of one long hold.",
      "Use simple images because fast cuts punish visual clutter."
    ];
  }

  if (layout === "montage") {
    return [
      "Use cutaways only when they add context or proof.",
      "Track source and credit requirements for every external asset."
    ];
  }

  return [
    pacing === "landing" ? "Hold long enough for the takeaway to land." : "Let the main image carry the scene.",
    "Avoid adding layers unless they clarify the narration."
  ];
}

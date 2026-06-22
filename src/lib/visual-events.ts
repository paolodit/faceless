import path from "node:path";
import fs from "fs-extra";
import { stringify } from "csv-stringify/sync";
import { displayPath, writeJsonFile, writeTextFile, type WriteResult } from "./files.js";
import { escapeMarkdownTableCell, sceneTimeToSeconds, secondsToSceneTime, slugifyName } from "./format.js";
import { imageFilenameForScene } from "./prompting.js";
import type { PacingMode, ProjectConfig, Scene, VisualEvent, VisualEventScenePlan } from "./schemas.js";

const STOCK_PROVIDER_SUGGESTIONS = ["Pexels", "Unsplash", "Pixabay"];

interface OverlayCue {
  text: string;
  style: string;
  animation: string;
  overlayKind: string;
  notes: string;
}

export interface LocalAssetReference {
  filename: string;
  relative_path: string;
  size_bytes: number;
}

export interface VisualEventWriteResult {
  plans: VisualEventScenePlan[];
  events: VisualEvent[];
  results: WriteResult[];
}

export interface StockAssetQueryRow {
  asset_id: string;
  event_id: string;
  scene_number: number;
  start_seconds: number;
  end_seconds: number;
  search_query: string;
  provider_suggestions: string;
  expected_filename: string;
  usage_note: string;
  credit_status: string;
}

const TERM_LIBRARY: Record<
  string,
  {
    display: string;
    definition: string;
    warning: string;
    search: string;
  }
> = {
  prompt: {
    display: "PROMPT",
    definition: "The instruction you give the AI.",
    warning: "Vague prompt = vague output.",
    search: "person typing clear AI prompt laptop workspace"
  },
  context: {
    display: "CONTEXT",
    definition: "The information the AI can see.",
    warning: "No context = generic output.",
    search: "documents knowledge base context window business desk"
  },
  memory: {
    display: "MEMORY",
    definition: "What carries across sessions.",
    warning: "Useful only when it stays relevant.",
    search: "organized notes memory system digital workspace"
  },
  rag: {
    display: "RAG",
    definition: "Retrieve the right knowledge before answering.",
    warning: "Search first, answer second.",
    search: "search results knowledge retrieval database AI"
  },
  agent: {
    display: "AGENT",
    definition: "AI that can take steps toward a goal.",
    warning: "Give it boundaries before tasks.",
    search: "automation workflow checklist AI agent business"
  },
  loop: {
    display: "LOOP",
    definition: "A repeated plan, act, check cycle.",
    warning: "Loops need stop rules.",
    search: "workflow loop iterative process whiteboard"
  },
  guardrails: {
    display: "GUARDRAILS",
    definition: "Rules that keep output inside bounds.",
    warning: "Constraints beat hope.",
    search: "safety rules checklist guardrails business software"
  },
  evals: {
    display: "EVALS",
    definition: "Tests for AI output quality.",
    warning: "Measure before scaling.",
    search: "quality testing dashboard evaluation metrics"
  }
};

export async function listLocalAssetReferences(
  assetsFolder: string,
  projectRoot: string
): Promise<LocalAssetReference[]> {
  if (!(await fs.pathExists(assetsFolder))) {
    return [];
  }

  const files = await collectFiles(assetsFolder);
  const references = await Promise.all(
    files.map(async (filePath) => {
      const stat = await fs.stat(filePath);
      return {
        filename: path.basename(filePath),
        relative_path: displayPath(projectRoot, filePath),
        size_bytes: stat.size
      };
    })
  );

  return references.sort((a, b) => a.relative_path.localeCompare(b.relative_path));
}

export function createVisualEventScenePlans(
  config: ProjectConfig,
  scenes: Scene[]
): VisualEventScenePlan[] {
  const visualConfig = config.visual_events;

  return scenes.map((scene, index) => {
    const pacing = selectPacingMode(config, scene, index, scenes.length);
    const role = sceneRole(index, scenes.length, pacing, scene);
    const events =
      visualConfig.enabled && visualConfig.mode !== "off"
        ? createEventsForScene(config, scene, index, scenes.length, pacing)
        : [];

    return {
      scene_number: scene.scene_number,
      scene_start: scene.start,
      scene_end: scene.end,
      scene_role: role,
      pacing_mode: pacing,
      transcript: scene.transcript,
      visual_goal: scene.visual_goal,
      events
    };
  });
}

export function flattenVisualEvents(plans: VisualEventScenePlan[]): VisualEvent[] {
  return plans.flatMap((plan) => plan.events);
}

export async function writeVisualEventOutputs(options: {
  projectRoot: string;
  outputFolder: string;
  config: ProjectConfig;
  scenes: Scene[];
  localAssets?: LocalAssetReference[];
  force?: boolean;
}): Promise<VisualEventWriteResult> {
  const plans = createVisualEventScenePlans(options.config, options.scenes);
  const events = flattenVisualEvents(plans);
  const localAssets = options.localAssets ?? [];
  const sceneFolder = path.join(options.outputFolder, "02_scenes");
  const editFolder = path.join(options.outputFolder, "06_edit_pack");
  const stockRows = stockAssetQueryRows(events);

  const results = await Promise.all([
    writeJsonFile(path.join(sceneFolder, "visual_events.json"), plans, options),
    writeTextFile(path.join(sceneFolder, "visual_events.md"), visualEventsMarkdown(plans), options),
    writeTextFile(path.join(editFolder, "visual_events.csv"), visualEventsToCsv(events), options),
    writeJsonFile(path.join(editFolder, "visual_events.json"), events, options),
    writeTextFile(path.join(editFolder, "overlay_text.csv"), overlayTextToCsv(events), options),
    writeTextFile(path.join(editFolder, "stock_asset_queries.csv"), stockAssetQueriesToCsv(stockRows), options),
    writeTextFile(path.join(editFolder, "stock_credits.md"), stockCreditsMarkdown(stockRows), options),
    writeJsonFile(
      path.join(editFolder, "asset_manifest.json"),
      assetManifest(options.config, events, localAssets),
      options
    )
  ]);

  return { plans, events, results };
}

export function visualEventsMarkdown(plans: VisualEventScenePlan[]): string {
  const sections = plans.map((plan) => {
    const rows = plan.events
      .map((event) => {
        const assetOrText = [
          event.asset_filename ? `Asset: \`${event.asset_filename}\`` : "",
          event.search_query ? `Query: ${event.search_query}` : "",
          event.text ? `Text: ${event.text}` : "",
          event.label ? `Label: ${event.label}` : ""
        ]
          .filter(Boolean)
          .join("<br>");

        return `| ${event.event_id} | ${event.start_time} | ${event.duration_seconds}s | ${event.type} | ${
          event.source_type ?? ""
        } | ${escapeMarkdownTableCell(assetOrText || event.transition_kind || "")} | ${escapeMarkdownTableCell(
          event.notes ?? ""
        )} |`;
      })
      .join("\n");

    return `## Scene ${plan.scene_number} - ${plan.scene_role}

Time: ${plan.scene_start} to ${plan.scene_end}

Pacing: \`${plan.pacing_mode}\`

Transcript:

${plan.transcript || "(none)"}

Visual goal:

${plan.visual_goal || "(none)"}

| Event | Start | Duration | Type | Source | Asset / query / text | Notes |
| --- | ---: | ---: | --- | --- | --- | --- |
${rows || "| - | - | - | - | - | Visual events disabled. | - |"}
`;
  });

  return `# Visual Events

These are editor-facing visual beats: image holds, stock cutaways, text overlays, and transitions. They are a planning layer, not a rendered video.

${sections.join("\n")}`;
}

export function visualEventsToCsv(events: VisualEvent[]): string {
  return stringify(
    events.map((event) => ({
      event_id: event.event_id,
      scene_number: event.scene_number,
      type: event.type,
      start_time: event.start_time,
      start_seconds: event.absolute_start_seconds,
      duration_seconds: event.duration_seconds,
      end_seconds: round(event.absolute_start_seconds + event.duration_seconds),
      source_type: event.source_type ?? "",
      asset_filename: event.asset_filename ?? "",
      search_query: event.search_query ?? "",
      text: event.text ?? "",
      label: event.label ?? "",
      style: event.style ?? "",
      motion: event.motion ?? "",
      animation: event.animation ?? "",
      notes: event.notes ?? ""
    })),
    {
      header: true,
      columns: [
        "event_id",
        "scene_number",
        "type",
        "start_time",
        "start_seconds",
        "duration_seconds",
        "end_seconds",
        "source_type",
        "asset_filename",
        "search_query",
        "text",
        "label",
        "style",
        "motion",
        "animation",
        "notes"
      ]
    }
  );
}

export function overlayTextToCsv(events: VisualEvent[]): string {
  return stringify(
    events
      .filter((event) => (event.type === "text" || event.type === "overlay") && event.text)
      .map((event) => ({
        overlay_id: event.event_id,
        scene_number: event.scene_number,
        start_seconds: event.absolute_start_seconds,
        end_seconds: round(event.absolute_start_seconds + event.duration_seconds),
        duration_seconds: event.duration_seconds,
        text: event.text ?? "",
        style: event.style ?? "",
        animation: event.animation ?? "",
        safe_area: event.safe_area ?? "",
        notes: event.notes ?? ""
      })),
    {
      header: true,
      columns: [
        "overlay_id",
        "scene_number",
        "start_seconds",
        "end_seconds",
        "duration_seconds",
        "text",
        "style",
        "animation",
        "safe_area",
        "notes"
      ]
    }
  );
}

export function stockAssetQueriesToCsv(rows: StockAssetQueryRow[]): string {
  return stringify(rows, {
    header: true,
    columns: [
      "asset_id",
      "event_id",
      "scene_number",
      "start_seconds",
      "end_seconds",
      "search_query",
      "provider_suggestions",
      "expected_filename",
      "usage_note",
      "credit_status"
    ]
  });
}

export function stockCreditsMarkdown(rows: StockAssetQueryRow[]): string {
  const tableRows = rows
    .map(
      (row) =>
        `| ${row.asset_id} | ${row.scene_number} | ${escapeMarkdownTableCell(row.search_query)} | ${
          row.provider_suggestions
        } |  |  |  |`
    )
    .join("\n");

  return `# Stock Credits

Use this as a manual credit worksheet if you download stock assets from Pexels, Unsplash, Pixabay or another provider. Provider names here are suggestions only; check the final asset license before publishing.

| Asset ID | Scene | Search query | Provider used | Source URL | Creator | License / credit note |
| --- | ---: | --- | --- | --- | --- | --- |
${tableRows || "| - | - | No stock asset queries generated. | - | - | - | - |"}
`;
}

function createEventsForScene(
  config: ProjectConfig,
  scene: Scene,
  index: number,
  totalScenes: number,
  pacing: PacingMode
): VisualEvent[] {
  const maxEvents = Math.max(1, config.visual_events.max_events_per_scene);
  const sceneStartSeconds = sceneTimeToSeconds(scene.start);
  const sceneDuration = Math.max(0.25, scene.duration_seconds);
  const overlayCues = createOverlayCues(scene, config.visual_events.create_overlay_plan);
  const events: VisualEvent[] = [
    makeEvent(scene, sceneStartSeconds, 1, "image", 0, sceneDuration, {
      source_type: "generated",
      asset_filename: imageFilenameForScene(scene),
      image_prompt: scene.visual_goal,
      motion: baseMotionForPacing(pacing),
      notes: "Primary generated scene image hold."
    })
  ];

  if (pacing === "burst") {
    events.push(
      stockOrPlaceholderEvent(config, scene, sceneStartSeconds, 2, 0, "hook cutaway"),
      stockOrPlaceholderEvent(config, scene, sceneStartSeconds, 3, sceneDuration * 0.38, "second hook cutaway"),
      textEvent(scene, sceneStartSeconds, 4, 0.15, sceneDuration, overlayCues[0], "headline pop"),
      overlayEvent(scene, sceneStartSeconds, 5, sceneDuration * 0.58, sceneDuration, overlayCues[1], "supporting hook note"),
      transitionEvent(scene, sceneStartSeconds, 6, sceneDuration, index, totalScenes)
    );
  } else if (pacing === "additive") {
    events.push(
      textEvent(scene, sceneStartSeconds, 2, 0.25, sceneDuration, overlayCues[0], "first reveal"),
      overlayEvent(scene, sceneStartSeconds, 3, sceneDuration * 0.34, sceneDuration, overlayCues[1], "definition or detail"),
      stockOrPlaceholderEvent(config, scene, sceneStartSeconds, 4, sceneDuration * 0.48, "supporting cutaway"),
      overlayEvent(scene, sceneStartSeconds, 5, sceneDuration * 0.68, sceneDuration, overlayCues[2], "final additive note"),
      transitionEvent(scene, sceneStartSeconds, 6, sceneDuration, index, totalScenes)
    );
  } else if (pacing === "landing") {
    events.push(
      textEvent(scene, sceneStartSeconds, 2, 0.25, sceneDuration, landingCue(scene), "recap headline"),
      overlayEvent(scene, sceneStartSeconds, 3, sceneDuration * 0.58, sceneDuration, callToActionCue(config.profile), "landing CTA"),
      transitionEvent(scene, sceneStartSeconds, 4, sceneDuration, index, totalScenes)
    );
  } else {
    events.push(
      overlayEvent(scene, sceneStartSeconds, 2, sceneDuration * 0.3, sceneDuration, overlayCues[1], "single steady note"),
      transitionEvent(scene, sceneStartSeconds, 3, sceneDuration, index, totalScenes)
    );
  }

  return events.slice(0, maxEvents);
}

function selectPacingMode(config: ProjectConfig, scene: Scene, index: number, totalScenes: number): PacingMode {
  const requested = config.visual_events.default_pacing;
  if (requested !== "profile") {
    return requested;
  }

  if (totalScenes === 1) {
    return "steady";
  }

  const isFirst = index === 0;
  const isLast = index === totalScenes - 1;

  if (isFirst && config.profile !== "youtube-long") {
    return "burst";
  }

  if (isLast) {
    return "landing";
  }

  if (config.profile === "linkedin-video") {
    return findKnownTerm(scene.transcript) ? "additive" : index % 3 === 0 ? "steady" : "additive";
  }

  if (config.profile === "youtube-long") {
    return index % 5 === 0 || looksLikeSection(scene.transcript) ? "additive" : "steady";
  }

  return "additive";
}

function sceneRole(index: number, totalScenes: number, pacing: PacingMode, scene: Scene): string {
  if (index === 0) {
    return "hook";
  }

  if (index === totalScenes - 1) {
    return "landing recap";
  }

  const term = findKnownTerm(scene.transcript);
  if (term) {
    return `${TERM_LIBRARY[term].display.toLowerCase()} explainer`;
  }

  if (pacing === "additive") {
    return "additive build";
  }

  return "steady explanation";
}

function createOverlayCues(scene: Scene, enabled: boolean): OverlayCue[] {
  if (!enabled) {
    return [
      cue("", "none", "none", "disabled", "Overlay planning disabled."),
      cue("", "none", "none", "disabled", "Overlay planning disabled."),
      cue("", "none", "none", "disabled", "Overlay planning disabled.")
    ];
  }

  const term = findKnownTerm(scene.transcript);
  if (term) {
    const item = TERM_LIBRARY[term];
    return [
      cue(item.display, "term-card", "pop-on", "term", "Keep this large and readable."),
      cue(item.definition, "definition-strip", "slide-up", "definition", "Plain-English explanation."),
      cue(item.warning, "warning-pill", "fade-in", "warning", "A short caution or tension line.")
    ];
  }

  const phrase = shortPhrase(scene.transcript || scene.visual_goal, 46);
  return [
    cue("KEY IDEA", "term-card", "pop-on", "label", "Generic scene label."),
    cue(phrase || "Make the visual point obvious.", "definition-strip", "slide-up", "support", "Compress the spoken point."),
    cue("Keep it clear at feed size.", "warning-pill", "fade-in", "readability", "Mobile readability reminder.")
  ];
}

function landingCue(scene: Scene): OverlayCue {
  const phrase = shortPhrase(scene.transcript || scene.visual_goal, 52);
  return cue(phrase ? `RECAP: ${phrase}` : "RECAP", "recap-card", "fade-up", "recap", "Use as the final takeaway.");
}

function callToActionCue(profile: string): OverlayCue {
  if (profile === "linkedin-video") {
    return cue("Save this for the next AI planning session.", "cta-strip", "fade-in", "cta", "LinkedIn-friendly CTA.");
  }

  if (profile === "youtube-long") {
    return cue("Use the checklist before the next section.", "cta-strip", "fade-in", "cta", "Long-form section CTA.");
  }

  return cue("Follow for the next useful breakdown.", "cta-strip", "fade-in", "cta", "Short-form CTA.");
}

function cue(text: string, style: string, animation: string, overlayKind: string, notes: string): OverlayCue {
  return { text, style, animation, overlayKind, notes };
}

function textEvent(
  scene: Scene,
  sceneStartSeconds: number,
  sequence: number,
  offset: number,
  sceneDuration: number,
  overlay: OverlayCue,
  notes: string
): VisualEvent {
  return makeEvent(scene, sceneStartSeconds, sequence, "text", offset, Math.min(2.4, sceneDuration), {
    text: overlay.text,
    label: overlay.overlayKind,
    style: overlay.style,
    animation: overlay.animation,
    overlay_kind: overlay.overlayKind,
    safe_area: "center-safe, avoid bottom captions",
    notes: `${notes}. ${overlay.notes}`.trim()
  });
}

function overlayEvent(
  scene: Scene,
  sceneStartSeconds: number,
  sequence: number,
  offset: number,
  sceneDuration: number,
  overlay: OverlayCue,
  notes: string
): VisualEvent {
  return makeEvent(scene, sceneStartSeconds, sequence, "overlay", offset, Math.min(3.2, sceneDuration), {
    text: overlay.text,
    label: overlay.overlayKind,
    style: overlay.style,
    animation: overlay.animation,
    overlay_kind: overlay.overlayKind,
    safe_area: "upper-middle safe area",
    notes: `${notes}. ${overlay.notes}`.trim()
  });
}

function stockOrPlaceholderEvent(
  config: ProjectConfig,
  scene: Scene,
  sceneStartSeconds: number,
  sequence: number,
  offset: number,
  notes: string
): VisualEvent {
  const sourceType = config.visual_events.create_stock_queries ? "stock" : "placeholder";
  const query = stockSearchQuery(scene, config.profile);
  const assetSlug = slugifyName(query).slice(0, 36) || `scene-${scene.scene_number}`;
  const extension = sourceType === "stock" ? "mp4" : "png";
  const assetFilename = `${sourceType}_scene_${String(scene.scene_number).padStart(3, "0")}_${String(
    sequence
  ).padStart(2, "0")}_${assetSlug}.${extension}`;

  return makeEvent(scene, sceneStartSeconds, sequence, "image", offset, Math.min(2.2, scene.duration_seconds), {
    source_type: sourceType,
    asset_filename: assetFilename,
    search_query: sourceType === "stock" ? query : undefined,
    provider_suggestions: sourceType === "stock" ? STOCK_PROVIDER_SUGGESTIONS : undefined,
    image_prompt: scene.visual_goal,
    motion: "quick cutaway; keep it secondary to narration",
    notes
  });
}

function transitionEvent(
  scene: Scene,
  sceneStartSeconds: number,
  sequence: number,
  sceneDuration: number,
  index: number,
  totalScenes: number
): VisualEvent {
  return makeEvent(scene, sceneStartSeconds, sequence, "transition", sceneDuration - 0.25, 0.25, {
    transition_kind: index === totalScenes - 1 ? "end hold" : "clean cut",
    style: "editorial",
    animation: index === totalScenes - 1 ? "hold" : "cut",
    notes: index === totalScenes - 1 ? "Let the final frame breathe." : "Cut on narration change."
  });
}

function makeEvent(
  scene: Scene,
  sceneStartSeconds: number,
  sequence: number,
  type: VisualEvent["type"],
  requestedOffset: number,
  requestedDuration: number,
  values: Partial<VisualEvent>
): VisualEvent {
  const offset = clampOffset(requestedOffset, scene.duration_seconds);
  const duration = boundedDuration(scene.duration_seconds, offset, requestedDuration);
  const absoluteStart = round(sceneStartSeconds + offset);

  return {
    event_id: `ve_${String(scene.scene_number).padStart(3, "0")}_${String(sequence).padStart(2, "0")}_${type}`,
    scene_number: scene.scene_number,
    offset_seconds: offset,
    absolute_start_seconds: absoluteStart,
    start_time: secondsToSceneTime(absoluteStart),
    duration_seconds: duration,
    type,
    ...values
  };
}

function baseMotionForPacing(pacing: PacingMode): string {
  if (pacing === "burst") {
    return "fast push-in or snap zoom for the hook.";
  }

  if (pacing === "additive") {
    return "slow push while overlay elements build.";
  }

  if (pacing === "landing") {
    return "gentle hold, leave room for recap text.";
  }

  return "subtle slow push or static hold.";
}

function stockSearchQuery(scene: Scene, profile: string): string {
  const term = findKnownTerm(scene.transcript);
  if (term) {
    return TERM_LIBRARY[term].search;
  }

  const basis = scene.visual_goal || scene.transcript;
  const words = basis
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .slice(0, 6);
  const profileContext =
    profile === "linkedin-video" ? "business social video" : profile === "youtube-long" ? "explainer video" : "short video";

  return [...words, profileContext].filter(Boolean).join(" ").trim() || `${profileContext} abstract concept`;
}

function stockAssetQueryRows(events: VisualEvent[]): StockAssetQueryRow[] {
  return events
    .filter((event) => event.source_type === "stock" && event.search_query)
    .map((event, index) => ({
      asset_id: `stock_${String(index + 1).padStart(3, "0")}`,
      event_id: event.event_id,
      scene_number: event.scene_number,
      start_seconds: event.absolute_start_seconds,
      end_seconds: round(event.absolute_start_seconds + event.duration_seconds),
      search_query: event.search_query ?? "",
      provider_suggestions: (event.provider_suggestions ?? STOCK_PROVIDER_SUGGESTIONS).join(" / "),
      expected_filename: event.asset_filename ?? "",
      usage_note: event.notes ?? "Use only if it strengthens the scene.",
      credit_status: "needs manual source URL and license check"
    }));
}

function assetManifest(
  config: ProjectConfig,
  events: VisualEvent[],
  localAssets: LocalAssetReference[]
): Record<string, unknown> {
  const stockRows = stockAssetQueryRows(events);

  return {
    version: 1,
    project_name: config.project_name,
    profile: config.profile,
    summary: {
      total_visual_events: events.length,
      generated_images: events.filter((event) => event.source_type === "generated").length,
      stock_assets_to_find: stockRows.length,
      local_assets_available: localAssets.length,
      overlay_text_items: events.filter((event) => event.type === "text" || event.type === "overlay").length
    },
    generated_images: events
      .filter((event) => event.source_type === "generated")
      .map((event) => ({
        event_id: event.event_id,
        scene_number: event.scene_number,
        filename: event.asset_filename,
        prompt_source: "output/03_prompts/prompts.json",
        note: event.notes
      })),
    stock_assets: stockRows.map((row) => ({
      asset_id: row.asset_id,
      event_id: row.event_id,
      scene_number: row.scene_number,
      expected_filename: row.expected_filename,
      search_query: row.search_query,
      provider_suggestions: row.provider_suggestions,
      credit_status: row.credit_status
    })),
    placeholders: events
      .filter((event) => event.source_type === "placeholder")
      .map((event) => ({
        event_id: event.event_id,
        scene_number: event.scene_number,
        filename: event.asset_filename,
        note: "Placeholder event because stock queries are disabled."
      })),
    local_assets: localAssets,
    files: {
      visual_events_scene_plan: "output/02_scenes/visual_events.json",
      visual_events_edit_csv: "output/06_edit_pack/visual_events.csv",
      overlay_text: "output/06_edit_pack/overlay_text.csv",
      stock_asset_queries: "output/06_edit_pack/stock_asset_queries.csv",
      stock_credits: "output/06_edit_pack/stock_credits.md"
    },
    notes: [
      "This manifest is a planning checklist for the editor.",
      "Stock providers are suggestions only; manually verify final license and credit requirements.",
      "Local assets are files found under input/assets/."
    ]
  };
}

async function collectFiles(folder: string): Promise<string[]> {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }

      if (entry.isFile() && entry.name !== ".gitkeep") {
        return [fullPath];
      }

      return [];
    })
  );

  return nested.flat();
}

function findKnownTerm(text: string): string | undefined {
  const normalized = text.toLowerCase();
  return Object.keys(TERM_LIBRARY).find((term) => {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    return pattern.test(normalized);
  });
}

function looksLikeSection(text: string): boolean {
  return /^\s*(first|second|third|finally|chapter|section|step)\b/i.test(text);
}

function shortPhrase(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function clampOffset(value: number, duration: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return round(Math.max(0, Math.min(Math.max(0, duration - 0.05), value)));
}

function boundedDuration(sceneDuration: number, offset: number, requestedDuration: number): number {
  const remaining = Math.max(0.05, sceneDuration - offset);
  return round(Math.max(0.05, Math.min(remaining, requestedDuration)));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "because",
  "before",
  "being",
  "could",
  "every",
  "first",
  "from",
  "have",
  "into",
  "like",
  "make",
  "more",
  "only",
  "over",
  "people",
  "scene",
  "that",
  "their",
  "there",
  "this",
  "through",
  "what",
  "when",
  "where",
  "with",
  "would",
  "your"
]);

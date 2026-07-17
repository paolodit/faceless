import { countWords, secondsToSceneTime } from "./format.js";
import type { Character, Scene } from "./schemas.js";

export interface SceneTimingOptions {
  targetSceneSeconds: number;
  minSceneSeconds: number;
  maxSceneSeconds: number;
  wordsPerMinute: number;
  primaryCharacter: string;
  characters?: Character[];
  alwaysUsePrimaryCharacter?: boolean;
}

export function retimeScenesToDuration(scenes: Scene[], totalDurationSeconds: number): Scene[] {
  const currentDuration = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);
  if (scenes.length === 0 || currentDuration <= 0 || totalDurationSeconds <= 0) {
    return scenes;
  }

  let cursor = 0;
  return scenes.map((scene, index) => {
    const isLast = index === scenes.length - 1;
    const scaledDuration = isLast
      ? roundToMillis(totalDurationSeconds - cursor)
      : roundToMillis((scene.duration_seconds / currentDuration) * totalDurationSeconds);
    const start = cursor;
    const end = cursor + Math.max(0.001, scaledDuration);
    cursor = end;

    return {
      ...scene,
      start: secondsToSceneTime(start),
      end: secondsToSceneTime(end),
      duration_seconds: roundToMillis(end - start)
    };
  });
}

export function splitTranscriptIntoScenes(script: string, options: SceneTimingOptions): Scene[] {
  const beats = splitScriptIntoBeats(script, options);
  const wordsPerSecond = options.wordsPerMinute / 60;
  let cursor = 0;

  return beats.map((beat, index) => {
    const wordCount = Math.max(1, countWords(beat));
    const rawDuration = wordCount / wordsPerSecond;
    const duration = roundToMillis(
      Math.min(options.maxSceneSeconds, Math.max(options.minSceneSeconds, rawDuration))
    );
    const start = cursor;
    const end = cursor + duration;
    cursor = end;
    const characters = sceneCharacters(beat, options);
    const visualGoal =
      characters.length > 0
        ? `${characters.join(" and ")} in a clear visual showing: "${truncateForVisualGoal(beat)}"`
        : `Clear visual explanation of: "${truncateForVisualGoal(beat)}"`;

    return {
      scene_number: index + 1,
      start: secondsToSceneTime(start),
      end: secondsToSceneTime(end),
      duration_seconds: duration,
      transcript: beat,
      visual_goal: visualGoal,
      characters,
      mood: "observational",
      notes: ""
    };
  });
}

function sceneCharacters(beat: string, options: SceneTimingOptions): string[] {
  if (!options.characters) {
    return [options.primaryCharacter];
  }

  const mentioned = options.characters
    .filter((character) => characterIsMentioned(character, beat))
    .map((character) => character.name);
  if (options.alwaysUsePrimaryCharacter && !mentioned.includes(options.primaryCharacter)) {
    mentioned.unshift(options.primaryCharacter);
  }
  return mentioned;
}

function characterIsMentioned(character: Character, beat: string): boolean {
  const haystack = normalizeWords(beat);
  const customCues = stringArray(character.scene_cues);
  const excludeCues = stringArray(character.scene_exclude_cues);
  const cueHaystack = excludeCues.reduce(
    (value, cue) => value.replaceAll(normalizeWords(cue), " "),
    haystack
  );
  if (customCues.length > 0) {
    return customCues.some((cue) => cueHaystack.includes(normalizeWords(cue)));
  }
  const cues = new Set(
    [character.name, character.role]
      .flatMap((value) => normalizeWords(value ?? "").split(" "))
      .map(singularize)
      .filter((word) => word.length >= 3 && !CHARACTER_STOP_WORDS.has(word))
  );
  return [...cues].some((cue) => cueHaystack.split(" ").map(singularize).includes(cue));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeWords(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function singularize(value: string): string {
  return value.length > 3 && value.endsWith("s") ? value.slice(0, -1) : value;
}

const CHARACTER_STOP_WORDS = new Set(["main", "recurring", "visual", "guide", "character", "worker"]);

export function splitScriptIntoBeats(script: string, options: SceneTimingOptions): string[] {
  const wordsPerSecond = options.wordsPerMinute / 60;
  const targetWords = Math.max(1, Math.round(options.targetSceneSeconds * wordsPerSecond));
  const maxWords = Math.max(targetWords, Math.round(options.maxSceneSeconds * wordsPerSecond));
  const units = extractSentenceUnits(script);
  const beats: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const unit of units) {
    const unitWords = countWords(unit);

    if (unitWords > maxWords) {
      flushCurrent();
      beats.push(...chunkLongUnit(unit, maxWords));
      continue;
    }

    if (current.length === 0) {
      current.push(unit);
      currentWords = unitWords;
      continue;
    }

    if (currentWords < targetWords && currentWords + unitWords <= maxWords) {
      current.push(unit);
      currentWords += unitWords;
      continue;
    }

    flushCurrent();
    current.push(unit);
    currentWords = unitWords;
  }

  flushCurrent();
  return beats.length > 0 ? beats : [script.trim()].filter(Boolean);

  function flushCurrent(): void {
    if (current.length === 0) {
      return;
    }

    beats.push(current.join(" ").replace(/\s+/g, " ").trim());
    current = [];
    currentWords = 0;
  }
}

function extractSentenceUnits(script: string): string[] {
  const normalized = script
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  const matches = normalized.match(/[^.!?]+[.!?]+["']*|[^.!?]+$/g);
  return (matches ?? [normalized]).map((unit) => unit.trim()).filter(Boolean);
}

function chunkLongUnit(unit: string, maxWords: number): string[] {
  const words = unit.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }

  return chunks;
}

function truncateForVisualGoal(value: string): string {
  return value.length <= 120 ? value : `${value.slice(0, 117).trim()}...`;
}

function roundToMillis(value: number): number {
  return Math.round(value * 1000) / 1000;
}

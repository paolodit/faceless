import { PROFILE_NAMES, type ProfileName } from "./constants.js";

export interface OutputProfile {
  name: ProfileName;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  targetSceneSeconds: number;
  minSceneSeconds: number;
  maxSceneSeconds: number;
  captionStyle: string;
  guidance: string;
  recommendedLengthSeconds: {
    min: number;
    max: number;
  };
}

export const profiles: Record<ProfileName, OutputProfile> = {
  tiktok: {
    name: "tiktok",
    aspectRatio: "9:16",
    targetSceneSeconds: 3,
    minSceneSeconds: 2,
    maxSceneSeconds: 5,
    captionStyle: "large, mobile-first, highly readable",
    guidance: "Hook must land within first 2 seconds. Keep scenes visually simple and fast.",
    recommendedLengthSeconds: { min: 20, max: 60 }
  },
  "youtube-shorts": {
    name: "youtube-shorts",
    aspectRatio: "9:16",
    targetSceneSeconds: 4,
    minSceneSeconds: 3,
    maxSceneSeconds: 6,
    captionStyle: "large and clear",
    guidance: "Prioritise completion compulsion and a strong final payoff.",
    recommendedLengthSeconds: { min: 30, max: 60 }
  },
  "youtube-long": {
    name: "youtube-long",
    aspectRatio: "16:9",
    targetSceneSeconds: 8,
    minSceneSeconds: 5,
    maxSceneSeconds: 12,
    captionStyle: "optional or section-based",
    guidance: "Use chapter-like sections, slower pacing and stronger narrative progression.",
    recommendedLengthSeconds: { min: 180, max: 1800 }
  },
  "linkedin-video": {
    name: "linkedin-video",
    aspectRatio: "4:5",
    targetSceneSeconds: 5,
    minSceneSeconds: 4,
    maxSceneSeconds: 8,
    captionStyle: "clean, professional and readable",
    guidance: "Lead with a useful business insight. Avoid overly chaotic visual pacing.",
    recommendedLengthSeconds: { min: 30, max: 180 }
  }
};

export function getProfile(name: string): OutputProfile | undefined {
  return profiles[name as ProfileName];
}

export function listProfileNames(): ProfileName[] {
  return [...PROFILE_NAMES];
}

export function suggestProfileName(value: string): ProfileName | undefined {
  const ranked = listProfileNames()
    .map((name) => ({ name, score: levenshtein(value, name) }))
    .sort((a, b) => a.score - b.score);

  return ranked[0]?.score <= 4 ? ranked[0].name : undefined;
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, col) => (row === 0 ? col : col === 0 ? row : 0))
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

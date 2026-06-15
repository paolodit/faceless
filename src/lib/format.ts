export function countWords(text: string): number {
  const matches = text.trim().match(/\b[\w']+\b/g);
  return matches?.length ?? 0;
}

export function secondsToSceneTime(totalSeconds: number): string {
  const roundedMs = Math.round(totalSeconds * 1000);
  const minutes = Math.floor(roundedMs / 60000);
  const seconds = Math.floor((roundedMs % 60000) / 1000);
  const milliseconds = roundedMs % 1000;
  return `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`;
}

export function sceneTimeToSeconds(value: string): number {
  const match = value.match(/^(\d{2,}):(\d{2})\.(\d{3})$/);
  if (!match) {
    throw new Error(`Invalid scene time: ${value}`);
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const milliseconds = Number(match[3]);
  return minutes * 60 + seconds + milliseconds / 1000;
}

export function secondsToSrtTime(totalSeconds: number): string {
  const roundedMs = Math.round(totalSeconds * 1000);
  const hours = Math.floor(roundedMs / 3600000);
  const minutes = Math.floor((roundedMs % 3600000) / 60000);
  const seconds = Math.floor((roundedMs % 60000) / 1000);
  const milliseconds = roundedMs % 1000;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
}

export function sceneTimeToSrtTime(value: string): string {
  return secondsToSrtTime(sceneTimeToSeconds(value));
}

export function sceneTimeToVttTime(value: string): string {
  return sceneTimeToSrtTime(value).replace(",", ".");
}

export function sceneTimeToFileLabel(value: string): string {
  const seconds = sceneTimeToSeconds(value);
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = Math.floor(seconds % 60);
  return `${pad(minutesPart, 2)}-${pad(secondsPart, 2)}`;
}

export function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function slugifyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

export function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

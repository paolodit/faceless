import path from "node:path";
import fs from "fs-extra";
import { parseFile } from "music-metadata";

export interface AudioInfo {
  file: string;
  format: string;
  duration_seconds?: number;
  method: "metadata" | "wav-header" | "mp3-frame-scan" | "unsupported" | "unreadable";
  warning?: string;
}

export async function detectAudioInfo(filePath: string): Promise<AudioInfo> {
  const format = path.extname(filePath).replace(".", "").toLowerCase() || "unknown";

  try {
    const metadata = await parseFile(filePath, { duration: true });
    if (metadata.format.duration && metadata.format.duration > 0) {
      return {
        file: filePath,
        format,
        duration_seconds: roundSeconds(metadata.format.duration),
        method: "metadata"
      };
    }
  } catch {
    // Keep the local parsers below as a dependency-free fallback for partial files.
  }

  try {
    const buffer = await fs.readFile(filePath);

    if (format === "wav" || isWav(buffer)) {
      return {
        file: filePath,
        format: "wav",
        duration_seconds: readWavDuration(buffer),
        method: "wav-header"
      };
    }

    if (format === "mp3" || isMp3(buffer)) {
      const duration = readMp3Duration(buffer);
      return {
        file: filePath,
        format: "mp3",
        duration_seconds: duration,
        method: "mp3-frame-scan",
        warning: duration ? undefined : "Could not find enough MP3 frame data to estimate duration."
      };
    }

    return {
      file: filePath,
      format,
      method: "unsupported",
      warning: "Could not read duration metadata from this audio file. Transcription can still use it."
    };
  } catch (error) {
    return {
      file: filePath,
      format,
      method: "unreadable",
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

function isWav(buffer: Buffer): boolean {
  return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE";
}

function readWavDuration(buffer: Buffer): number | undefined {
  let offset = 12;
  let byteRate: number | undefined;
  let dataSize: number | undefined;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (id === "fmt " && chunkStart + 16 <= buffer.length) {
      byteRate = buffer.readUInt32LE(chunkStart + 8);
    }

    if (id === "data") {
      dataSize = size;
    }

    offset = chunkStart + size + (size % 2);
  }

  if (!byteRate || !dataSize) {
    return undefined;
  }

  return roundSeconds(dataSize / byteRate);
}

function isMp3(buffer: Buffer): boolean {
  const start = skipId3(buffer);
  return start + 1 < buffer.length && buffer[start] === 0xff && (buffer[start + 1] & 0xe0) === 0xe0;
}

function readMp3Duration(buffer: Buffer): number | undefined {
  let offset = skipId3(buffer);
  let duration = 0;
  let frames = 0;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1;
      continue;
    }

    const header = parseMp3Header(buffer, offset);
    if (!header) {
      offset += 1;
      continue;
    }

    duration += header.samplesPerFrame / header.sampleRate;
    frames += 1;
    offset += header.frameLength;
  }

  return frames > 0 ? roundSeconds(duration) : undefined;
}

function skipId3(buffer: Buffer): number {
  if (buffer.toString("ascii", 0, 3) !== "ID3" || buffer.length < 10) {
    return 0;
  }

  return (
    10 +
    ((buffer[6] & 0x7f) << 21) +
    ((buffer[7] & 0x7f) << 14) +
    ((buffer[8] & 0x7f) << 7) +
    (buffer[9] & 0x7f)
  );
}

function parseMp3Header(
  buffer: Buffer,
  offset: number
): { frameLength: number; sampleRate: number; samplesPerFrame: number } | undefined {
  const b1 = buffer[offset + 1];
  const b2 = buffer[offset + 2];
  const b3 = buffer[offset + 3];
  const versionBits = (b1 >> 3) & 0x03;
  const layerBits = (b1 >> 1) & 0x03;
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;

  if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
    return undefined;
  }

  const version = versionBits === 3 ? "mpeg1" : "mpeg2";
  const bitrateKbps = version === "mpeg1" ? MPEG1_LAYER3_BITRATES[bitrateIndex] : MPEG2_LAYER3_BITRATES[bitrateIndex];
  const sampleRate = sampleRateFor(versionBits, sampleRateIndex);
  if (!bitrateKbps || !sampleRate) {
    return undefined;
  }

  const samplesPerFrame = version === "mpeg1" ? 1152 : 576;
  const coefficient = version === "mpeg1" ? 144 : 72;
  const frameLength = Math.floor((coefficient * bitrateKbps * 1000) / sampleRate + padding);

  if (frameLength <= 4) {
    return undefined;
  }

  return { frameLength, sampleRate, samplesPerFrame };
}

function sampleRateFor(versionBits: number, sampleRateIndex: number): number | undefined {
  const table: Record<number, number[]> = {
    3: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    0: [11025, 12000, 8000]
  };

  return table[versionBits]?.[sampleRateIndex];
}

function roundSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const MPEG1_LAYER3_BITRATES = [
  undefined,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  160,
  192,
  224,
  256,
  320
];

const MPEG2_LAYER3_BITRATES = [
  undefined,
  8,
  16,
  24,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  144,
  160
];

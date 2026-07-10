import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { detectAudioInfo } from "../src/lib/audio.js";

let cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.map((item) => fs.remove(item)));
  cleanupPaths = [];
});

describe("audio duration detection", () => {
  it("reads WAV duration from headers", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "video-pack-audio-"));
    cleanupPaths.push(root);
    const wavPath = path.join(root, "voice.wav");
    await fs.writeFile(wavPath, createSilentWav(1));

    const info = await detectAudioInfo(wavPath);
    expect(info.format).toBe("wav");
    expect(info.duration_seconds).toBe(1);
    expect(["metadata", "wav-header"]).toContain(info.method);
  });
});

function createSilentWav(seconds: number): Buffer {
  const sampleRate = 8000;
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const dataSize = seconds * byteRate;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

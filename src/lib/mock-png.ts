import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import fs from "fs-extra";
import type { AspectRatio } from "./constants.js";

type Color = [number, number, number, number];

const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ":": ["00000", "00100", "00100", "00000", "00100", "00100", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00100", "00100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  " ": ["000", "000", "000", "000", "000", "000", "000"]
};

export interface MockPngOptions {
  filePath: string;
  aspectRatio: AspectRatio;
  sceneNumber: number;
  start: string;
  end: string;
  force?: boolean;
}

export async function writeMockPng(options: MockPngOptions): Promise<boolean> {
  if (!options.force && (await fs.pathExists(options.filePath))) {
    return false;
  }

  const dimensions = dimensionsForAspectRatio(options.aspectRatio);
  const png = createMockPng({
    width: dimensions.width,
    height: dimensions.height,
    lines: [
      "VIDEO PACK MOCK",
      `SCENE ${String(options.sceneNumber).padStart(3, "0")}`,
      `${options.start} TO ${options.end}`,
      "EDIT PLACEHOLDER"
    ]
  });

  await fs.ensureDir(path.dirname(options.filePath));
  await fs.writeFile(options.filePath, png);
  await fs.writeJson(
    mockMarkerPath(options.filePath),
    {
      kind: "faceless-mock-placeholder",
      sha256: sha256(png),
      created_at: new Date().toISOString()
    },
    { spaces: 2 }
  );
  return true;
}

export function mockMarkerPath(filePath: string): string {
  return `${filePath}.faceless-mock.json`;
}

export async function isCurrentMockAsset(filePath: string | undefined): Promise<boolean> {
  if (!filePath || !(await fs.pathExists(filePath))) {
    return false;
  }

  const markerPath = mockMarkerPath(filePath);
  if (!(await fs.pathExists(markerPath))) {
    return false;
  }

  try {
    const marker = (await fs.readJson(markerPath)) as { kind?: string; sha256?: string };
    return (
      marker.kind === "faceless-mock-placeholder" &&
      Boolean(marker.sha256) &&
      sha256(await fs.readFile(filePath)) === marker.sha256
    );
  } catch {
    return false;
  }
}

export async function syncMockAssetMarker(source: string, destination: string): Promise<void> {
  const destinationMarker = mockMarkerPath(destination);
  if (await isCurrentMockAsset(source)) {
    const bytes = await fs.readFile(destination);
    await fs.writeJson(
      destinationMarker,
      {
        kind: "faceless-mock-placeholder",
        sha256: sha256(bytes),
        copied_from: source.replace(/\\/g, "/"),
        created_at: new Date().toISOString()
      },
      { spaces: 2 }
    );
    return;
  }

  await fs.remove(destinationMarker);
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function createMockPng(options: { width: number; height: number; lines: string[] }): Buffer {
  const { width, height } = options;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  const background: Color = [246, 244, 238, 255];
  const ink: Color = [30, 34, 39, 255];
  const accent: Color = [53, 102, 118, 255];
  const secondary: Color = [217, 189, 112, 255];

  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x += 1) {
      setPixel(raw, width, x, y, background);
    }
  }

  drawRect(raw, width, 0, 0, width, Math.max(28, Math.floor(height * 0.08)), accent);
  drawRect(raw, width, 0, height - Math.max(20, Math.floor(height * 0.04)), width, Math.max(20, Math.floor(height * 0.04)), secondary);
  drawRect(raw, width, Math.floor(width * 0.07), Math.floor(height * 0.18), Math.floor(width * 0.86), 8, secondary);
  drawRect(raw, width, Math.floor(width * 0.07), Math.floor(height * 0.82), Math.floor(width * 0.86), 8, secondary);

  const scale = Math.max(4, Math.floor(width / 120));
  const lineHeight = scale * 10;
  const totalTextHeight = options.lines.length * lineHeight;
  const startY = Math.floor(height / 2 - totalTextHeight / 2);

  options.lines.forEach((line, index) => {
    drawCenteredText(raw, width, height, line, startY + index * lineHeight, scale, ink);
  });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function dimensionsForAspectRatio(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9":
      return { width: 960, height: 540 };
    case "1:1":
      return { width: 720, height: 720 };
    case "4:5":
      return { width: 720, height: 900 };
    case "9:16":
    default:
      return { width: 540, height: 960 };
  }
}

function drawCenteredText(
  raw: Buffer,
  width: number,
  height: number,
  text: string,
  y: number,
  scale: number,
  color: Color
): void {
  const measured = measureText(text, scale);
  const x = Math.max(0, Math.floor(width / 2 - measured / 2));
  drawText(raw, width, height, text, x, y, scale, color);
}

function drawText(
  raw: Buffer,
  width: number,
  height: number,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: Color
): void {
  let cursor = x;

  for (const character of text.toUpperCase()) {
    const pattern = FONT[character] ?? FONT["?"];
    for (let row = 0; row < pattern.length; row += 1) {
      for (let col = 0; col < pattern[row].length; col += 1) {
        if (pattern[row][col] === "1") {
          drawRect(raw, width, cursor + col * scale, y + row * scale, scale, scale, color, height);
        }
      }
    }
    cursor += (pattern[0].length + 1) * scale;
  }
}

function measureText(text: string, scale: number): number {
  return [...text.toUpperCase()].reduce((width, character) => {
    const pattern = FONT[character] ?? FONT["?"];
    return width + (pattern[0].length + 1) * scale;
  }, 0);
}

function drawRect(
  raw: Buffer,
  width: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  color: Color,
  height = Number.MAX_SAFE_INTEGER
): void {
  for (let py = Math.max(0, y); py < Math.min(height, y + rectHeight); py += 1) {
    for (let px = Math.max(0, x); px < Math.min(width, x + rectWidth); px += 1) {
      setPixel(raw, width, px, py, color);
    }
  }
}

function setPixel(raw: Buffer, width: number, x: number, y: number, color: Color): void {
  const stride = width * 4 + 1;
  const index = y * stride + 1 + x * 4;
  raw[index] = color[0];
  raw[index + 1] = color[1];
  raw[index + 2] = color[2];
  raw[index + 3] = color[3];
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

import path from "node:path";
import fs from "fs-extra";

const MIME_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export async function imageFileToDataUri(filePath: string | undefined): Promise<string | undefined> {
  if (!filePath || !(await fs.pathExists(filePath))) {
    return undefined;
  }

  const data = await fs.readFile(filePath);
  const mimeType = detectImageMimeType(data) ?? MIME_TYPES[path.extname(filePath).toLowerCase()];
  if (!mimeType) {
    return undefined;
  }
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

export function isImageFile(filePath: string): boolean {
  return Boolean(MIME_TYPES[path.extname(filePath).toLowerCase()]);
}

function detectImageMimeType(data: Buffer): string | undefined {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png";
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  if (data.length >= 6 && ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"))) {
    return "image/gif";
  }
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return undefined;
}

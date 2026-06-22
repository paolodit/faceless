import path from "node:path";
import fs from "fs-extra";
import type { ProjectConfig } from "./schemas.js";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

export interface OpenAIImageOptions {
  prompt: string;
  outputPath: string;
  config: ProjectConfig;
  force?: boolean;
}

export interface OpenAIImageResult {
  filePath: string;
  written: boolean;
  model: string;
  size: string;
  quality: string;
  outputFormat: string;
  usage?: unknown;
}

export interface OpenAITranscriptionOptions {
  audioPath: string;
  config: ProjectConfig;
}

export interface OpenAITranscriptionResult {
  text: string;
  raw: unknown;
  model: string;
}

export async function generateImageWithOpenAI(options: OpenAIImageOptions): Promise<OpenAIImageResult> {
  if (!options.force && (await fs.pathExists(options.outputPath))) {
    return {
      filePath: options.outputPath,
      written: false,
      model: imageModel(options.config),
      size: imageSize(options.config),
      quality: imageQuality(options.config),
      outputFormat: imageOutputFormat(options.config)
    };
  }

  const apiKey = readApiKey();
  const body = {
    model: imageModel(options.config),
    prompt: options.prompt,
    n: 1,
    size: imageSize(options.config),
    quality: imageQuality(options.config),
    output_format: imageOutputFormat(options.config)
  };

  const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as OpenAIImageResponse | OpenAIErrorResponse;
  if (!response.ok) {
    throw new Error(openAIErrorMessage("image generation", payload));
  }

  const image = (payload as OpenAIImageResponse).data?.[0];
  if (!image?.b64_json) {
    throw new Error("OpenAI image generation did not return base64 image data.");
  }

  await fs.ensureDir(path.dirname(options.outputPath));
  await fs.writeFile(options.outputPath, Buffer.from(image.b64_json, "base64"));

  return {
    filePath: options.outputPath,
    written: true,
    model: body.model,
    size: body.size,
    quality: body.quality,
    outputFormat: body.output_format,
    usage: (payload as OpenAIImageResponse).usage
  };
}

export async function transcribeAudioWithOpenAI(
  options: OpenAITranscriptionOptions
): Promise<OpenAITranscriptionResult> {
  const apiKey = readApiKey();
  const model = transcriptionModel(options.config);
  const audioBuffer = await fs.readFile(options.audioPath);
  const form = new FormData();

  form.append("file", new Blob([audioBuffer], { type: mimeTypeFor(options.audioPath) }), path.basename(options.audioPath));
  form.append("model", model);
  form.append("response_format", "verbose_json");

  if (options.config.transcription.language) {
    form.append("language", options.config.transcription.language);
  }

  if (options.config.transcription.prompt) {
    form.append("prompt", options.config.transcription.prompt);
  }

  if (model === "whisper-1") {
    form.append("timestamp_granularities[]", "segment");
  }

  const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  const payload = (await response.json()) as OpenAITranscriptionResponse | OpenAIErrorResponse;
  if (!response.ok) {
    throw new Error(openAIErrorMessage("audio transcription", payload));
  }

  const text = (payload as OpenAITranscriptionResponse).text;
  if (!text) {
    throw new Error("OpenAI transcription did not return transcript text.");
  }

  return {
    text,
    raw: payload,
    model
  };
}

function readApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(`OPENAI_API_KEY is not set.

Set it before using OpenAI providers:

macOS / Linux:
export OPENAI_API_KEY="sk-..."

PowerShell:
$env:OPENAI_API_KEY="sk-..."

Then rerun the command.`);
  }

  return apiKey;
}

function imageModel(config: ProjectConfig): string {
  return config.providers.openai.image_model;
}

function imageSize(config: ProjectConfig): string {
  return config.providers.openai.image_size;
}

function imageQuality(config: ProjectConfig): string {
  return config.providers.openai.image_quality;
}

function imageOutputFormat(config: ProjectConfig): "png" | "webp" | "jpeg" {
  return config.providers.openai.image_output_format;
}

function transcriptionModel(config: ProjectConfig): string {
  return config.providers.openai.transcription_model || config.transcription.model;
}

function mimeTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".wav":
      return "audio/wav";
    case ".webm":
      return "audio/webm";
    case ".ogg":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
}

function openAIErrorMessage(operation: string, payload: OpenAIErrorResponse | unknown): string {
  const message =
    typeof payload === "object" && payload && "error" in payload
      ? (payload as OpenAIErrorResponse).error?.message
      : undefined;
  return `OpenAI ${operation} failed.${message ? `\n\n${message}` : ""}`;
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; revised_prompt?: string }>;
  usage?: unknown;
}

interface OpenAITranscriptionResponse {
  text?: string;
  duration?: number;
  segments?: unknown[];
}

interface OpenAIErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

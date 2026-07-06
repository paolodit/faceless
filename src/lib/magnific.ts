import path from "node:path";
import fs from "fs-extra";
import type { AspectRatio } from "./constants.js";
import type { ProjectConfig } from "./schemas.js";

export interface MagnificImageOptions {
  prompt: string;
  outputPath: string;
  config: ProjectConfig;
  force?: boolean;
}

export interface MagnificUpscaleOptions {
  inputPath: string;
  outputPath: string;
  config: ProjectConfig;
  force?: boolean;
  scaleFactor?: number;
  sharpen?: number;
  smartGrain?: number;
  ultraDetail?: number;
  flavor?: "sublime" | "photo" | "photo_denoiser";
}

export interface MagnificVideoOptions {
  prompt: string;
  negativePrompt?: string;
  inputImagePath?: string;
  outputPath: string;
  config: ProjectConfig;
  force?: boolean;
  durationSeconds?: number;
  generateAudio?: boolean;
}

export interface MagnificGenerationResult {
  filePath: string;
  written: boolean;
  taskId?: string;
  status?: string;
  generatedUrl?: string;
  raw?: unknown;
}

interface MagnificTaskResponse {
  data?: {
    task_id?: string;
    status?: string;
    generated?: string[];
    has_nsfw?: boolean[];
  };
  error?: {
    message?: string;
    code?: string;
  };
  message?: string;
}

export async function generateImageWithMagnific(
  options: MagnificImageOptions
): Promise<MagnificGenerationResult> {
  if (!options.force && (await fs.pathExists(options.outputPath))) {
    return { filePath: options.outputPath, written: false };
  }

  const config = options.config.providers.magnific;
  const body = {
    prompt: options.prompt,
    resolution: config.image_resolution,
    aspect_ratio: magnificAspectRatio(options.config.aspect_ratio),
    model: config.image_model,
    engine: config.image_engine,
    filter_nsfw: config.filter_nsfw
  };
  const task = await createTask(options.config, "/v1/ai/mystic", body);
  const completed = await waitForTask(options.config, `/v1/ai/mystic/${task.taskId}`);
  const generatedUrl = firstGeneratedUrl(completed);

  await downloadGeneratedFile(generatedUrl, options.outputPath);

  return {
    filePath: options.outputPath,
    written: true,
    taskId: task.taskId,
    status: completed.data?.status,
    generatedUrl,
    raw: completed
  };
}

export async function upscaleImageWithMagnific(
  options: MagnificUpscaleOptions
): Promise<MagnificGenerationResult> {
  if (!options.force && (await fs.pathExists(options.outputPath))) {
    return { filePath: options.outputPath, written: false };
  }

  const config = options.config.providers.magnific;
  const image = await imageToBase64(options.inputPath);
  const body = {
    image,
    sharpen: options.sharpen ?? config.upscale_sharpen,
    smart_grain: options.smartGrain ?? config.upscale_smart_grain,
    ultra_detail: options.ultraDetail ?? config.upscale_ultra_detail,
    scale_factor: options.scaleFactor ?? config.upscale_scale_factor,
    flavor: options.flavor ?? config.upscale_flavor,
    filter_nsfw: config.filter_nsfw
  };
  const task = await createTask(options.config, "/v1/ai/image-upscaler-precision-v2", body);
  const completed = await waitForTask(options.config, `/v1/ai/image-upscaler-precision-v2/${task.taskId}`);
  const generatedUrl = firstGeneratedUrl(completed);

  await downloadGeneratedFile(generatedUrl, options.outputPath);

  return {
    filePath: options.outputPath,
    written: true,
    taskId: task.taskId,
    status: completed.data?.status,
    generatedUrl,
    raw: completed
  };
}

export async function generateSceneVideoWithMagnific(
  options: MagnificVideoOptions
): Promise<MagnificGenerationResult> {
  if (!options.force && (await fs.pathExists(options.outputPath))) {
    return { filePath: options.outputPath, written: false };
  }

  const config = options.config.providers.magnific;
  const model = config.video_model;
  const body: Record<string, unknown> = {
    prompt: options.prompt,
    negative_prompt: options.negativePrompt || undefined,
    duration: String(options.durationSeconds ?? config.video_duration_seconds),
    aspect_ratio: magnificAspectRatio(options.config.aspect_ratio),
    generate_audio: options.generateAudio ?? config.video_generate_audio
  };

  if (options.inputImagePath) {
    body.image = await imageToBase64(options.inputImagePath);
  }

  const task = await createTask(options.config, videoCreatePath(model), body);
  const completed = await waitForTask(options.config, videoStatusPath(model, task.taskId));
  const generatedUrl = firstGeneratedUrl(completed);

  await downloadGeneratedFile(generatedUrl, options.outputPath);

  return {
    filePath: options.outputPath,
    written: true,
    taskId: task.taskId,
    status: completed.data?.status,
    generatedUrl,
    raw: completed
  };
}

export function magnificAspectRatio(aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case "16:9":
      return "widescreen_16_9";
    case "1:1":
      return "square_1_1";
    case "4:5":
      return "social_post_4_5";
    case "9:16":
    default:
      return "social_story_9_16";
  }
}

async function createTask(
  config: ProjectConfig,
  apiPath: string,
  body: Record<string, unknown>
): Promise<{ taskId: string; raw: MagnificTaskResponse }> {
  const response = await magnificFetch(config, apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stripUndefined(body))
  });
  const payload = (await response.json()) as MagnificTaskResponse;

  if (!response.ok) {
    throw new Error(magnificErrorMessage("task creation", payload));
  }

  const taskId = payload.data?.task_id;
  if (!taskId) {
    throw new Error("Magnific task creation did not return a task_id.");
  }

  return { taskId, raw: payload };
}

async function waitForTask(config: ProjectConfig, apiPath: string): Promise<MagnificTaskResponse> {
  const providerConfig = config.providers.magnific;
  const started = Date.now();
  const timeoutMs = providerConfig.poll_timeout_seconds * 1000;
  const intervalMs = providerConfig.poll_interval_seconds * 1000;

  while (Date.now() - started < timeoutMs) {
    const response = await magnificFetch(config, apiPath, { method: "GET" });
    const payload = (await response.json()) as MagnificTaskResponse;

    if (!response.ok) {
      throw new Error(magnificErrorMessage("task polling", payload));
    }

    const status = payload.data?.status?.toUpperCase() ?? "";
    if (["COMPLETED", "DONE", "SUCCEEDED", "SUCCESS"].includes(status)) {
      return payload;
    }

    if (["FAILED", "ERROR", "CANCELLED", "CANCELED"].includes(status)) {
      throw new Error(magnificErrorMessage(`task ${status.toLowerCase()}`, payload));
    }

    await delay(intervalMs);
  }

  throw new Error(`Magnific task timed out after ${providerConfig.poll_timeout_seconds} seconds.`);
}

async function magnificFetch(
  config: ProjectConfig,
  apiPath: string,
  init: RequestInit
): Promise<Response> {
  const apiKey = readApiKey();
  const url = new URL(apiPath, config.providers.magnific.base_url);
  const headers = new Headers(init.headers);
  headers.set("x-magnific-api-key", apiKey);

  return fetch(url, { ...init, headers });
}

async function imageToBase64(filePath: string): Promise<string> {
  return (await fs.readFile(filePath)).toString("base64");
}

async function downloadGeneratedFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download Magnific result: ${response.status} ${response.statusText}`);
  }

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
}

function firstGeneratedUrl(payload: MagnificTaskResponse): string {
  const generatedUrl = payload.data?.generated?.find(Boolean);
  if (!generatedUrl) {
    throw new Error("Magnific task completed without a generated asset URL.");
  }

  return generatedUrl;
}

function videoCreatePath(model: string): string {
  if (model.startsWith("/")) {
    return model;
  }

  return `/v1/ai/image-to-video/${model}`;
}

function videoStatusPath(model: string, taskId: string): string {
  if (model.startsWith("/")) {
    return `${model.replace(/\/+$/, "")}/${taskId}`;
  }

  if (model === "kling-v2-6-pro") {
    return `/v1/ai/image-to-video/kling-v2-6/${taskId}`;
  }

  return `/v1/ai/image-to-video/${model}/${taskId}`;
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function readApiKey(): string {
  const apiKey = process.env.MAGNIFIC_API_KEY;
  if (!apiKey) {
    throw new Error(`MAGNIFIC_API_KEY is not set.

Set it before using Magnific providers:

macOS / Linux:
export MAGNIFIC_API_KEY="..."

PowerShell:
$env:MAGNIFIC_API_KEY="..."

Then rerun the command.`);
  }

  return apiKey;
}

function magnificErrorMessage(operation: string, payload: MagnificTaskResponse | unknown): string {
  const message =
    typeof payload === "object" && payload
      ? (payload as MagnificTaskResponse).error?.message ?? (payload as MagnificTaskResponse).message
      : undefined;

  return `Magnific ${operation} failed.${message ? `\n\n${message}` : ""}`;
}

import path from "node:path";
import fs from "fs-extra";
import { stringify } from "csv-stringify/sync";
import { writeJsonFile, writeTextFile, type WriteResult, displayPath } from "./files.js";
import { slugifyName } from "./format.js";
import { writeMockPng } from "./mock-png.js";
import type { ProjectConfig, StockAssetMediaType, StockAssetProvider, VisualEvent } from "./schemas.js";

export interface StockAssetDownloadOptions {
  projectRoot: string;
  outputFolder: string;
  config: ProjectConfig;
  provider?: StockAssetProvider;
  mediaType?: StockAssetMediaType;
  limit?: number;
  force?: boolean;
  dryRun?: boolean;
}

export interface StockAssetDownloadResult {
  event_id: string;
  scene_number: number;
  provider: StockAssetProvider;
  media_type: StockAssetMediaType;
  query: string;
  status: "planned" | "downloaded" | "skipped" | "not_found" | "failed";
  relative_path: string;
  source_url: string;
  creator: string;
  creator_url: string;
  provider_asset_id: string;
  credit_line: string;
  license_note: string;
  error: string;
}

export interface StockAssetDownloadSummary {
  provider: StockAssetProvider;
  mediaType: StockAssetMediaType;
  results: StockAssetDownloadResult[];
  writes: WriteResult[];
}

interface ProviderAsset {
  id: string;
  downloadUrl: string;
  sourceUrl: string;
  creator: string;
  creatorUrl: string;
  extension: string;
}

export async function readStockVisualEvents(outputFolder: string): Promise<VisualEvent[]> {
  const eventsPath = path.join(outputFolder, "06_edit_pack", "visual_events.json");
  if (!(await fs.pathExists(eventsPath))) {
    return [];
  }

  const events = (await fs.readJson(eventsPath)) as VisualEvent[];
  return events.filter((event) => event.source_type === "stock" && event.search_query);
}

export async function downloadStockAssets(options: StockAssetDownloadOptions): Promise<StockAssetDownloadSummary> {
  const provider = options.provider ?? options.config.stock_assets.provider;
  const mediaType = options.mediaType ?? options.config.stock_assets.media_type;
  const limit = options.limit ?? options.config.stock_assets.max_assets;
  const stockEvents = (await readStockVisualEvents(options.outputFolder)).slice(0, limit);
  const stockFolder = path.join(options.outputFolder, "06_edit_pack", "stock_assets");
  const results: StockAssetDownloadResult[] = [];
  const assetWrites: WriteResult[] = [];

  await fs.ensureDir(stockFolder);

  for (const event of stockEvents) {
    const query = event.search_query ?? "";

    try {
      if (options.dryRun) {
        results.push(resultFor(event, provider, mediaType, query, "planned", "", "", "", "", "", ""));
        continue;
      }

      if (provider === "mock") {
        const filePath = path.join(stockFolder, assetFilename(event, query, "png"));
        const written = await writeMockPng({
          filePath,
          aspectRatio: options.config.aspect_ratio,
          sceneNumber: event.scene_number,
          start: event.start_time,
          end: "STOCK",
          force: options.force
        });
        assetWrites.push({ filePath, written });
        results.push(
          resultFor(
            event,
            provider,
            "photo",
            query,
            written ? "downloaded" : "skipped",
            displayPath(options.projectRoot, filePath),
            "",
            "video-pack mock stock",
            "",
            event.event_id,
            ""
          )
        );
        continue;
      }

      const providerAsset =
        provider === "pexels"
          ? await findPexelsAsset(query, mediaType, orientationForProvider(options.config))
          : await findPixabayAsset(query, mediaType, orientationForProvider(options.config), options.config.stock_assets.safe_search);

      if (!providerAsset) {
        results.push(resultFor(event, provider, mediaType, query, "not_found", "", "", "", "", "", ""));
        continue;
      }

      const filePath = path.join(stockFolder, assetFilename(event, query, providerAsset.extension));
      if (!options.force && (await fs.pathExists(filePath))) {
        assetWrites.push({ filePath, written: false });
        results.push(
          resultFor(
            event,
            provider,
            mediaType,
            query,
            "skipped",
            displayPath(options.projectRoot, filePath),
            providerAsset.sourceUrl,
            providerAsset.creator,
            providerAsset.creatorUrl,
            providerAsset.id,
            providerAsset.sourceUrl
          )
        );
        continue;
      }

      await downloadFile(providerAsset.downloadUrl, filePath);
      assetWrites.push({ filePath, written: true });
      results.push(
        resultFor(
          event,
          provider,
          mediaType,
          query,
          "downloaded",
          displayPath(options.projectRoot, filePath),
          providerAsset.sourceUrl,
          providerAsset.creator,
          providerAsset.creatorUrl,
          providerAsset.id,
          providerAsset.sourceUrl
        )
      );
    } catch (error) {
      results.push(
        resultFor(
          event,
          provider,
          mediaType,
          query,
          "failed",
          "",
          "",
          "",
          "",
          "",
          "",
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  const writes = await Promise.all([
    writeJsonFile(path.join(stockFolder, "download_report.json"), { provider, media_type: mediaType, results }, { force: true }),
    writeTextFile(path.join(stockFolder, "download_report.csv"), stockDownloadResultsToCsv(results), { force: true }),
    writeTextFile(path.join(stockFolder, "credits.md"), stockDownloadCreditsMarkdown(results), { force: true })
  ]);

  return { provider, mediaType, results, writes: [...assetWrites, ...writes] };
}

export function stockDownloadResultsToCsv(results: StockAssetDownloadResult[]): string {
  return stringify(results, {
    header: true,
    columns: [
      "event_id",
      "scene_number",
      "provider",
      "media_type",
      "query",
      "status",
      "relative_path",
      "source_url",
      "creator",
      "creator_url",
      "provider_asset_id",
      "credit_line",
      "license_note",
      "error"
    ]
  });
}

export function stockDownloadCreditsMarkdown(results: StockAssetDownloadResult[]): string {
  const rows = results
    .filter((result) => result.status === "downloaded" || result.status === "skipped")
    .map(
      (result) =>
        `| ${result.event_id} | ${result.provider} | ${result.creator || "-"} | ${
          result.source_url || "-"
        } | ${result.relative_path || "-"} | ${result.license_note} |`
    )
    .join("\n");

  return `# Downloaded Stock Credits

Review every downloaded asset before publishing. Provider search results can change, and the final license/credit decision is still yours.

| Event | Provider | Creator | Source URL | Local file | License / credit note |
| --- | --- | --- | --- | --- | --- |
${rows || "| - | - | No downloaded stock assets yet. | - | - | - |"}
`;
}

function resultFor(
  event: VisualEvent,
  provider: StockAssetProvider,
  mediaType: StockAssetMediaType,
  query: string,
  status: StockAssetDownloadResult["status"],
  relativePath: string,
  sourceUrl: string,
  creator: string,
  creatorUrl: string,
  providerAssetId: string,
  creditSourceUrl: string,
  error = ""
): StockAssetDownloadResult {
  const licenseNote =
    provider === "mock"
      ? "Mock placeholder generated locally; replace before publishing."
      : `${provider} asset downloaded through official API; verify current license and attribution requirements before publishing.`;
  const creditLine = creator && creditSourceUrl ? `${creator} via ${provider}: ${creditSourceUrl}` : "";

  return {
    event_id: event.event_id,
    scene_number: event.scene_number,
    provider,
    media_type: mediaType,
    query,
    status,
    relative_path: relativePath,
    source_url: sourceUrl,
    creator,
    creator_url: creatorUrl,
    provider_asset_id: providerAssetId,
    credit_line: creditLine,
    license_note: licenseNote,
    error
  };
}

function assetFilename(event: VisualEvent, query: string, extension: string): string {
  const slug = slugifyName(query).slice(0, 42) || `scene-${event.scene_number}`;
  return `${event.event_id}_${slug}.${extension.replace(/^\./, "")}`;
}

async function findPexelsAsset(
  query: string,
  mediaType: StockAssetMediaType,
  orientation: string
): Promise<ProviderAsset | undefined> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("Set PEXELS_API_KEY in .env before using provider pexels.");
  }

  if (mediaType === "video") {
    const url = new URL("https://api.pexels.com/videos/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", orientation);
    const data = (await fetchJson(url, { Authorization: apiKey })) as PexelsVideoResponse;
    const video = data.videos?.[0];
    const file = video?.video_files?.find((item) => item.quality === "hd") ?? video?.video_files?.[0];
    if (!video || !file) {
      return undefined;
    }

    return {
      id: String(video.id),
      downloadUrl: file.link,
      sourceUrl: video.url,
      creator: video.user?.name ?? "",
      creatorUrl: video.user?.url ?? "",
      extension: "mp4"
    };
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", orientation);
  const data = (await fetchJson(url, { Authorization: apiKey })) as PexelsPhotoResponse;
  const photo = data.photos?.[0];
  if (!photo) {
    return undefined;
  }
  const downloadUrl = photo.src?.large2x ?? photo.src?.large ?? photo.src?.original;
  if (!downloadUrl) {
    return undefined;
  }

  return {
    id: String(photo.id),
    downloadUrl,
    sourceUrl: photo.url,
    creator: photo.photographer ?? "",
    creatorUrl: photo.photographer_url ?? "",
    extension: "jpg"
  };
}

async function findPixabayAsset(
  query: string,
  mediaType: StockAssetMediaType,
  orientation: string,
  safeSearch: boolean
): Promise<ProviderAsset | undefined> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    throw new Error("Set PIXABAY_API_KEY in .env before using provider pixabay.");
  }

  const url = new URL(mediaType === "video" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", "3");
  url.searchParams.set("safesearch", safeSearch ? "true" : "false");

  if (mediaType === "photo") {
    url.searchParams.set("image_type", "photo");
    if (orientation !== "square") {
      url.searchParams.set("orientation", orientation);
    }
    const data = (await fetchJson(url)) as PixabayPhotoResponse;
    const photo = data.hits?.[0];
    if (!photo) {
      return undefined;
    }

    return {
      id: String(photo.id),
      downloadUrl: photo.largeImageURL || photo.webformatURL,
      sourceUrl: photo.pageURL,
      creator: photo.user ?? "",
      creatorUrl: photo.user_id ? `https://pixabay.com/users/${photo.user}-${photo.user_id}/` : "",
      extension: "jpg"
    };
  }

  const data = (await fetchJson(url)) as PixabayVideoResponse;
  const video = data.hits?.[0];
  const videoFile = video?.videos?.large ?? video?.videos?.medium ?? video?.videos?.small;
  if (!video || !videoFile) {
    return undefined;
  }

  return {
    id: String(video.id),
    downloadUrl: videoFile.url,
    sourceUrl: video.pageURL,
    creator: video.user ?? "",
    creatorUrl: video.user_id ? `https://pixabay.com/users/${video.user}-${video.user_id}/` : "",
    extension: "mp4"
  };
}

async function fetchJson(url: URL, headers: Record<string, string> = {}): Promise<unknown> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Stock provider request failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function downloadFile(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Asset download failed (${response.status}): ${url}`);
  }

  await fs.ensureDir(path.dirname(filePath));
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

function orientationForProvider(config: ProjectConfig): "landscape" | "portrait" | "square" {
  if (config.stock_assets.orientation !== "profile") {
    return config.stock_assets.orientation;
  }

  if (config.aspect_ratio === "16:9") {
    return "landscape";
  }

  if (config.aspect_ratio === "1:1") {
    return "square";
  }

  return "portrait";
}

interface PexelsPhotoResponse {
  photos?: Array<{
    id: number;
    url: string;
    photographer?: string;
    photographer_url?: string;
    src?: {
      original: string;
      large?: string;
      large2x?: string;
    };
  }>;
}

interface PexelsVideoResponse {
  videos?: Array<{
    id: number;
    url: string;
    user?: {
      name?: string;
      url?: string;
    };
    video_files?: Array<{
      quality?: string;
      link: string;
    }>;
  }>;
}

interface PixabayPhotoResponse {
  hits?: Array<{
    id: number;
    pageURL: string;
    largeImageURL: string;
    webformatURL: string;
    user?: string;
    user_id?: number;
  }>;
}

interface PixabayVideoResponse {
  hits?: Array<{
    id: number;
    pageURL: string;
    user?: string;
    user_id?: number;
    videos?: {
      large?: { url: string };
      medium?: { url: string };
      small?: { url: string };
    };
  }>;
}

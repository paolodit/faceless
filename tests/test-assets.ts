import path from "node:path";
import fs from "fs-extra";

const MOCK_MARKER_SUFFIX = ".faceless-mock.json";

export async function simulateExternalAssets(folder: string): Promise<void> {
  const entries = (await fs.readdir(folder, { recursive: true })) as string[];
  for (const entry of entries) {
    if (!entry.endsWith(MOCK_MARKER_SUFFIX)) {
      continue;
    }

    const assetPath = path.join(folder, entry.slice(0, -MOCK_MARKER_SUFFIX.length));
    if (await fs.pathExists(assetPath)) {
      await fs.appendFile(assetPath, Buffer.from("external-test-asset"));
    }
  }
}

export async function configureTestAudio(projectPath: string): Promise<void> {
  const audioPath = path.join(projectPath, "input", "voice.mp3");
  await fs.writeFile(audioPath, Buffer.from("test audio fixture"));
}

import path from "node:path";
import fs from "fs-extra";
import { writeTextFile } from "../lib/files.js";

export async function initProject(projectName: string): Promise<string> {
  const projectRoot = path.resolve(process.cwd(), projectName);

  if ((await fs.pathExists(projectRoot)) && (await fs.readdir(projectRoot)).length > 0) {
    throw new Error(`Project folder already exists and is not empty:\n${projectRoot}`);
  }

  const inputFolder = path.join(projectRoot, "input");
  const outputFolder = path.join(projectRoot, "output");
  await fs.ensureDir(inputFolder);
  await fs.ensureDir(outputFolder);

  await Promise.all([
    writeTextFile(path.join(projectRoot, "project.yml"), projectYaml(projectName)),
    writeTextFile(path.join(inputFolder, "script.txt"), starterScript()),
    writeTextFile(path.join(inputFolder, "style-bible.yml"), starterStyleBible()),
    writeTextFile(path.join(inputFolder, "characters.yml"), starterCharacters()),
    writeTextFile(path.join(inputFolder, "voice.example.txt"), voiceExample()),
    writeTextFile(path.join(projectRoot, "README_PROJECT.md"), projectReadme(projectName))
  ]);

  return `Created video-pack project: ${projectName}

Next step:
video-pack validate --project ./${projectName}`;
}

function projectYaml(projectName: string): string {
  return `project_name: ${JSON.stringify(projectName)}
profile: "tiktok"
aspect_ratio: "9:16"

input:
  audio_file: ""
  script_file: "./input/script.txt"
  style_bible: "./input/style-bible.yml"
  character_bible: "./input/characters.yml"

output:
  folder: "./output"

generation:
  image_provider: "manual"
  preview_scenes: 5
  scene_duration_target_seconds: 5
  max_scene_duration_seconds: 8
  min_scene_duration_seconds: 3
  images_per_scene: 1

costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
`;
}

function starterStyleBible(): string {
  return `style_name: "Example Visual Style"

visual_style:
  medium: "simple hand-drawn cartoon"
  line_quality: "clean but slightly imperfect"
  colour_palette: "limited flat colours"
  background_style: "minimal, often white or sparse"
  visual_complexity: "low"
  emotional_tone: "comic, warm and observant"

composition_rules:
  aspect_ratio: "9:16"
  framing: "single clear idea per scene"
  readability: "must be readable on mobile"
  subject_size: "large central character or object"

prompt_rules:
  always_include:
    - "consistent recurring character style"
    - "simple flat illustration"
    - "clear readable composition"
    - "minimal background clutter"
  avoid:
    - "photorealism"
    - "cinematic lighting"
    - "3D render"
    - "overly detailed background"
    - "tiny unreadable text"
    - "different character design between scenes"
`;
}

function starterCharacters(): string {
  return `characters:
  - name: "Main Character"
    role: "protagonist"
    appearance:
      body_type: "ordinary adult"
      clothing: "casual jumper and trousers"
      hair: "slightly messy hair"
      expression_range:
        - "hopeful"
        - "frazzled"
        - "confused"
        - "resigned"
    personality:
      traits:
        - "overthinks"
        - "tries to be productive"
        - "gets overwhelmed easily"
    prompt_anchor: "same simple hand-drawn recurring character, casual jumper, slightly messy hair"

  - name: "Inner Critic"
    role: "comic antagonist"
    appearance:
      body_type: "small symbolic creature"
      expression_range:
        - "smug"
        - "accusing"
        - "dramatic"
    personality:
      traits:
        - "interrupts"
        - "turns small tasks into moral crises"
    prompt_anchor: "small symbolic creature representing guilt and self-criticism"
`;
}

function starterScript(): string {
  return `I thought I was going to relax today.

Then my brain reminded me about the unread emails.

Then the unpaid invoice.

Then the half-built app.

Then the thing I said weirdly in 2017.
`;
}

function voiceExample(): string {
  return `Optional narration file.

Record your own voiceover as .mp3, .wav or .m4a, then update project.yml:

input:
  audio_file: "./input/voice.mp3"

The MVP can still prepare timings from script.txt without audio.
`;
}

function projectReadme(projectName: string): string {
  return `# ${projectName}

This is a local video production pack project.

Start here:

\`\`\`bash
video-pack validate --project .
video-pack analyze --project .
video-pack plan --project .
video-pack prepare --project .
video-pack prompts --project .
video-pack preview --project . --count 5
video-pack generate-images --project .
video-pack package --project .
video-pack status --project .
\`\`\`

Edit the files in \`input/\` to change the script, visual style, characters and production settings.
`;
}

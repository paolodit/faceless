import path from "node:path";
import fs from "fs-extra";
import { displayPath, writeTextFile } from "../lib/files.js";
import { getProductionPipeline, normalizeCreatorType } from "../lib/pipelines.js";
import { writeProjectBoard } from "../lib/project-board.js";
import { loadValidProject } from "../lib/validation.js";

interface ProjectStarter {
  pipeline: "narrated-explainer" | "linkedin-vox-pop" | "narrated-visual-story";
  profile: "tiktok" | "linkedin-video";
  aspectRatio: "9:16" | "4:5";
  sceneDurationTarget: number;
}

export async function initProject(projectName: string, options: { type?: string } = {}): Promise<string> {
  const pipeline = normalizeCreatorType(options.type);
  if (!pipeline) {
    throw new Error(`Unknown creator type: "${options.type}"

Choose one:
- explainer
- linkedin
- story`);
  }

  const starter = starterFor(pipeline);
  const projectRoot = path.resolve(process.cwd(), projectName);
  const resolvedProjectName = path.basename(path.normalize(projectName));
  const projectArg = displayPath(process.cwd(), projectRoot) || ".";

  if ((await fs.pathExists(projectRoot)) && (await fs.readdir(projectRoot)).length > 0) {
    throw new Error(`Project folder already exists and is not empty:\n${projectRoot}`);
  }

  const inputFolder = path.join(projectRoot, "input");
  const assetsFolder = path.join(inputFolder, "assets");
  const outputFolder = path.join(projectRoot, "output");
  await fs.ensureDir(inputFolder);
  await fs.ensureDir(assetsFolder);
  await fs.ensureDir(outputFolder);

  await Promise.all([
    writeTextFile(path.join(projectRoot, "project.yml"), projectYaml(resolvedProjectName, starter)),
    writeTextFile(path.join(inputFolder, "script.txt"), starterScript(starter.pipeline)),
    writeTextFile(path.join(inputFolder, "style-bible.yml"), starterStyleBible(starter)),
    writeTextFile(path.join(inputFolder, "characters.yml"), starterCharacters(starter.pipeline)),
    writeTextFile(path.join(inputFolder, "channel-bible.yml"), starterChannelBible(resolvedProjectName, starter.pipeline)),
    ...(starter.pipeline === "linkedin-vox-pop"
      ? [writeTextFile(path.join(inputFolder, "evidence.yml"), starterEvidence())]
      : []),
    ...(starter.pipeline === "narrated-visual-story"
      ? [writeTextFile(path.join(inputFolder, "continuity.yml"), starterContinuity())]
      : []),
    writeTextFile(path.join(inputFolder, "voice.example.txt"), voiceExample()),
    writeTextFile(path.join(assetsFolder, ".gitkeep"), ""),
    writeTextFile(path.join(projectRoot, "README_PROJECT.md"), projectReadme(resolvedProjectName, starter.pipeline))
  ]);
  const project = await loadValidProject(projectRoot);
  await writeProjectBoard(project, { force: true });

  const type = getProductionPipeline(starter.pipeline);

  return `Production created: ${resolvedProjectName}

Creator type: ${type.title}

Your one action now:
Replace ${projectArg}/input/script.txt with the spoken script. The starter creative bibles are already usable.

Open:
${projectArg}/output/NEXT.html

Returning agents should read:
${projectArg}/output/SESSION_HANDOFF.md`;
}

function starterFor(pipeline: ProjectStarter["pipeline"]): ProjectStarter {
  if (pipeline === "linkedin-vox-pop") {
    return { pipeline, profile: "linkedin-video", aspectRatio: "4:5", sceneDurationTarget: 5 };
  }

  return { pipeline, profile: "tiktok", aspectRatio: "9:16", sceneDurationTarget: 5 };
}

function projectYaml(projectName: string, starter: ProjectStarter): string {
  return `project_name: ${JSON.stringify(projectName)}
pipeline: "${starter.pipeline}"
profile: "${starter.profile}"
aspect_ratio: "${starter.aspectRatio}"

input:
  audio_file: ""
  script_file: "./input/script.txt"
  style_bible: "./input/style-bible.yml"
  character_bible: "./input/characters.yml"
  channel_bible: "./input/channel-bible.yml"
  evidence_file: ${starter.pipeline === "linkedin-vox-pop" ? '"./input/evidence.yml"' : '""'}
  continuity_file: ${starter.pipeline === "narrated-visual-story" ? '"./input/continuity.yml"' : '""'}

output:
  folder: "./output"

generation:
  image_provider: "manual"
  preview_scenes: 5
  scene_duration_target_seconds: ${starter.sceneDurationTarget}
  max_scene_duration_seconds: 8
  min_scene_duration_seconds: 3
  images_per_scene: 1
  words_per_minute: 150
  scene_video_provider: "manual"
  scene_video_duration_seconds: 5
  prefer_upscaled_images_for_video: true

transcription:
  provider: "script"
  model: "whisper-1"

providers:
  openai:
    image_model: "gpt-image-1"
    image_size: "auto"
    image_quality: "medium"
    image_output_format: "png"
    transcription_model: "whisper-1"
  magnific:
    base_url: "https://api.magnific.com"
    image_model: "flexible"
    image_resolution: "2k"
    image_engine: "automatic"
    filter_nsfw: true
    poll_interval_seconds: 5
    poll_timeout_seconds: 900
    upscale_scale_factor: 2
    upscale_sharpen: 7
    upscale_smart_grain: 7
    upscale_ultra_detail: 30
    upscale_flavor: "photo"
    video_model: "kling-v2-6-pro"
    video_duration_seconds: 5
    video_generate_audio: false
  higgsfield:
    mcp_url: "https://higgsfield.ai/mcp"
    cli_command: "higgsfield"

copy:
  provider: "heuristic"
  title_options: 8

scene_production:
  default_layout: "auto"
  continuity: "auto"
  additive_layers: 3
  voxpop_background: "consistent interview-style background"
  voxpop_middle_ground: "recurring presenter or interview subject"
  voxpop_foreground: "microphone, caption card, phone, or reaction prop"

stock_assets:
  enabled: false
  provider: "mock"
  media_type: "photo"
  max_assets: 10
  orientation: "profile"
  safe_search: true

costs:
  currency: "GBP"
  image_cost_per_generation: 0.04
  cost_multiplier: 2
`;
}

function starterChannelBible(projectName: string, pipeline: ProjectStarter["pipeline"]): string {
  if (pipeline === "linkedin-vox-pop") {
    return `channel_name: ${JSON.stringify(projectName)}
audience: "busy professionals who want a useful, defensible take without corporate filler"
platform_priorities:
  - "linkedin-video"

voice:
  tone: "clear, informed, conversational and mildly challenging"
  point_of_view: "first-person expert or practitioner perspective"
  pacing: "hook, claim, concrete example, practical takeaway"

content_pillars:
  - "better ways to think about work and technology"
  - "plain-English AI and business concepts"
  - "practical points of view"

recurring_formats:
  - "the thing people get wrong about X"
  - "one term, one example, one useful takeaway"
  - "vox-pop reaction followed by a clear point of view"

publishing:
  default_cta: "What are you seeing in practice?"
  description_boilerplate: "A practical point of view, made for discussion."
  hashtags:
    - "#LinkedInVideo"
    - "#AI"
    - "#Leadership"

prompt_rules:
  always_include:
    - "credible, conversational professional setting"
    - "one clear speaker, quote card or supporting visual"
    - "large readable overlay-safe areas"
  avoid:
    - "generic corporate stock-photo energy"
    - "tiny generated text"
  thumbnail_rules:
    - "one clear claim or expressive presenter"
    - "professional but human"
  title_rules:
    - "lead with a specific contrarian or practical point"
    - "avoid jargon unless the video explains it"
`;
  }

  if (pipeline === "narrated-visual-story") {
    return `channel_name: ${JSON.stringify(projectName)}
audience: "viewers who like character-led stories, local details and a warm sense of place"
platform_priorities:
  - "tiktok"
  - "youtube-shorts"

voice:
  tone: "warm, vivid, funny and emotionally direct"
  point_of_view: "narrated storyteller"
  pacing: "setup, escalation, payoff"

content_pillars:
  - "stories with a strong sense of place"
  - "unlikely friendships and local legends"
  - "small characters facing a bigger moment"

recurring_formats:
  - "a place becomes a character"
  - "the ordinary turns a little magical"
  - "a small act becomes the payoff"

publishing:
  default_cta: "Follow for the next story."
  description_boilerplate: "A narrated visual story."
  hashtags:
    - "#Storytelling"
    - "#AnimatedShort"

prompt_rules:
  always_include:
    - "consistent recurring characters and locations"
    - "clear emotional expression"
    - "one readable story beat per scene"
  avoid:
    - "inconsistent character design"
    - "generic fantasy imagery without a sense of place"
  thumbnail_rules:
    - "recognisable main character and emotional moment"
    - "strong sense of place"
  title_rules:
    - "name the story, place or irresistible premise"
    - "keep the promise concrete"
`;
  }

  return `channel_name: ${JSON.stringify(projectName)}
audience: "curious viewers who want one useful idea explained clearly in under a minute"
platform_priorities:
  - "tiktok"
  - "youtube-shorts"

voice:
  tone: "clear, curious, concise and never patronising"
  point_of_view: "plain-language visual explainer"
  pacing: "question, answer, concrete example, memorable takeaway"

content_pillars:
  - "useful ideas hidden in ordinary behaviour"
  - "work, technology and creative thinking"
  - "plain-English explanations"

recurring_formats:
  - "why does this happen?"
  - "one concept, one example, one takeaway"
  - "the simple answer and the more useful answer"

publishing:
  default_cta: "What should we explain next?"
  description_boilerplate: "One useful idea, explained visually."
  hashtags:
    - "#explainer"
    - "#shorts"

prompt_rules:
  always_include:
    - "visual idea should be instantly readable"
    - "single clear focal point"
  avoid:
    - "busy composition"
    - "tiny captions or dense factual text that needs perfect readability"
  thumbnail_rules:
    - "one expressive subject"
    - "strong simple silhouette"
    - "no more than three words if text is implied"
  title_rules:
    - "ask a concrete why or how question"
    - "promise one useful answer"
`;
}

function starterStyleBible(starter: ProjectStarter): string {
  const story = starter.pipeline === "narrated-visual-story";
  const linkedin = starter.pipeline === "linkedin-vox-pop";

  return `style_name: "${linkedin ? "LinkedIn POV Visual System" : story ? "Narrated Story Visual System" : "Short Explainer Visual System"}"

visual_style:
  medium: "${linkedin ? "editorial illustration and grounded photographic cutaways" : "simple hand-drawn illustration"}"
  line_quality: "${linkedin ? "clean editorial shapes with clear text-safe space" : "clean but slightly imperfect"}"
  colour_palette: "${linkedin ? "restrained charcoal, white, teal and warm accent" : "limited flat colours"}"
  background_style: "${linkedin ? "credible work, street interview or human-scale professional settings" : story ? "specific recurring places with simple atmospheric detail" : "minimal, often white or sparse"}"
  visual_complexity: "${linkedin ? "medium" : "low"}"
  emotional_tone: "${linkedin ? "clear, human and confidently useful" : story ? "warm, vivid and gently magical" : "comic, warm and observant"}"

composition_rules:
  aspect_ratio: "${starter.aspectRatio}"
  framing: "${linkedin ? "one speaker, claim or supporting visual per scene" : "single clear idea per scene"}"
  readability: "must be readable on mobile without generated tiny text"
  subject_size: "${linkedin ? "large speaking subject, quote card or cutaway focal point" : "large central character or object"}"

prompt_rules:
  always_include:
    - "${linkedin ? "credible human scale and overlay-safe negative space" : "consistent recurring character style"}"
    - "${linkedin ? "one clear professional or human focal point" : "simple flat illustration"}"
    - "clear readable composition"
    - "minimal background clutter"
  avoid:
    - "${linkedin ? "generic corporate stock-photo energy" : "photorealism"}"
    - "${linkedin ? "tiny quote text rendered inside the image" : "cinematic lighting"}"
    - "${linkedin ? "busy boardroom scenes" : "3D render"}"
    - "overly detailed background"
    - "tiny captions or dense factual text that needs perfect readability"
    - "different character design between scenes"
`;
}

function starterCharacters(pipeline: ProjectStarter["pipeline"]): string {
  if (pipeline === "linkedin-vox-pop") {
    return `characters:
  - name: "Point-of-View Presenter"
    role: "recurring expert or practitioner voice"
    appearance:
      body_type: "approachable adult professional"
      clothing: "simple confident everyday workwear"
      expression_range:
        - "curious"
        - "clear-eyed"
        - "wry"
        - "encouraging"
    personality:
      traits:
        - "plain-speaking"
        - "credible"
        - "constructively challenging"
    prompt_anchor: "same approachable professional presenter, clear expression, grounded editorial visual style"

  - name: "Audience Voice"
    role: "reaction, vox-pop or supporting human perspective"
    appearance:
      body_type: "varied adult professionals and members of the public"
      expression_range:
        - "thoughtful"
        - "skeptical"
        - "interested"
    personality:
      traits:
        - "asks practical questions"
    prompt_anchor: "human-scale vox-pop participant, natural expression, credible everyday setting"
`;
  }

  if (pipeline === "narrated-visual-story") {
    return `characters:
  - name: "Story Lead"
    role: "main character"
    appearance:
      body_type: "recognisable everyday protagonist"
      clothing: "same practical outfit across scenes"
      expression_range:
        - "hopeful"
        - "determined"
        - "surprised"
        - "joyful"
    personality:
      traits:
        - "curious"
        - "resilient"
        - "kind"
    prompt_anchor: "same recurring story protagonist, recognisable clothing, clear warm expression, consistent illustrated style"

  - name: "Story Companion"
    role: "sidekick, local legend or emotional counterpoint"
    appearance:
      body_type: "small memorable companion"
      expression_range:
        - "watchful"
        - "playful"
        - "brave"
    personality:
      traits:
        - "loyal"
        - "unexpectedly capable"
    prompt_anchor: "same recurring story companion, clear silhouette, expressive and consistent illustrated style"
`;
  }

  return `characters:
  - name: "Visual Guide"
    role: "recurring plain-language explainer"
    appearance:
      body_type: "ordinary adult"
      clothing: "simple overshirt, plain t-shirt and trainers"
      hair: "simple recognisable silhouette"
      expression_range:
        - "curious"
        - "clear"
        - "surprised"
        - "thoughtful"
    personality:
      traits:
        - "plain-speaking"
        - "never patronising"
        - "likes concrete examples"
    prompt_anchor: "same simple hand-drawn visual guide, plain overshirt, curious clear expression"

  - name: "Example Subject"
    role: "person inside the concrete example"
    appearance:
      body_type: "ordinary person"
      clothing: "simple everyday clothing"
      expression_range:
        - "uncertain"
        - "recognising the pattern"
        - "relieved"
    personality:
      traits:
        - "relatable"
    prompt_anchor: "consistent ordinary example subject in simple everyday clothing, readable expression"
`;
}

function starterScript(pipeline: ProjectStarter["pipeline"]): string {
  if (pipeline === "linkedin-vox-pop") {
    return `Everyone says they want practical AI advice.

Then they get a list of tools with no real decision behind it.

The useful question is not, what can this tool do?

It is, what work are we trying to make less repetitive, less vague or less fragile?

Start there. The tool choice gets much clearer.`;
  }

  if (pipeline === "narrated-visual-story") {
    return `Everyone in town knew the old pier had a story.

But no one expected the quiet kid at the end of the promenade to become part of it.

Then the rain came in sideways, the water rose, and a familiar little companion ran toward the noise.

By the time the town looked up, the ordinary day had become a legend.`;
  }

  return `Why can one tiny unfinished task feel heavier than ten finished ones?

The simple answer is attention. Your brain keeps incomplete tasks easier to recall than completed ones.

Imagine replying to nine emails but leaving one awkward message open. The finished replies disappear. The awkward one keeps tapping the glass.

That does not mean the last task is the most important. It means unfinished work is unusually good at staying visible.

So when one small task feels enormous, write down the next action. Give your brain somewhere else to keep it.
`;
}

function voiceExample(): string {
  return `Final narration file.

Record your own voiceover as .mp3, .wav, .m4a, or .aac. Save it as input/voice.mp3 (or the matching voice extension) and Faceless detects it automatically.

For another filename, update project.yml:

input:
  audio_file: "./input/voice.mp3"

The script can reach a reviewed route proposal without audio. Add final narration before timed scenes so cuts and captions follow the real delivery. Draft packaging remains available without it.
`;
}

function starterEvidence(): string {
  return `# Add one card for every factual claim, definition, statistic or example that needs checking.
# Use scene_numbers after running \`video-pack prepare\`; otherwise video-pack matches by shared terms.

claims:
  - id: "replace-with-your-first-claim"
    claim: "Replace this with a statement from your script."
    support_type: "source"
    source_title: "Add the article, report, guide or source name."
    source_url: "https://example.com/source"
    notes: "What this source proves, and any caveat to keep in the spoken wording."
    scene_numbers: []
`;
}

function starterContinuity(): string {
  return `# Keep this small and specific. Add scene_numbers after video-pack prepare when a character or place must recur.

world:
  name: "Your Story World"
  setting_anchor: "same recognisable local setting, consistent time of day and weather logic"
  visual_constants:
    - "same illustrated medium and line quality across scenes"
    - "consistent colour palette, weather and lighting logic"
    - "recurring places keep their recognisable silhouette and landmarks"

characters:
  - name: "Story Lead"
    visual_anchor: "same recurring story protagonist, recognisable clothing, clear warm expression, consistent illustrated style"
    scene_numbers: []
  - name: "Story Companion"
    visual_anchor: "same recurring story companion, clear silhouette, expressive and consistent illustrated style"
    scene_numbers: []

locations:
  - id: "primary-setting"
    name: "Primary Story Setting"
    visual_anchor: "same recognisable story setting with recurring landmarks and environmental details"
    scene_numbers: []
`;
}

function projectReadme(projectName: string, pipeline: ProjectStarter["pipeline"]): string {
  const type = getProductionPipeline(pipeline);
  const evidenceInput =
    pipeline === "linkedin-vox-pop"
      ? "- `input/evidence.yml` - claim cards for sources, first-hand experience, internal data or editorial opinion\n"
      : "";
  const continuityInput =
    pipeline === "narrated-visual-story"
      ? "- `input/continuity.yml` - story-world rules plus explicit recurring character and place anchors\n"
      : "";
  const claimReviewFile = pipeline === "linkedin-vox-pop" ? "- `output/00_analysis/claim_review.md`\n" : "";
  const continuityReviewFile =
    pipeline === "narrated-visual-story" ? "- `output/02_scenes/continuity_review.html`\n" : "";

  return `# ${projectName}

> ${type.title}: ${type.summary}

## Start Here

Open \`output/NEXT.html\`. It always contains the one decision or action that matters now.

If an AI agent is guiding you, say:

> Continue this production. Read README_PROJECT.md and output/SESSION_HANDOFF.md, show me the next useful review artifact, and guide me one decision at a time.

For a brand-new project, only replace:

- \`input/script.txt\` - your final spoken script

The starter style, character and channel bibles already work. Your agent should infer this project's route, propose a clear art direction, and only ask questions that change the result.

## Your Four Boards

| When you need | Open |
| --- | --- |
| The one next action | \`output/NEXT.html\` |
| A choice requiring your decision | \`output/DECISION.html\` |
| Overall production progress | \`output/PROGRESS.html\` |
| Scene-by-scene production detail | \`output/BOARD.html\` |

Images are embedded in generated HTML review boards, so previews remain visible when the project is opened in Codex, Claude Code, Claude Co-work or ChatGPT Work.

## Improve the Inputs Later

When you want a better result, customise:

- \`input/script.txt\` - your final spoken script
- \`input/style-bible.yml\` - visual style rules
- \`input/characters.yml\` - recurring characters or visual anchors
- \`input/channel-bible.yml\` - optional reusable channel voice and publishing rules
${evidenceInput}${continuityInput}- \`input/assets/\` - optional logos, reference images, stock clips, screenshots or brand files

If you are unsure what to write, ask your agent to help shape the script before it runs production steps.

After the route proposal, add the final voiceover before timed scenes:

\`\`\`text
input/voice.mp3
\`\`\`

Faceless detects \`voice.mp3\`, \`voice.wav\`, \`voice.m4a\`, or \`voice.aac\` in \`input/\` automatically. For another filename, update \`project.yml\`:

\`\`\`yaml
input:
  audio_file: "./input/voice.mp3"
\`\`\`

## Pick Back Up Here

Give a returning agent the project folder and the sentence above. It should run the local setup and status checks, read \`output/SESSION_HANDOFF.md\`, refresh the boards, and continue from the first incomplete stage.

The handoff records what changed, what needs review, whether an external or paid action is waiting, and the exact behind-the-scenes command. You should not need to remember the command sequence.

Review only the artifact relevant to the current decision. Useful files include:

- \`output/NEXT.html\`
- \`output/DECISION.html\`
- \`output/PROGRESS.html\`
- \`output/BOARD.html\`
- \`output/SESSION_HANDOFF.md\`
- \`output/00_analysis/route_review.html\`
- \`output/00_proposal/proposal.md\`
${claimReviewFile}${continuityReviewFile}
- \`output/02_scenes/scenes.md\`
- \`output/02_scenes/scene_production.md\`
- \`output/02_scenes/visual_events.md\`
- \`output/03_prompts/prompts.md\`
- \`output/04_images/review_board.html\`
- \`output/04_images/events/review_board.html\`
- \`output/04_images/scenes/\`
- \`output/08_remotion/README.md\`
- \`output/ARTIFACTS.md\`

## Human Gates

- Confirm before using a paid provider or sending content to an external provider.
- Review generated assets before changing their approval status.
- Do not replace creator-authored inputs or delete source media without confirmation.
- Fact-check claims and publishing copy before release.
- Faceless does not publish automatically.

Mock assets are layout placeholders, not finished creative. An editor pack is not a rendered video. The progress board reports these states separately.

## Optional Free Stock Assets

After \`visual-events\`, you can download mock stock placeholders:

\`\`\`bash
video-pack stock-assets --project . --provider mock
\`\`\`

For real free stock providers, add a provider API key to \`.env\`, then run:

\`\`\`bash
video-pack stock-assets --project . --provider pexels
video-pack stock-assets --project . --provider pixabay
\`\`\`

Stock is never downloaded implicitly during packaging. Review and approve each supporting cutaway before final packaging.

## Manual Controls

You normally do not need these. They are useful for automation or debugging:

\`\`\`bash
video-pack doctor --project .
video-pack next --project .
video-pack board --project .
video-pack status --project .
video-pack export-project --project .
\`\`\`

\`export-project\` creates a portable ZIP without environment files, common credential/key files, Git data, dependencies or caches. Review it before sharing. Use it when the agent workspace itself cannot be downloaded.

## Optional AI Polish

Scene folders are the easiest place to manage per-scene assets:

\`\`\`bash
video-pack scene-assets --project .
\`\`\`

To prepare human handoff prompts for upscaling or scene clips:

\`\`\`bash
video-pack upscale-images --project . --provider manual
video-pack generate-scene-videos --project . --provider higgsfield
\`\`\`

To run Magnific directly, set \`MAGNIFIC_API_KEY\`, then use:

\`\`\`bash
video-pack generate-images --project . --provider magnific
video-pack upscale-images --project . --provider magnific
video-pack generate-scene-videos --project . --provider magnific --duration 5
\`\`\`
`;
}

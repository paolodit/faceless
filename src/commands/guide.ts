import { wizardCommand } from "./wizard.js";

export async function guideCommand(projectPath?: string): Promise<string> {
  if (projectPath) {
    return wizardCommand(projectPath);
  }

  return `faceless video-pack guide

You are before the project folder stage.

Fastest first run:
1. Create a project folder:
   video-pack init my-video --type explainer
   Or choose: --type linkedin / --type story
2. Replace only the starter script:
   my-video/input/script.txt
3. Leave style-bible.yml, characters.yml and channel-bible.yml alone for now.
   They are valid starter files.
   LinkedIn projects also include input/evidence.yml for sources and declared opinions.
4. Ask the wizard what to do:
   video-pack wizard --project ./my-video
5. Let video-pack run the next safe step:
   video-pack next --project ./my-video

Useful setup guide:
docs/QUICKSTART.md
docs/CHATGPT_SETUP.md
docs/MAC_SETUP.md

When you want a more custom result, use ChatGPT to improve:
- my-video/input/style-bible.yml
- my-video/input/characters.yml
- my-video/input/channel-bible.yml

Optional voiceover:
my-video/input/voice.mp3

When scenes are prepared, visual events label pacing as:
- burst: hook or pattern interrupt
- steady: calm explanation
- additive: layered reveal or list build
- landing: recap, payoff or CTA

Once the folder exists, use this as the main user surface:
video-pack wizard --project ./my-video

To run the next safe step without copying commands:
video-pack next --project ./my-video

When your project folder exists, come back with:
video-pack guide --project ./my-video

Then the guide will show the next command, why it matters, and the short route to a real-asset edit pack.

For detailed file-by-file diagnostics, run:
video-pack status --project ./my-video`;
}

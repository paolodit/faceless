import { statusProjectCommand } from "./status.js";

export async function guideCommand(projectPath?: string): Promise<string> {
  if (projectPath) {
    return statusProjectCommand(projectPath);
  }

  return `faceless video-pack guide

You are before the project folder stage.

Start here:
1. Write the idea and spoken script in ChatGPT, Claude, or your normal writing process.
2. Create or record the voiceover.
3. Create a project folder with:
   video-pack init my-video
4. Put your final spoken script in:
   my-video/input/script.txt
5. Put your voiceover in:
   my-video/input/voice.mp3
6. Use ChatGPT to help fill:
   my-video/input/style-bible.yml
   my-video/input/characters.yml
   my-video/input/channel-bible.yml

Useful setup guide:
docs/CHATGPT_SETUP.md
docs/MAC_SETUP.md

When scenes are prepared, visual events label pacing as:
- burst: hook or pattern interrupt
- steady: calm explanation
- additive: layered reveal or list build
- landing: recap, payoff or CTA

Optional stock downloads come later with:
video-pack stock-assets --project ./my-video --provider mock

Optional browser preview and MP4 rendering come later with:
video-pack remotion --project ./my-video

When your project folder exists, come back with:
video-pack guide --project ./my-video

Then the guide will tell you exactly what is complete, what is missing, what to review, and the safest next command.`;
}

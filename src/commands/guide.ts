import { wizardCommand } from "./wizard.js";

export async function guideCommand(projectPath?: string): Promise<string> {
  if (projectPath) {
    return wizardCommand(projectPath);
  }

  return `faceless video-pack guide

You are before the project folder stage.

Recommended for creators using Codex, Claude Code or another coding agent:
1. Open START_WITH_AI.md.
2. Give the agent the copyable onboarding prompt.
3. Keep private creator work under productions/.

Direct CLI first run:
1. Create a private project folder:
   video-pack init productions/my-video --type explainer
   Or choose: --type linkedin / --type story
2. Replace only the starter script:
   productions/my-video/input/script.txt
3. Leave style-bible.yml, characters.yml and channel-bible.yml alone for now.
   They are valid starter files.
   LinkedIn projects also include input/evidence.yml for sources and declared opinions.
   Story projects also include input/continuity.yml for recurring people, places and visual rules.
4. Ask the wizard what to do:
   video-pack wizard --project productions/my-video
5. Let video-pack run the next safe step:
   video-pack next --project productions/my-video

Useful setup guide:
START_WITH_AI.md
docs/QUICKSTART.md
docs/CHATGPT_SETUP.md
docs/MAC_SETUP.md

When you want a more custom result, use ChatGPT to improve:
- productions/my-video/input/style-bible.yml
- productions/my-video/input/characters.yml
- productions/my-video/input/channel-bible.yml

Final voiceover (requested after the route proposal, before timed scenes):
productions/my-video/input/voice.mp3

When scenes are prepared, visual events label pacing as:
- burst: hook or pattern interrupt
- steady: calm explanation
- additive: layered reveal or list build
- landing: recap, payoff or CTA

Once the folder exists, use this as the main user surface:
video-pack wizard --project productions/my-video

To run the next safe step without copying commands:
video-pack next --project productions/my-video

When your project folder exists, come back with:
video-pack guide --project productions/my-video

Then the guide will show the next command, why it matters, and the short route to a real-asset edit pack.

For detailed file-by-file diagnostics, run:
video-pack status --project productions/my-video

At the end of a session, refresh and read:
video-pack board --project productions/my-video
productions/my-video/output/SESSION_HANDOFF.md`;
}

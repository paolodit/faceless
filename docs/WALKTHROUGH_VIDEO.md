# Walkthrough Video Script

This is a ready-to-record 3-5 minute GitHub walkthrough. Record it manually and add a real video link later; do not add a placeholder link.

Recommended demo: `examples/tiktok-local-film-pitch`.

## Recording Beats

1. Show the README's recommended Codex or Claude route and open `START_WITH_AI.md`.
2. Show the copyable onboarding prompt and explain that `AGENTS.md` supplies durable safety and workflow rules.
3. Show the README table with the three creator types.
4. Show `video-pack init productions/my-story --type story` and explain that `productions/` is ignored by Git.
5. Open the generated `input/script.txt`, `style-bible.yml`, `characters.yml`, `continuity.yml` and `channel-bible.yml`.
6. Run `video-pack wizard --project ./examples/tiktok-local-film-pitch`.
7. Run the no-cost route through `preview --provider mock`.
8. Show `continuity_review.html`, `scene_production.html`, `visual_events.md`, prompts and `BOARD.html`.
9. Explain that mock preview checks layout, not final art direction.
10. Show `generate-images --provider external` and `full_prompts.md`.
11. Show the image review board, approval, packaged edit files and `SESSION_HANDOFF.md`.

## Spoken Script

Hi, this is `faceless video-pack`.

It is a local, file-based production system for three jobs: short explainers, LinkedIn point-of-view or vox-pop videos, and narrated visual stories.

The easiest way to start is to open the repository in Codex, Claude Code or another coding agent with terminal and file access, then paste the prompt in `START_WITH_AI.md`. The agent becomes the conversational guide, while the CLI and generated files remain the dependable production system.

Agent instructions keep private work under `productions/`, prevent accidental commits, and require confirmation before paid providers, external uploads or creative approvals. Creators who prefer the terminal can still run every command directly.

You start outside the CLI by writing a spoken script. Then choose the creator type that matches the video, put the script in the input folder, and run the wizard.

For a narrated visual story, I would create a project like this:

```bash
video-pack init productions/my-story --type story
```

The project starts with a script, style bible, recurring character anchors, a continuity file, and a channel bible. They are working starters, not blank forms.

The continuity file gives the story one shared world, visual constants, and explicit scene mappings for any recurring character or place. The story review catches missing planning or prompt anchors before they become a batch of inconsistent images.

The two commands a creator needs day to day are:

```bash
video-pack wizard --project productions/my-story
video-pack next --project productions/my-story
```

The wizard says what matters next. `next` runs the safe step and refreshes a local browser board.

It also refreshes `output/SESSION_HANDOFF.md`, which records what is complete, what needs human review, the safety gates and the exact command to continue in another session.

The no-cost mock preview is intentionally honest. It checks scene timing, framing and the handoff flow. It does not pretend to judge final art direction.

For real imagery, use the generated external prompt pack or an API provider. When you use an external tool, save every completed image with its expected filename in `output/04_images/full/`.

Then the review board lets you approve, reject or regenerate each scene. The tool will not package a finished edit handoff until every scene has a real asset and approval.

The final edit pack includes captions, scene manifests, overlay text, stock worksheets, post-copy drafts, thumbnail prompts, CapCut/Premiere/DaVinci assembly files and an optional Remotion preview project.

The point is not to replace creative judgment. It is to make the production work legible, resumable and much less repetitive.

## Commands for the Recording

```bash
npm install
npm run build
node dist/index.js validate --project ./examples/tiktok-local-film-pitch
node dist/index.js analyze --project ./examples/tiktok-local-film-pitch
node dist/index.js plan --project ./examples/tiktok-local-film-pitch
node dist/index.js proposal --project ./examples/tiktok-local-film-pitch
node dist/index.js prepare --project ./examples/tiktok-local-film-pitch
node dist/index.js continuity --project ./examples/tiktok-local-film-pitch
node dist/index.js visual-events --project ./examples/tiktok-local-film-pitch
node dist/index.js prompts --project ./examples/tiktok-local-film-pitch
node dist/index.js preview --project ./examples/tiktok-local-film-pitch --provider mock
node dist/index.js generate-images --project ./examples/tiktok-local-film-pitch --provider mock
node dist/index.js approve-images --project ./examples/tiktok-local-film-pitch --approve-all
node dist/index.js package --project ./examples/tiktok-local-film-pitch
```

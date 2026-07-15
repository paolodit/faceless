# Walkthrough Video Script

This is a ready-to-record 3-5 minute GitHub walkthrough. Record it manually and add a real video link later; do not add a placeholder link.

Recommended demo: `examples/tiktok-local-film-pitch`.

## Recording Beats

1. Show the README table with the three creator types.
2. Show `video-pack init my-story --type story`.
3. Open the generated `input/script.txt`, `style-bible.yml`, `characters.yml`, `continuity.yml` and `channel-bible.yml`.
4. Run `video-pack wizard --project ./examples/tiktok-local-film-pitch`.
5. Run the no-cost route through `preview --provider mock`.
6. Show `continuity_review.html`, `scene_production.html`, `visual_events.md`, prompts and `BOARD.html`.
7. Explain that mock preview checks layout, not final art direction.
8. Show `generate-images --provider external` and `full_prompts.md`.
9. Show the image review board, approval and the packaged edit assembly files.

## Spoken Script

Hi, this is `faceless video-pack`.

It is a local, file-based production system for three jobs: short explainers, LinkedIn point-of-view or vox-pop videos, and narrated visual stories.

You start outside the CLI by writing a spoken script. Then choose the creator type that matches the video, put the script in the input folder, and run the wizard.

For a narrated visual story, I would create a project like this:

```bash
video-pack init my-story --type story
```

The project starts with a script, style bible, recurring character anchors, a continuity file, and a channel bible. They are working starters, not blank forms.

The continuity file gives the story one shared world, visual constants, and explicit scene mappings for any recurring character or place. The story review catches missing planning or prompt anchors before they become a batch of inconsistent images.

The two commands a creator needs day to day are:

```bash
video-pack wizard --project ./my-story
video-pack next --project ./my-story
```

The wizard says what matters next. `next` runs the safe step and refreshes a local browser board.

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

# Quick Start

## Recommended: Use an Agent

In Codex, ChatGPT Work, Claude Code, Claude Co-work, or another coding agent with repository and terminal access, paste:

> I want to create a video with https://github.com/paolodit/faceless - install it and guide me from my idea or script to a reviewed production.

The agent should infer the route when the idea is clear, ask only for the missing script or current-stage information, and keep the production under `productions/`.

You will normally interact with generated artifacts instead of commands:

- `output/NEXT.html`
- `output/DECISION.html`
- `output/PROGRESS.html`
- `output/BOARD.html`

When a hosted workspace is separate from your desktop, ask the agent for the portable production ZIP.

## Manual Install

Requirements: Node.js 20+, npm, Git, and a terminal.

```bash
git clone https://github.com/paolodit/faceless.git
cd faceless
npm ci
npm run build
npm link
video-pack doctor
```

Windows PowerShell may block `npm.ps1`; use `npm.cmd ci`, `npm.cmd run build`, and `npm.cmd link`. If `npm link` is unavailable, use `node dist/index.js` in place of `video-pack`.

## Manual First Project

```bash
video-pack init productions/my-video --type explainer
```

Use `--type linkedin` or `--type story` for the other focused routes. Replace `productions/my-video/input/script.txt`; the starter bibles are valid for a first pass.

```bash
video-pack doctor --project productions/my-video
video-pack next --project productions/my-video
```

`next` runs one safe local step and refreshes the stable artifacts. It does not spend provider credits or approve creative work without explicit options and human consent.

The script is enough for analysis and the route proposal. Before timed scenes, `next` asks for the final voiceover. Save `voice.mp3`, `voice.wav`, `voice.m4a`, or `voice.aac` under `input/` and Faceless detects it automatically. This prevents an entire visual plan being timed against a guess.

At the visual stage, primary frames and supporting raster cutaways are produced and approved separately:

```bash
video-pack generate-images --project productions/my-video --provider external
video-pack approve-images --project productions/my-video
video-pack visual-assets --project productions/my-video --provider external
video-pack approve-visual-assets --project productions/my-video
```

Only an agent or creator who has actually reviewed the boards should run approval actions.

## Package and Export

```bash
video-pack package --project productions/my-video --force
video-pack export-project --project productions/my-video --force
```

Normal packaging requires narration and approved primary/supporting raster visuals. An editor-ready pack is still not a rendered video. Check `output/PROGRESS.html` for MP4 status. Use `output/08_remotion/` for optional browser preview/render, or import the timeline helpers into CapCut, Premiere, or DaVinci Resolve.

## Resume

Tell the agent:

> Continue my Faceless production in `productions/my-video`, read its session handoff, and guide me from the first unfinished or stale decision.

Manual state checks:

```bash
video-pack doctor --project productions/my-video
video-pack status --project productions/my-video
video-pack board --project productions/my-video
```

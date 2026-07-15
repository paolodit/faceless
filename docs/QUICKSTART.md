# Quickstart

Use this for the shortest honest route from a script to a real edit pack.

## Recommended: Let an Agent Guide You

Open the repository in Codex, Claude Code or another coding agent with terminal and file access, then use the copyable prompt in [START_WITH_AI.md](../START_WITH_AI.md).

The agent should keep the production under `productions/`, operate `wizard` and `next`, pause at human gates, and refresh `output/SESSION_HANDOFF.md` before ending a session.

## 1. Install

```bash
npm install
npm run build
npm link
```

## 2. Choose the Video You Are Making

```bash
# Short explainer for TikTok, Reels or YouTube Shorts
video-pack init productions/my-video --type explainer

# LinkedIn point of view, vox pop or professional explainer
video-pack init productions/my-linkedin-video --type linkedin

# Narrated character/place-led story
video-pack init productions/my-story --type story
```

## 3. Replace One File

Replace the starter script:

```text
productions/my-video/input/script.txt
```

For the first run, the generated style, character and channel bibles are valid. Leave them alone until you have seen the route once.

Story projects also include `input/continuity.yml`. It starts with a usable world anchor and will be the first story-specific review checkpoint after scenes are prepared.

## 4. Let the Tool Lead

```bash
video-pack wizard --project productions/my-video
video-pack next --project productions/my-video
```

Run `next` again whenever it offers a safe next step. It refreshes `productions/my-video/output/BOARD.html` and `SESSION_HANDOFF.md`. If you edit the script or a bible later, run the same command: it detects the first stale dependent stage and rebuilds from there.

The first review is `output/00_analysis/route_review.html`. It changes its checks for Short Explainer, LinkedIn POV / Vox Pop and Narrated Visual Story, and becomes stale when you edit the script.

## 5. Understand the Asset Gate

The default layout preview uses no-cost placeholders. It checks the flow, framing and aspect ratio, not your final art direction.

When using an external image tool:

```bash
video-pack generate-images --project productions/my-video --provider external
```

Copy the prompts from `output/04_images/full/full_prompts.md`, create the real images, and save them with the expected filenames in `output/04_images/full/`.

Only then can you approve and package the finished edit pack:

```bash
video-pack approve-images --project productions/my-video
video-pack package --project productions/my-video
```

For a structural pack before images exist, use `video-pack package --project productions/my-video --draft`.

## 6. Try the Public Demo

```bash
npm run demo:mock
```

It uses mock images, so no API key or image credits are required.

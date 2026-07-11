# Quickstart

Use this for the shortest honest route from a script to a real edit pack.

## 1. Install

```bash
npm install
npm run build
npm link
```

## 2. Choose the Video You Are Making

```bash
# Narrated social or YouTube explainer
video-pack init my-video --type explainer

# LinkedIn point of view, vox pop or professional explainer
video-pack init my-linkedin-video --type linkedin

# Narrated character/place-led story
video-pack init my-story --type story
```

## 3. Replace One File

Replace the starter script:

```text
my-video/input/script.txt
```

For the first run, the generated style, character and channel bibles are valid. Leave them alone until you have seen the route once.

Story projects also include `input/continuity.yml`. It starts with a usable world anchor and will be the first story-specific review checkpoint after scenes are prepared.

## 4. Let the Tool Lead

```bash
video-pack wizard --project ./my-video
video-pack next --project ./my-video
```

Run `next` again whenever it offers a safe next step. It refreshes `my-video/output/BOARD.html`.

## 5. Understand the Asset Gate

The default layout preview uses no-cost placeholders. It checks the flow, framing and aspect ratio, not your final art direction.

When using an external image tool:

```bash
video-pack generate-images --project ./my-video --provider external
```

Copy the prompts from `output/04_images/full/full_prompts.md`, create the real images, and save them with the expected filenames in `output/04_images/full/`.

Only then can you approve and package the finished edit pack:

```bash
video-pack approve-images --project ./my-video
video-pack package --project ./my-video
```

For a structural pack before images exist, use `video-pack package --project ./my-video --draft`.

## 6. Try the Public Demo

```bash
npm run demo:mock
```

It uses mock images, so no API key or image credits are required.

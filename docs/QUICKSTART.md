# Quickstart

Use this when you want the shortest path from nothing to a visible production board.

## 1. Install the CLI

```bash
npm install
npm run build
npm link
```

## 2. Create a Project

```bash
video-pack init my-video
```

## 3. Replace the Script

Edit:

```text
my-video/input/script.txt
```

For the first pass, leave these files alone:

```text
my-video/input/style-bible.yml
my-video/input/characters.yml
my-video/input/channel-bible.yml
```

They are valid starter files. You can improve them after you have seen the workflow once.

## 4. Let the Wizard Lead

```bash
video-pack wizard --project ./my-video
video-pack next --project ./my-video
```

Run this again whenever you want the next safe step:

```bash
video-pack next --project ./my-video
```

`next` refreshes:

```text
my-video/output/BOARD.html
```

Open that board whenever you feel lost. It shows progress, the next command, provider route and scene asset status.

## 5. Stay No-Cost at First

The default project uses manual/mock-friendly settings. Paid API image generation only happens when a configured paid provider is reached and you explicitly pass:

```bash
--allow-paid
```

For a full local demo without API keys:

```bash
npm run demo:mock
```

## 6. Improve the Creative Direction

After the first pass, use [ChatGPT setup](CHATGPT_SETUP.md) to make stronger versions of:

```text
input/style-bible.yml
input/characters.yml
input/channel-bible.yml
```

Then continue with:

```bash
video-pack wizard --project ./my-video
video-pack next --project ./my-video
```

# macOS Setup

These notes are for macOS Terminal, usually `zsh`.

## Install Node

Install Node.js 20 or newer. Two common options:

```bash
brew install node
```

or, if you use `nvm`:

```bash
nvm install 20
nvm use 20
```

Check:

```bash
node --version
npm --version
```

## Build the CLI

From the repo root:

```bash
npm install
npm run build
```

Run locally without linking:

```bash
node dist/index.js --help
```

This is the safest command style on every platform.

## Optional: Link `video-pack`

If you want the shorter command:

```bash
npm link
video-pack --help
```

If global npm permissions complain, use `node dist/index.js ...` instead, or use Node through `nvm`.

## Environment File

Create `.env`:

```bash
cp .env.example .env
```

Open it in your editor and add only the keys you need:

```env
OPENAI_API_KEY=
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

Finder hides dotfiles by default. Press `Cmd` + `Shift` + `.` to show files like `.env`.

## Temporary Shell Keys

For a one-off Terminal session:

```bash
export OPENAI_API_KEY="sk-..."
export PEXELS_API_KEY="..."
export PIXABAY_API_KEY="..."
```

Values set with `export` only last for that terminal session.

## Run the Demo

```bash
npm run demo:mock
```

Pick it back up later:

```bash
npm run demo:status
```

## Common macOS Differences

- Use `cp .env.example .env`, not PowerShell `Copy-Item`.
- Use `/` paths, not Windows `\` paths.
- Quote paths with spaces:

```bash
node dist/index.js validate --project "./my video"
```

- If `video-pack` is not found after `npm link`, use `node dist/index.js` directly.

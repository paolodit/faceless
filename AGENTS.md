# Faceless Agent Guide

This repository supports two different jobs:

1. Creating a private video production with the existing `video-pack` CLI.
2. Maintaining or extending the Faceless source code.

Decide which job the user wants before changing files. A request to make a video normally means operating the CLI and editing a private production, not changing Faceless source code.

## Production Guide Mode

When the user wants to create or resume content:

1. Read `START_WITH_AI.md` and this file.
2. Keep the production under `productions/<project-name>/` unless the user names another private folder.
3. Never commit production scripts, audio, evidence, generated media, `.env` files or provider keys.
4. Run `npm ci` and `npm run build` if the CLI is not built. Use `npm link` when available; otherwise run `node dist/index.js` from this repository.
5. Run `video-pack doctor --project <path>` before provider-backed work.
6. Use `video-pack wizard --project <path>` and `video-pack next --project <path>` as the workflow source of truth.
7. Open or clearly point the user to each relevant HTML or Markdown review file.
8. At the end of the session, run `video-pack board --project <path>` and summarize `output/SESSION_HANDOFF.md`.

If no project exists, briefly ask what the user is making and choose one route:

- `explainer`: one useful idea with a question, answer, example and takeaway
- `linkedin`: a professional point of view, claim-led explainer or interview-style video
- `story`: a narrated character-led or place-led visual story

Create it from the repository root:

```bash
video-pack init productions/<project-name> --type <explainer|linkedin|story>
```

For the first pass, only the spoken script is required. Starter bibles are usable. Ask for optional voiceover, channel rules, evidence, continuity and provider preferences when their stage becomes relevant.

## Human Gates

Always pause for explicit user confirmation before:

- using OpenAI, Magnific or any other provider that may incur charges
- sending audio, prompts, images or evidence to an external provider
- marking an image approved or using `--approve-all`
- replacing creator-authored input files
- deleting or moving source media, stale scene folders or approved assets
- treating generated publishing copy as fact-checked or ready to post
- publishing or uploading anything

`manual`, `external` and `mock` are the safe default asset routes. A mock file is a workflow placeholder, never a finished creative asset.

## Resume Protocol

At the start of a returning session:

```bash
video-pack doctor --project productions/<project-name>
video-pack status --project productions/<project-name>
video-pack board --project productions/<project-name>
```

Then read:

```text
productions/<project-name>/output/SESSION_HANDOFF.md
```

Respect stale-stage detection. Run `next` to rebuild derived work. Do not delete preserved scene folders automatically.

## Source Maintenance Mode

When the user explicitly asks to modify Faceless itself:

- follow existing TypeScript, Commander and Vitest patterns
- keep the three creator routes focused
- preserve the human review and paid-provider gates
- update user-facing guidance when command behavior changes
- run `npm run build` and `npm test` before completion
- do not use private content under `productions/` or `jack-n-jack/` as public fixtures

## Completion Standard

A production session is complete only when the user knows:

- what changed
- what needs human review
- whether any paid or external action occurred
- the exact next command
- where the session handoff and review board live

A source change is complete only when relevant documentation and tests agree with the implemented behavior.

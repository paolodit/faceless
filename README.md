# video-pack

`video-pack` is a local CLI for turning a narrated script into an editable video production pack.

It helps solo creators and small teams move from script or voiceover to:

- transcript and estimated timestamps
- scene list
- image prompts
- preview prompt/image batches
- captions
- edit manifest
- run report
- next-step guidance

It does not publish to social platforms, render a final video, or hide the workflow in a black box. Every major output is a file you can review and edit.

## Quick Start

```bash
npm install
npm run build
node dist/index.js init dopamine-tax
node dist/index.js validate --project ./dopamine-tax
node dist/index.js analyze --project ./dopamine-tax
node dist/index.js plan --project ./dopamine-tax
node dist/index.js prepare --project ./dopamine-tax
node dist/index.js prompts --project ./dopamine-tax
node dist/index.js preview --project ./dopamine-tax --count 5
node dist/index.js generate-images --project ./dopamine-tax
node dist/index.js package --project ./dopamine-tax
```

After installing globally or linking locally, the command is:

```bash
video-pack init dopamine-tax
```

## Commands

```bash
video-pack init <project-name>
video-pack validate --project <path>
video-pack profiles
video-pack status --project <path>
video-pack analyze --project <path>
video-pack plan --project <path>
video-pack prepare --project <path>
video-pack prompts --project <path>
video-pack preview --project <path> --count <number>
video-pack generate-images --project <path>
video-pack package --project <path>
```

Common flags:

```bash
--force
--resume
--from-scene <number>
--provider <manual|mock|openai>
```

`manual` and `mock` are implemented for v1. `openai` is scaffolded as a future provider.

## Project Structure

```text
my-project/
  project.yml
  input/
    script.txt
    style-bible.yml
    characters.yml
    voice.example.txt
  output/
```

Generated packs use this structure:

```text
output/
  00_analysis/
  01_transcript/
  02_scenes/
  03_prompts/
  04_images/
  05_captions/
  06_edit_pack/
  07_publish/
  run_report.md
  cost_estimate.json
  README_NEXT_STEPS.md
```

## Provider Modes

- `manual`: writes prompts and filenames only.
- `mock`: creates placeholder PNGs for edit testing.
- `openai`: reserved for a future image generation adapter.

## Creator Workflow Helpers

- `analyze`: checks hook timing, platform fit, scene density and practical recommendations before production.
- `status`: shows which pipeline stages are complete and the next useful command.
- `profiles`: lists the built-in platform profiles and their pacing rules.

## Documentation

- [Inputs](docs/INPUTS.md)
- [Outputs](docs/OUTPUTS.md)
- [Workflow](docs/WORKFLOW.md)
- [Profiles](docs/PROFILES.md)
- [Providers](docs/PROVIDERS.md)

# Walkthrough Video Script

This is a ready-to-record 3-5 minute walkthrough for the GitHub README or repo page.

Recommended demo project:

```text
examples/tiktok-local-film-pitch
```

Do not add a fake video link to the README. Record the video manually, upload it where you want it to live, then add the real link later.

## Recording Setup

- Show the GitHub repository.
- Show the terminal at the repo root.
- Keep the file explorer or editor open beside the terminal.
- Use the mock provider so the demo spends no API credits.

## Script

Hi, this is `faceless video-pack`.

It is a local command-line workflow for turning a spoken script, a voiceover plan, and a visual style bible into an editable production pack for faceless video.

The important thing is that this is not trying to be a one-click publishing machine.

Creators still write, review, generate, edit and publish manually.

What this does is remove the repetitive production admin: scene timing, visual event planning, prompt packs, captions, edit manifests, approval sheets, timeline helpers, thumbnails and publishing checklists.

Start before the CLI.

Open ChatGPT, Claude or your usual writing tool and write the spoken script. If you need help, this repo includes `docs/CHATGPT_SETUP.md`, with copy-and-paste prompts for the script, style bible, characters and channel bible. Mac users can use `docs/MAC_SETUP.md` for Terminal setup differences.

Once the project exists, the main command is:

```bash
video-pack guide --project ./examples/tiktok-local-film-pitch
```

This tells you what is complete, what is missing, what to review, and the safest next command.

For this demo, I am using the TikTok local film pitch example.

The workflow is:

```bash
node dist/index.js validate --project ./examples/tiktok-local-film-pitch
node dist/index.js analyze --project ./examples/tiktok-local-film-pitch
node dist/index.js plan --project ./examples/tiktok-local-film-pitch
node dist/index.js prepare --project ./examples/tiktok-local-film-pitch
node dist/index.js visual-events --project ./examples/tiktok-local-film-pitch
node dist/index.js prompts --project ./examples/tiktok-local-film-pitch
node dist/index.js preview --project ./examples/tiktok-local-film-pitch --count 5 --provider mock
```

Now pause and show:

```text
output/02_scenes/scenes.md
output/02_scenes/visual_events.md
output/06_edit_pack/overlay_text.csv
output/06_edit_pack/stock_asset_queries.csv
output/03_prompts/prompts.md
output/04_images/preview/
```

The visual events file shows image holds, text overlays, transition notes and stock search ideas. The preview lets you check the visual direction before spending time or credits.

When the preview looks right, generate the full set. For a real external image workflow, use:

```bash
video-pack generate-images --project ./my-video --provider external
```

That creates prompt packs only. It does not call ChatGPT, Codex or any external image tool automatically.

You copy the prompts into the image tool you want to use, save each file with the expected filename, and place the images back into:

```text
output/04_images/full/
```

For this demo, use mock images:

```bash
node dist/index.js generate-images --project ./examples/tiktok-local-film-pitch --provider mock
node dist/index.js approve-images --project ./examples/tiktok-local-film-pitch
```

Now show:

```text
output/04_images/review_board.md
output/04_images/review_board.html
```

This is the handoff point for reviewing images. You can see the scene, transcript, visual goal, prompt, image preview, approval status, notes and the exact command to approve or request regeneration.

Finally package the edit pack:

```bash
node dist/index.js package --project ./examples/tiktok-local-film-pitch
```

Now show:

```text
output/05_captions/
output/06_edit_pack/
output/07_publish/
output/README_NEXT_STEPS.md
```

That gives you captions, edit manifests, visual event CSVs, overlay text rows, stock asset worksheets, timeline helpers, a CapCut assembly pack, copy, checklists and next steps for editing in CapCut, Premiere Pro, DaVinci Resolve or another editor.

That is the core idea: a guided, file-based production pack for creators who still want control.

## Screen Beats

1. GitHub README: show the project purpose.
2. Terminal: run `video-pack guide`.
3. Open `docs/CHATGPT_SETUP.md`.
4. Open `docs/MAC_SETUP.md` briefly if recording for mixed Mac/Windows users.
5. Open the TikTok example input files.
6. Run the safe mock workflow.
7. Open scenes, visual events and prompts.
8. Open the image review board.
9. Open the packaged edit pack.

## Closing CTA

Try the mock example first. No API key required.

```bash
npm install
npm run build
npm run demo:mock
```

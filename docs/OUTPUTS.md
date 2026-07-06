# Outputs

## Analysis

`output/00_analysis/content_analysis.md` checks hook timing, pacing, scene density and platform fit.

`output/00_analysis/content_analysis.json` contains the same data in structured form.

## Proposal

`output/00_proposal/proposal.md` explains the selected production pipeline, provider readiness, cost watch, risks and human checkpoints before asset-heavy work.

`output/00_proposal/proposal.json` contains the same proposal in structured form.

`output/decision_log.md` and `output/decision_log.json` record route choices and safety decisions made by `proposal` and `next`.

`output/BOARD.html` and `output/BOARD.md` summarize progress, the next command, provider route and scene asset status.

## Transcript

`output/01_transcript/transcript.txt` contains the script text used as the transcript.

`output/01_transcript/timestamps.json` contains estimated scene timings.

## Scenes

`output/02_scenes/scenes.json` is the structured scene list.

`output/02_scenes/scenes.md` is the human-editable review version.

`output/02_scenes/scene_production.json` contains the structured scene layout plan for each scene.

`output/02_scenes/scene_production.html` is the guided browser review board for layout mode, base frame, layering, expected assets and editor notes.

`output/02_scenes/scene_production.md` is the readable scene production review sheet. It shows layout mode, base frame, background, middle ground, foreground, camera, layering, continuity group and expected assets.

`output/02_scenes/visual_events.json` contains the structured visual event plan grouped by scene.

`output/02_scenes/visual_events.md` is the readable visual event review sheet for pacing, overlays, stock cutaways and transitions.

The scene pacing labels are:

- `burst`
- `steady`
- `additive`
- `landing`

## Prompts

`output/03_prompts/prompts.json` contains prompt objects with filenames and provider metadata.

`output/03_prompts/prompts.md` is a readable prompt pack for manual image tools.

`output/03_prompts/thumbnail_prompts.md` is a readable thumbnail prompt pack.

## Images

`output/04_images/preview/` contains preview prompts or placeholder images.

`output/04_images/full/` contains the full prompt pack or generated mock images.

`output/04_images/scenes/` contains one logical asset pack per scene:

```text
output/04_images/scenes/
  scene_001/
    prompt.md
    prompt.json
    scene_production.md
    scene_production.json
    manifest.json
    notes.md
    image.png
    approved.png
    variations/
    upscaled/
      upscaled.png
      request.md
      request.json
    video/
      clip.mp4
      request.md
      request.json
```

`image.png` is the stable scene source alias. `approved.png` appears when an approved asset is available. `upscaled/upscaled.png` appears after Magnific upscaling or manual placement. `video/clip.mp4` appears after scene video generation or manual placement.

`output/04_images/upscale_requests.md` and `.json` contain manual upscaling handoff requests.

`output/04_images/scene_video_requests.md` and `.json` contain manual or Higgsfield scene video handoff requests.

`output/04_images/magnific_upscale_report.json` and `output/04_images/scene_video_report.json` are written when API-backed Magnific runs complete.

`output/04_images/approvals.json`

`output/04_images/approval_sheet.md`

`output/04_images/review_board.md`

`output/04_images/review_board.html`

The review board shows scene number, transcript, visual goal, prompt, expected filename, image preview if present, approval status, notes and useful approve/regenerate commands.

## Captions

`output/05_captions/captions.srt`

`output/05_captions/captions.vtt`

## Edit Pack

`output/06_edit_pack/edit_manifest.csv`

`output/06_edit_pack/edit_manifest.json`

`output/06_edit_pack/visual_events.csv`

`output/06_edit_pack/visual_events.json`

`output/06_edit_pack/overlay_text.csv`

`output/06_edit_pack/stock_asset_queries.csv`

`output/06_edit_pack/stock_credits.md`

`output/06_edit_pack/asset_manifest.json`

`output/06_edit_pack/stock_assets/`

`output/06_edit_pack/storyboard.md`

`output/06_edit_pack/shot_list.md`

`output/06_edit_pack/asset_checklist.md`

`output/06_edit_pack/timelines/premiere_timeline.csv`

`output/06_edit_pack/timelines/davinci_timeline.csv`

`output/06_edit_pack/timelines/capcut_timeline.csv`

`output/06_edit_pack/timelines/timeline.fcpxml`

`output/06_edit_pack/capcut_assembly_guide.md`

The edit manifest maps scenes, timestamps, transcripts, visual goals and image filenames.

The visual event files plan image holds, additive on-screen text, transitions and optional stock asset searches.

`stock_assets/` contains automatic stock downloads only when you run `video-pack stock-assets` or set `stock_assets.enabled: true`.

The CapCut files are an assembly pack: import media, import SRT captions and use the CSV for scene order and durations. They are not an unofficial CapCut draft-file writer.

## Publishing

`output/07_publish/upload_checklist.md`

`output/07_publish/metadata_brief.md`

`output/07_publish/copy_pack.md`

`output/07_publish/thumbnails/`

Thumbnail review boards are created in:

```text
output/07_publish/thumbnails/review_board.md
output/07_publish/thumbnails/review_board.html
```

These files support manual platform upload and metadata review.

## Remotion

`output/08_remotion/`

`output/08_remotion/package.json`

`output/08_remotion/README.md`

`output/08_remotion/src/`

`output/08_remotion/public/assets/`

This is an optional browser-preview and MP4-render project generated from scenes, scene media, visual events, downloaded stock assets and voiceover audio when present.

Scene media priority is:

1. `output/04_images/scenes/scene_XXX/video/clip.mp4`
2. `output/04_images/scenes/scene_XXX/upscaled/upscaled.png`
3. `output/04_images/scenes/scene_XXX/approved.png`
4. `output/04_images/scenes/scene_XXX/image.png`
5. `output/04_images/full/<scene filename>`

From inside `output/08_remotion/`:

```bash
npm install
npm run dev
npm run render
```

The rendered MP4 is written to `output/08_remotion/render/video.mp4`.

## Reports

`output/cost_estimate.json` is created by `plan`.

`output/run_report.md`, `output/BOARD.html` and `output/README_NEXT_STEPS.md` are created or refreshed by `package`.

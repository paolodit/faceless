# Outputs

## Analysis

`output/00_analysis/content_analysis.md` checks hook timing, pacing, scene density and platform fit.

`output/00_analysis/content_analysis.json` contains the same data in structured form.

`output/00_analysis/route_review.html`, `.md` and `.json` provide the creator-type scorecard. They include quoted script evidence, five route-specific structural checks, a suggested beat map, rewrite priorities and human review questions. Its fingerprint covers the script, route, profile and character identities.

The guided commands also compare generated files with the inputs they depend on. A changed script cascades through analysis, cost, proposal, scenes, visual events, prompts, assets, approvals and package as needed. Style, character, channel, continuity, project and local-asset changes invalidate only the relevant downstream work. Old scene folders are preserved, reported and ignored rather than deleted automatically.

For LinkedIn POV / vox-pop projects, `output/00_analysis/claim_review.md` and `.json` map script claims to the cards in `input/evidence.yml`. They flag unmapped statements and incomplete source detail, but do not independently verify sources.

## Proposal

`output/00_proposal/proposal.md` explains the selected creator type, provider readiness, cost watch, risks and human checkpoints before asset-heavy work.

`output/00_proposal/proposal.json` contains the same proposal in structured form.

`output/decision_log.md` and `output/decision_log.json` record route choices and safety decisions made by `proposal` and `next`.

The stable production home is split into small, purpose-specific artifacts:

- `output/NEXT.html` - the one action or decision that matters now
- `output/DECISION.html` - the current human choice and its consequences
- `output/PROGRESS.html` - truthful deliverable readiness and stage progress
- `output/BOARD.html` and `.md` - detailed scene-level production status
- `output/ARTIFACTS.md` - index of the useful generated files

`output/SESSION_HANDOFF.md` is the agent-readable resume record. It lists completed and pending stages, current review files, paid-provider and approval gates, durable state, and the exact behind-the-scenes command. It is created by `init` and refreshed whenever the project board is written.

Generated HTML boards embed local image previews as data URIs. They do not depend on relative file access, which keeps review images visible across local and remote agent workspaces.

## Transcript

`output/01_transcript/transcript.txt` contains the script text used as the transcript.

`output/01_transcript/audio_info.json` records detected narration format and duration when final audio is configured.

`output/01_transcript/timestamps.json` contains audio-retimed scene timings when duration is available, otherwise clearly estimated script timings for draft work.

## Scenes

`output/02_scenes/scenes.json` is the structured scene list.

`output/02_scenes/scenes.md` is the human-editable review version.

For narrated visual-story projects, `output/02_scenes/continuity_review.html`, `.md` and `.json` check the declared story world, recurring character/place mappings and whether those anchors reached the prompt pack. This is a planning review, not pixel-level image inspection.

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

`output/04_images/preview/` contains preview prompts or no-cost layout placeholders. A mock preview checks framing and handoff flow; it does not prove the final art direction.

`output/04_images/full/` contains the full prompt pack and, once supplied, the real scene assets. A prompt pack alone is not treated as a finished image set.

Mock PNGs carry a `.faceless-mock.json` provenance marker. Copied scene aliases preserve it, and mock placeholders cannot satisfy production approval or editor-ready status.

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

Supporting raster events such as reaction shots, detail inserts and visual metaphors have their own durable asset folders:

```text
output/04_images/events/
  approvals.json
  review_board.md
  review_board.html
  requests.md
  requests.json
  scene_003_cutaway_02/
    prompt.md
    prompt.json
    manifest.json
    <expected-event-filename>.png
```

Normal packaging requires approved primary scene assets and approved supporting raster assets. Code-rendered overlays and transitions do not require raster files. Use `video-pack package --draft` only for a structure-first pack with explicitly reported gaps.

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

`stock_assets/` contains downloads created by an explicit `video-pack stock-assets` run. A configured preferred provider does not cause packaging to access the network.

The CapCut files are an assembly pack: import media, import SRT captions and use the CSV for scene order and durations. They are not an unofficial CapCut draft-file writer.

## Publishing

`output/07_publish/upload_checklist.md`

`output/07_publish/metadata_brief.md`

`output/07_publish/copy_pack.md`

`output/07_publish/thumbnails/`

The copy pack is shaped by creator type: Short Explainers get question-and-takeaway framing, LinkedIn POV projects get a claim-led written post, and visual stories get story-world and payoff framing. It remains a draft for the creator to edit and fact-check.

When a LinkedIn claim review exists, its unresolved publishing warnings appear inside the copy pack and upload checklist.

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

This is an optional browser-preview and MP4-render project generated from scenes, scene media, approved supporting visual-event assets, and configured voiceover audio. Draft packages may omit narration, but they remain assembly drafts rather than editor-ready packs.

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

`output/run_report.md`, all stable HTML boards, `output/SESSION_HANDOFF.md` and `output/README_NEXT_STEPS.md` are created or refreshed by `package`.

## Portable Export

`video-pack export-project --project <path>` creates:

```text
output/exports/<project>-handoff.zip
output/exports/EXPORT_README.md
```

The ZIP carries the production inputs, approved assets, boards and edit outputs. It excludes environment files, common credential/key files, Git data, dependencies, caches and previous exports. Audio referenced from outside the project is copied into `portable-assets/`. Review a private production archive before sharing it.

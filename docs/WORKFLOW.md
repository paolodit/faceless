# Workflow

`faceless video-pack` is a guided production system for three kinds of narrated video:

```text
Short Explainer
LinkedIn POV / vox pop
narrated visual story
```

It is not where the idea begins. Write the script in ChatGPT, Claude, a notes app or your normal writing process, then bring the final spoken version into the project.

## Create the Right Route

```bash
video-pack init my-video --type explainer
video-pack init my-linkedin-video --type linkedin
video-pack init my-story --type story
```

The starter input files are tailored to the route. Replace `input/script.txt` first. Add an optional `.mp3`, `.wav` or `.m4a` voiceover later and set `input.audio_file` in `project.yml`.

## Creator Loop

```bash
video-pack wizard --project ./my-project
video-pack next --project ./my-project
```

`wizard` explains the route. `next` runs the safe incomplete step and refreshes `output/BOARD.html`.

Every board refresh also writes `output/SESSION_HANDOFF.md`. It is the concise resume contract for a creator or coding agent: completed and pending stages, current review files, human gates and the exact next command.

Both are resume-aware. They compare each generated stage with its source inputs, so editing a script or bible takes the project back to the first affected stage. `next` refreshes that derived stage automatically; it does not require a separate `--force` flag. Existing creator files are preserved, and stale scene folders are reported instead of deleted.

The underlying order is:

```text
validate
-> analyze
-> route-specific script review
-> plan
-> proposal
-> prepare scenes
-> claim review (LinkedIn only)
-> continuity review (visual stories only)
-> visual-event plan
-> prompts
-> layout preview
-> real assets
-> approval
-> package
```

## What to Review

| Stage | Review file | Decision |
| --- | --- | --- |
| route review | `output/00_analysis/route_review.html` | Does this script fulfil the structural promise of the chosen creator type? |
| proposal | `output/00_proposal/proposal.md` | Is this the correct creator route and provider path? |
| scenes | `output/02_scenes/scenes.md` | Do the narration beats and visual goals make sense? |
| LinkedIn claims | `output/00_analysis/claim_review.md` | Does every factual-looking statement have a source, declared experience, internal data or editorial-opinion card? |
| story continuity | `output/02_scenes/continuity_review.html` | Do the world, character and place anchors cover each scene and carry into the prompt pack? |
| scene production | `output/02_scenes/scene_production.html` | Are layout, overlays, continuity and cutaways useful? |
| prompts | `output/03_prompts/prompts.md` | Is the visual language specific enough? |
| assets | `output/04_images/review_board.html` | Does every real scene image serve the narration? |
| package | `output/README_NEXT_STEPS.md` | Is the edit pack ready to assemble? |

## Preview Versus Real Assets

The automatic no-cost preview uses placeholders. It proves that the scene structure and review flow are working, but it does not evaluate art direction.

For real image review, choose one of these paths:

```bash
# External tool: creates a prompt pack, then you place files yourself
video-pack generate-images --project ./my-project --provider external

# Local placeholder images for testing only
video-pack generate-images --project ./my-project --provider mock

# Paid API providers
video-pack generate-images --project ./my-project --provider openai
video-pack generate-images --project ./my-project --provider magnific
```

External images must be saved in `output/04_images/full/` using the generated filename. `next`, the board and status will stop there until every scene has a real asset.

## Asset Approval and Packaging

```bash
video-pack approve-images --project ./my-project
video-pack package --project ./my-project
```

Normal packaging requires a real asset and approval for every scene. This is intentional: a prompt file is not an approved scene visual.

Use an explicit draft only when you want captions, scene structure and editor files before visual review is finished:

```bash
video-pack package --project ./my-project --draft
```

## LinkedIn POV / Vox Pop

The LinkedIn route defaults to a 4:5 profile and uses three visual ideas:

- a recurring presenter or human-scale anchor
- clear claim or term overlays added in the editor
- supporting b-roll or carefully reviewed stock cutaways

Use the `linkedin-ai-jargon-series-ep1` example when you need a starting point for quote cards, simple term reveals and post copy.

After `prepare`, fill or refine `input/evidence.yml`, then run:

```bash
video-pack claims --project ./my-linkedin-video
```

`next`, `wizard`, `status` and the board treat this as a required LinkedIn checkpoint. The review maps claim cards to scenes and copies unresolved warnings into the publishing pack; it does not automatically fact-check links or sources.

## Narrated Visual Story

The story route keeps recurring character and location anchors in `characters.yml`, then creates a segment continuity plan. It also starts with `input/continuity.yml`: a small, editable declaration of the shared world, visual constants, and scene mappings for recurring characters and places.

After `prepare`, run:

```bash
video-pack continuity --project ./my-story
```

`next`, `wizard`, `status` and the board treat this as the story checkpoint before visual-event planning. Prompt generation refreshes the review automatically, so it can flag a world or character anchor that did not reach the prompt pack. It checks the plan, not the generated pixels; review the image board before approval. It is cheaper to correct a continuity problem while assets are still images.

## Short Explainer

The Short Explainer route is designed for one useful idea in roughly 20-60 seconds. Its route review looks for a plain-language premise, an explicit answer, a concrete visual example, progressive explanation and a final takeaway. The public pop-economics example is configured as a 9:16 YouTube Short.

## Advanced Lanes

Stock, upscaling, scene clips and Remotion are optional:

```bash
video-pack stock-assets --project ./my-project --provider pexels --limit 5
video-pack upscale-images --project ./my-project --provider magnific
video-pack generate-scene-videos --project ./my-project --provider magnific --duration 5
video-pack remotion --project ./my-project --force
```

Use `higgsfield` only as a handoff pack at present. It writes per-scene requests for an external MCP/CLI workflow rather than claiming a direct API integration.

## Edit Assembly

The edit pack contains captions, manifests, overlays, thumbnails, post-copy drafts and timeline helpers. CapCut, Premiere and DaVinci CSVs are assembly guides. The FCPXML file is the native interchange helper. See [Outputs](OUTPUTS.md) for every generated path.

## When You Are Lost

```bash
video-pack wizard --project ./my-project
video-pack next --project ./my-project
video-pack board --project ./my-project
video-pack status --project ./my-project
video-pack doctor --project ./my-project
```

Use `wizard` and `next` day to day. `board` is the browser view. `status` is a detailed diagnostic. `doctor` checks setup without exposing API keys.

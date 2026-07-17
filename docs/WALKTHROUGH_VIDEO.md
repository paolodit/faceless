# Agent-First Walkthrough Video

This is a ready-to-record 3-5 minute GitHub walkthrough. Record the real video later and add its URL only when it exists.

Recommended demo: `examples/bees-pollination-explainer`. It came from a real ChatGPT Work trial and now acts as the acceptance case for the agent-guided workflow.

## Recording Beats

1. Open the README and copy its one-sentence start prompt.
2. Paste it into Codex, ChatGPT Work, Claude Code, or Claude Co-work.
3. Give the agent either an idea or a script. Show it inferring Short Explainer without presenting a route menu.
4. Open `output/NEXT.html`, then `output/DECISION.html`. Explain that the creator sees one useful decision, not the command sequence.
5. After the route proposal, add `input/voice.mp3` and show Faceless detecting it without YAML setup.
6. Show the route review and the agent's three script-specific art directions. Choose the recommended direction.
7. Show three representative style frames before a full batch is generated.
8. Open the self-contained primary image review board. Point out that the images are embedded and remain visible in a remote agent workspace.
9. Open the supplemental visual-event review board. Distinguish base scenes, cutaways, code-rendered overlays, and transitions.
10. Open `output/PROGRESS.html`. Point out narration, editor-pack, and MP4 states separately.
11. Show the Remotion or editor handoff, then create the sanitized portable ZIP for a hosted workspace.
12. Return later with the one-sentence resume prompt and show `output/SESSION_HANDOFF.md` restoring context.

## Spoken Script

This is Faceless, an agent-guided production system for three kinds of narrated video: Short Explainers, LinkedIn point-of-view or vox-pop videos, and Narrated Visual Stories.

You do not need to learn a CLI first. Paste one sentence into a capable coding agent: "I want to create a video with this GitHub repository. Install it and guide me from my idea or script to a reviewed production."

The agent installs the local production engine, keeps your production private, infers the best route, and guides one decision at a time. The script gets you to a proposal; then the agent asks for final narration before it times scenes. A conventional `input/voice.mp3` is detected automatically.

This bee and pollination explainer is the acceptance demo. Its first real production trial taught us something useful: thirteen primary frames can exist while thirteen planned supporting cutaways are still missing. Faceless now tracks those as separate asset classes instead of calling the package complete.

At any point, `NEXT.html` answers one question: what matters now? `DECISION.html` carries the current human choice. `PROGRESS.html` reports the real deliverable state. The detailed board is there when you need to inspect every scene.

Before image generation, the agent reviews the script and proposes three script-specific art directions. Once you choose one, it creates three representative style frames: the hook, the middle mechanism, and the payoff. That keeps a weak direction from becoming an expensive full batch.

Primary scenes and supporting raster cutaways each have an approval board. Image previews are embedded directly in the HTML, so they stay visible even when a hosted agent cannot serve neighbouring files. Text overlays and transitions are tracked too, but they can remain code-rendered rather than becoming unnecessary images.

External providers, generation credits, transcription, and every approval remain human gates. Mock images are labelled as layout placeholders. An editor pack is not called a rendered video, and the progress board says clearly whether narration and an MP4 exist.

The output can be assembled in CapCut, Premiere, DaVinci Resolve, FCPXML, or Remotion. In a remote workspace, the agent creates one sanitized ZIP rather than handing you a folder link that may not download.

When you come back later, tell the agent to continue the production. The session handoff and stable boards restore the state without depending on chat memory.

The CLI is still there as a dependable engine. The product surface is the conversation, the decisions, and the artifacts.

## Behind-the-Scenes Demo Run

These commands are for the person preparing the recording, not the creator-facing walkthrough:

```bash
npm ci
npm run build
npm run demo:mock
node dist/index.js export-project --project ./examples/bees-pollination-explainer --force
```

The mock run demonstrates state transitions and board layout. Replace mock assets with reviewed real imagery before presenting it as finished creative work.

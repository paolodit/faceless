# Start with an AI Agent

Paste this single sentence into Codex, ChatGPT Work, Claude Code, Claude Co-work, or another coding agent with repository and terminal access:

> I want to create a video with https://github.com/paolodit/faceless - install it and guide me from my idea or script to a reviewed production.

That is the whole setup prompt. You do not need to understand the commands or prepare YAML first.

## What Happens Next

The agent should read `AGENTS.md`, infer the best of the three creator routes, keep the production private under `productions/`, and ask only for information needed at the current stage. The script can reach a reviewed route proposal first; the agent then asks for final narration before it creates timed scenes. When a decision is required, it should show one relevant artifact and make a recommendation.

The three routes are:

- **Short Explainer** - one useful or surprising idea made clear quickly
- **LinkedIn Point-of-View / Vox Pop** - a professional claim, opinion, explainer, or interview-style piece
- **Narrated Visual Story** - a character-led, place-led, or illustrated narrative

## The Agent-Facing Artifacts

Every production gets a small set of stable, self-contained files:

- `output/NEXT.html` - one recommended action now
- `output/DECISION.html` - the current human checkpoint
- `output/PROGRESS.html` - honest visual, audio, editor-pack, and render coverage
- `output/BOARD.html` - the complete scene-level production home
- `output/SESSION_HANDOFF.md` - durable state for a returning agent

Image previews are embedded directly in HTML, so they remain visible when a power-agent surface cannot serve neighbouring local files.

## Return Later

Open the same repository or workspace and say:

> Continue my Faceless production in `productions/<project-name>`, read its session handoff, and guide me from the first unfinished or stale decision.

## Remote Workspaces

ChatGPT Work and Claude Co-work may run in an isolated workspace that is separate from your desktop. The agent should say where the production lives and, at a handoff point, create one portable archive with:

```bash
video-pack export-project --project productions/<project-name> --force
```

The archive excludes environment files, common credential/key files, Git metadata, dependencies, caches, and older exports. Review a private production archive before sharing it.

## Direct Operation

The conversational agent is the recommended surface. The local `video-pack` command remains available as the production engine for automation, debugging, and creators who prefer a terminal. See [docs/QUICKSTART.md](docs/QUICKSTART.md) and [docs/WORKFLOW.md](docs/WORKFLOW.md).

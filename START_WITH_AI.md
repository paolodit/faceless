# Start Faceless with an AI Coding Agent

The easiest way to use Faceless is through Codex, Claude Code or another coding agent that can read files and run terminal commands.

The agent is the conversational guide. The `video-pack` CLI remains the production engine and the generated files remain the durable project state.

## Recommended Setup

1. Open this repository as a local project in your coding agent.
2. Start a new task and paste the prompt below.
3. Give the agent your idea, draft script or finished script.
4. Review the files it shows you at each human checkpoint.
5. Return to the same folder and ask it to continue whenever you are ready.

Local operation is recommended when working with private scripts, voice recordings, large image sets or desktop editors. An ordinary chat without terminal and file access can help write a script, but it cannot install or operate the production workflow.

## Copy This Prompt

```text
I want to create a new Faceless video production.

Use https://github.com/paolodit/faceless as the production tool. If it is not
already open locally, clone it and work from the repository root. Read AGENTS.md
before doing any production work. Install and build the CLI if needed, then run
its setup checks.

Keep my production under productions/<a-private-project-name>. Do not commit my
script, audio, evidence, images, generated output, .env file or provider keys.

Ask which format best fits my idea:
- Short Explainer
- LinkedIn Point-of-View / Vox Pop
- Narrated Visual Story

Ask only for the script, audio and creative information needed at the current
stage. Use video-pack wizard and video-pack next as the source of truth.

Show me each relevant review board and pause when I need to make a creative
decision. Never use a paid provider, send files to an external provider, approve
assets, replace my authored inputs or publish anything without my explicit
confirmation.

Do not change the Faceless source code unless a genuine defect blocks this
production. At the end of every session, refresh the project board and tell me
the exact next command from output/SESSION_HANDOFF.md.
```

Replace `<a-private-project-name>` with a short folder name such as `pricing-explainer` or `founder-ai-pov`.

## What the Agent Should Do

For a new production, the agent should:

```bash
npm ci
npm run build
npm link
video-pack doctor
video-pack init productions/my-video --type explainer
video-pack wizard --project productions/my-video
```

After the script is ready, it should use:

```bash
video-pack next --project productions/my-video
```

At the end of a work session, it should refresh:

```bash
video-pack board --project productions/my-video
```

Then it should read and summarize:

```text
productions/my-video/output/SESSION_HANDOFF.md
```

## Returning Later

Open the same repository and say:

```text
Continue my production in productions/my-video. Read AGENTS.md and the project's
output/SESSION_HANDOFF.md, run doctor and status, then guide me from the first
incomplete or stale stage. Preserve my inputs and stop at all human gates.
```

## Direct CLI Route

The agent-assisted path is recommended for creators, but it is optional. Every production can still be operated directly from the terminal using the complete guide in `README.md`.

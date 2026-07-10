import { listProductionPipelines } from "../lib/pipelines.js";

export function pipelinesCommand(options: { json?: boolean } = {}): string {
  const pipelines = listProductionPipelines();

  if (options.json) {
    return JSON.stringify(pipelines, null, 2);
  }

  return `Creator types

Choose a creator type for the kind of video you are making. Keep profile for output format.

${pipelines
  .map(
    (pipeline) => `${pipeline.name}
  ${pipeline.summary}
  Best for: ${pipeline.bestFor.join(", ")}
  Asset bias: ${pipeline.assetBias}`
  )
  .join("\n\n")}

Use in project.yml:
pipeline: "narrated-explainer"

New projects:
video-pack init my-video --type explainer
video-pack init my-video --type linkedin
video-pack init my-video --type story`;
}

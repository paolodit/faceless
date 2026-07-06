import { listProductionPipelines } from "../lib/pipelines.js";

export function pipelinesCommand(options: { json?: boolean } = {}): string {
  const pipelines = listProductionPipelines();

  if (options.json) {
    return JSON.stringify(pipelines, null, 2);
  }

  return `Production pipelines

Choose a pipeline for production intent. Keep profile for output format.

${pipelines
  .map(
    (pipeline) => `${pipeline.name}
  ${pipeline.summary}
  Best for: ${pipeline.bestFor.join(", ")}
  Asset bias: ${pipeline.assetBias}`
  )
  .join("\n\n")}

Use in project.yml:
pipeline: "faceless-explainer"`;
}

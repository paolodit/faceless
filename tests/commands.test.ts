import { describe, expect, it } from "vitest";
import { pipelinesCommand } from "../src/commands/pipelines.js";
import { profilesCommand } from "../src/commands/profiles.js";

describe("commands", () => {
  it("prints profile guidance", () => {
    expect(profilesCommand()).toContain("youtube-shorts");
  });

  it("prints profile JSON", () => {
    expect(JSON.parse(profilesCommand({ json: true }))[0]).toHaveProperty("name");
  });

  it("prints production pipeline guidance", () => {
    expect(pipelinesCommand()).toContain("faceless-explainer");
  });

  it("prints pipeline JSON", () => {
    expect(JSON.parse(pipelinesCommand({ json: true }))[0]).toHaveProperty("assetBias");
  });
});

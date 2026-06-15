import { describe, expect, it } from "vitest";
import { profilesCommand } from "../src/commands/profiles.js";

describe("commands", () => {
  it("prints profile guidance", () => {
    expect(profilesCommand()).toContain("youtube-shorts");
  });

  it("prints profile JSON", () => {
    expect(JSON.parse(profilesCommand({ json: true }))[0]).toHaveProperty("name");
  });
});

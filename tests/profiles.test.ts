import { describe, expect, it } from "vitest";
import { getProfile, suggestProfileName } from "../src/lib/profiles.js";

describe("profiles", () => {
  it("loads the TikTok profile", () => {
    expect(getProfile("tiktok")?.aspectRatio).toBe("9:16");
  });

  it("suggests close profile names", () => {
    expect(suggestProfileName("youtube-short")).toBe("youtube-shorts");
  });
});

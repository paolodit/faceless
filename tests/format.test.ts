import { describe, expect, it } from "vitest";
import { countWords, sceneTimeToSrtTime, secondsToSceneTime } from "../src/lib/format.js";

describe("format helpers", () => {
  it("counts words", () => {
    expect(countWords("One two, three.")).toBe(3);
  });

  it("formats scene timestamps", () => {
    expect(secondsToSceneTime(64.5)).toBe("01:04.500");
  });

  it("formats SRT timestamps", () => {
    expect(sceneTimeToSrtTime("01:04.500")).toBe("00:01:04,500");
  });
});

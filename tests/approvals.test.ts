import { describe, expect, it } from "vitest";
import { approvalsMarkdown, updateApproval } from "../src/lib/approvals.js";
import type { ImageApproval } from "../src/lib/schemas.js";

const approvals: ImageApproval[] = [
  {
    scene_number: 1,
    image_filename: "scene_001.png",
    status: "pending",
    notes: "",
    updated_at: "2026-01-01T00:00:00.000Z"
  }
];

describe("image approvals", () => {
  it("updates scene approval status", () => {
    const updated = updateApproval(approvals, { scene: 1, status: "approved", notes: "good" });
    expect(updated[0].status).toBe("approved");
    expect(updated[0].notes).toBe("good");
  });

  it("renders approval sheet markdown", () => {
    expect(approvalsMarkdown(approvals)).toContain("Image Approval Sheet");
  });
});

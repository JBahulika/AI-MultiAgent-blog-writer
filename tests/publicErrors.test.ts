import { describe, it, expect } from "vitest";
import { toPublicErrorMessage } from "@/lib/publicErrors";

describe("toPublicErrorMessage", () => {
  it("hides OpenAI billing / credit errors", () => {
    const msg = toPublicErrorMessage(
      new Error(
        "429 You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/"
      )
    );
    expect(msg.toLowerCase()).not.toContain("openai");
    expect(msg.toLowerCase()).not.toContain("credits");
    expect(msg.toLowerCase()).not.toContain("billing");
    expect(msg).toMatch(/unavailable|quota|try again/i);
  });

  it("keeps safe PRD validation messages", () => {
    expect(toPublicErrorMessage("PRD is too short. Please provide at least 20 characters.")).toContain(
      "too short"
    );
  });

  it("falls back to a generic message", () => {
    expect(toPublicErrorMessage(new Error("ECONNREFUSED 127.0.0.1"))).toMatch(/try again/i);
  });
});

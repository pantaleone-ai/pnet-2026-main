import { describe, expect, it } from "vitest";

import { chatPayloadSchema } from "./chat";

/**
 * Guards the public chat API contract: validation must reject abuse-shaped
 * input before anything touches retrieval, embeddings, or models.
 */
describe("chatPayloadSchema", () => {
  it("accepts a valid message with history", () => {
    const result = chatPayloadSchema.safeParse({
      message: "What services do you offer?",
      history: [{ role: "user", content: "hi" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty and oversized messages", () => {
    expect(chatPayloadSchema.safeParse({ message: "x" }).success).toBe(false);
    expect(
      chatPayloadSchema.safeParse({ message: "a".repeat(2001) }).success,
    ).toBe(false);
    expect(chatPayloadSchema.safeParse({}).success).toBe(false);
  });

  it("caps history length", () => {
    const history = Array.from({ length: 11 }, () => ({
      role: "user" as const,
      content: "hi there",
    }));
    expect(
      chatPayloadSchema.safeParse({ message: "hello world", history }).success,
    ).toBe(false);
  });
});

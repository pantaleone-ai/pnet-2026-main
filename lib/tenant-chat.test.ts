import { describe, expect, it } from "vitest";

import {
  buildTenantSystemPrompt,
  SSE_DONE,
  sseEncode,
} from "./tenant-chat";

describe("buildTenantSystemPrompt", () => {
  it("grounds the model in business content only", () => {
    const prompt = buildTenantSystemPrompt({
      botName: "Acme Helper",
      tone: null,
      instructions: null,
    });
    expect(prompt).toContain("Acme Helper");
    expect(prompt).toContain("ONLY");
    expect(prompt).not.toContain("undefined");
  });

  it("appends tone and truncates overlong instructions", () => {
    const prompt = buildTenantSystemPrompt({
      botName: "Acme Helper",
      tone: "friendly",
      instructions: `  ${"x".repeat(5000)}  `,
    });
    expect(prompt).toContain("Tone: friendly");
    expect(prompt.length).toBeLessThan(3000);
  });
});

describe("sseEncode", () => {
  it("frames payloads as SSE data lines", () => {
    expect(new TextDecoder().decode(sseEncode({ delta: "hi" }))).toBe(
      'data: {"delta":"hi"}\n\n',
    );
    expect(SSE_DONE).toBe("data: [DONE]\n\n");
  });
});

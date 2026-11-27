import { describe, expect, it } from "vitest";

import {
  ALLOWED_UPLOAD_TYPES,
  chunkText,
  extractHrefs,
  extractReadableText,
  isCrawlableCandidate,
  normalizeLink,
  uploadTypeFor,
} from "./text";

describe("chunkText", () => {
  it("returns [] for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("keeps short text in one chunk", () => {
    expect(chunkText("Hello world. Short page.")).toEqual([
      "Hello world. Short page.",
    ]);
  });

  it("splits long text deterministically with overlap", () => {
    const sentences = Array.from(
      { length: 120 },
      (_, i) => `Sentence number ${i} carries unique filler words for length. `,
    );
    const long = sentences.join("");
    const a = chunkText(long);
    const b = chunkText(long);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(1);
    expect(a.every((c) => c.length <= 1500)).toBe(true);
    // Overlap: the tail of one chunk reappears at the head of the next.
    const first = a[0];
    const second = a[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    const tailWords = first.split(/\s+/).slice(-5).join(" ");
    expect(second.includes(tailWords)).toBe(true);
  });
});

describe("extractReadableText", () => {
  it("drops nav/header/footer/script and keeps article text", () => {
    const html = `<html><head><style>.x{}</style></head><body>
      <nav>Home About Contact</nav>
      <header>Site banner</header>
      <main><h1>Return policy</h1><p>Sale items are final sale.</p></main>
      <footer>Copyright 2026</footer>
      <script>track()</script></body></html>`;
    const text = extractReadableText(html);
    expect(text).toContain("Return policy");
    expect(text).toContain("Sale items are final sale.");
    expect(text).not.toContain("Home About Contact");
    expect(text).not.toContain("Copyright");
    expect(text).not.toContain("track()");
  });

  it("decodes common entities", () => {
    expect(extractReadableText("<p>Fish &amp; Chips &nbsp; here</p>")).toBe(
      "Fish & Chips here",
    );
  });
});

describe("crawl scoping", () => {
  const entry = new URL("https://acme.com/docs/");

  it("accepts same-origin http(s) pages", () => {
    expect(
      isCrawlableCandidate(new URL("https://acme.com/pricing"), entry, []),
    ).toBe(true);
  });

  it("rejects off-origin, assets, credentials, and excluded paths", () => {
    expect(
      isCrawlableCandidate(new URL("https://evil.com/x"), entry, []),
    ).toBe(false);
    expect(
      isCrawlableCandidate(new URL("https://acme.com/logo.png"), entry, []),
    ).toBe(false);
    expect(
      isCrawlableCandidate(
        new URL("https://user:pass@acme.com/x"),
        entry,
        [],
      ),
    ).toBe(false);
    expect(
      isCrawlableCandidate(new URL("https://acme.com/admin/x"), entry, [
        "/admin",
      ]),
    ).toBe(false);
  });

  it("normalizes relative links, drops fragments and schemes", () => {
    expect(normalizeLink("/pricing", entry)?.href).toBe(
      "https://acme.com/pricing",
    );
    expect(normalizeLink("#top", entry)).toBe(null);
    expect(normalizeLink("mailto:a@b.com", entry)).toBe(null);
    expect(normalizeLink("javascript:void(0)", entry)).toBe(null);
  });

  it("extracts hrefs from anchors", () => {
    expect(
      extractHrefs(`<a href="/a">x</a><a href='https://b.com'>y</a>`),
    ).toEqual(["/a", "https://b.com"]);
  });
});

describe("uploadTypeFor", () => {
  it("accepts the four MVP types, rejects the rest", () => {
    expect(uploadTypeFor("menu.pdf", "application/pdf")).toBe("pdf");
    expect(uploadTypeFor("notes.md", "text/markdown")).toBe("md");
    expect(uploadTypeFor("data.csv", "text/csv")).toBe("csv");
    expect(uploadTypeFor("readme.txt", "text/plain")).toBe("txt");
    expect(uploadTypeFor("deck.docx", "application/octet-stream")).toBe(null);
    expect(uploadTypeFor("run.exe", "application/octet-stream")).toBe(null);
  });

  it("tolerates generic MIME but rejects mismatches", () => {
    expect(uploadTypeFor("a.pdf", "application/octet-stream")).toBe("pdf");
    expect(uploadTypeFor("a.pdf", "image/png")).toBe(null);
  });

  it("knows exactly four types (DOCX deferred by plan)", () => {
    expect(ALLOWED_UPLOAD_TYPES).toEqual(["pdf", "txt", "md", "csv"]);
  });
});

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SourceType = "website" | "sitemap" | "faq" | "file";

/**
 * Add-source forms. Website/sitemap/FAQ post JSON; files post multipart.
 * The API links every source to this chatbot and enqueues ingestion.
 */
export default function AddSourceForm({ chatbotId }: { chatbotId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<SourceType>("website");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [excluded, setExcluded] = useState("");
  const [pairs, setPairs] = useState([{ question: "", answer: "" }]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submitJson(body: unknown) {
    const res = await fetch(`/api/chatbots/${chatbotId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || "Could not add the source.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (tab === "file") {
        if (!file) throw new Error("Choose a file first.");
        const form = new FormData();
        form.set("type", "file");
        if (name.trim()) form.set("name", name.trim());
        form.set("file", file);
        const res = await fetch(`/api/chatbots/${chatbotId}/sources`, {
          method: "POST",
          body: form,
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        setFile(null);
      } else if (tab === "faq") {
        const clean = pairs
          .map((p) => ({ question: p.question.trim(), answer: p.answer.trim() }))
          .filter((p) => p.question && p.answer);
        if (clean.length === 0) throw new Error("Add at least one question and answer.");
        await submitJson({ type: "faq", name: name.trim() || undefined, pairs: clean });
        setPairs([{ question: "", answer: "" }]);
      } else {
        if (!url.trim()) throw new Error("Enter a URL.");
        const excludedPaths = excluded
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean);
        await submitJson({
          type: tab,
          url: url.trim(),
          name: name.trim() || undefined,
          excludedPaths,
        });
        setUrl("");
      }
      setName("");
      setExcluded("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const tabs: { id: SourceType; label: string }[] = [
    { id: "website", label: "Website" },
    { id: "sitemap", label: "Sitemap" },
    { id: "faq", label: "FAQs" },
    { id: "file", label: "File" },
  ];

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-lg font-medium mb-3">Add a source</h2>
      <div className="flex gap-2 mb-4" role="tablist" aria-label="Source type">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source-name">Name (optional)</Label>
          <Input
            id="source-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tab === "faq" ? "Shop FAQs" : "Help center"}
            maxLength={120}
          />
        </div>
        {(tab === "website" || tab === "sitemap") && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source-url">
                {tab === "website" ? "Website URL" : "Sitemap URL"}
              </Label>
              <Input
                id="source-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                inputMode="url"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source-excluded">Excluded paths (one per line, optional)</Label>
              <Input
                id="source-excluded"
                value={excluded}
                onChange={(e) => setExcluded(e.target.value)}
                placeholder="/admin"
              />
              <p className="text-xs text-muted-foreground">
                Pages under these paths are never crawled. Comma or newline separated.
              </p>
            </div>
          </>
        )}
        {tab === "faq" && (
          <div className="flex flex-col gap-3">
            {pairs.map((p, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border p-3">
                <Label htmlFor={`faq-q-${i}`}>Question {i + 1}</Label>
                <Input
                  id={`faq-q-${i}`}
                  value={p.question}
                  onChange={(e) => {
                    const next = [...pairs];
                    const cur = next[i];
                    if (cur) cur.question = e.target.value;
                    setPairs(next);
                  }}
                  placeholder="Do you ship internationally?"
                />
                <Label htmlFor={`faq-a-${i}`}>Answer {i + 1}</Label>
                <Input
                  id={`faq-a-${i}`}
                  value={p.answer}
                  onChange={(e) => {
                    const next = [...pairs];
                    const cur = next[i];
                    if (cur) cur.answer = e.target.value;
                    setPairs(next);
                  }}
                  placeholder="Yes, worldwide in 5–10 days."
                />
                {pairs.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPairs(pairs.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {pairs.length < 200 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPairs([...pairs, { question: "", answer: "" }])}
              >
                Add another
              </Button>
            )}
          </div>
        )}
        {tab === "file" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source-file">File (PDF, TXT, MD, CSV — max 10 MB)</Label>
            <Input
              id="source-file"
              type="file"
              accept=".pdf,.txt,.md,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add source"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SourceView {
  id: string;
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  pageCount: number;
  error: string | null;
  excludedPathsJson: string;
  contentJson: string | null;
  lastIndexedAt: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  processing: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  failed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
};

/**
 * One knowledge source: status, page count, errors, page exclusions,
 * refresh (re-ingest), and delete. Mutations hit the tenant-scoped API
 * and refresh the page.
 */
export default function SourceCard({ source }: { source: SourceView }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"refresh" | "delete" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFaqs, setShowFaqs] = useState(false);
  const [editingExcluded, setEditingExcluded] = useState(false);
  const [excluded, setExcluded] = useState(() => {
    try {
      const arr = JSON.parse(source.excludedPathsJson ?? "[]") as unknown;
      return Array.isArray(arr) ? (arr as string[]).join("\n") : "";
    } catch {
      return "";
    }
  });

  async function callApi(path: string, init?: RequestInit) {
    const res = await fetch(path, init);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || "Request failed.");
  }

  async function refresh() {
    setBusy("refresh");
    setError(null);
    try {
      await callApi(`/api/sources/${source.id}/refresh`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      await callApi(`/api/sources/${source.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setBusy(null);
    }
  }

  async function saveExcluded() {
    setBusy("save");
    setError(null);
    try {
      const excludedPaths = excluded
        .split(/[\n,]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      await callApi(`/api/sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludedPaths }),
      });
      // Exclusions only matter on crawl — re-queue immediately.
      await callApi(`/api/sources/${source.id}/refresh`, { method: "POST" });
      setEditingExcluded(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  const faqPairs = (() => {
    if (source.sourceType !== "faq" || !source.contentJson) return [];
    try {
      const arr = JSON.parse(source.contentJson) as { question?: string; answer?: string }[];
      return Array.isArray(arr) ? arr.filter((p) => p.question && p.answer) : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{source.name}</p>
          <p className="text-xs text-muted-foreground">
            {source.sourceType}
            {source.sourceUrl ? ` · ${source.sourceUrl}` : ""}
            {source.pageCount > 0 ? ` · ${source.pageCount} page${source.pageCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[source.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {source.status}
        </span>
      </div>

      {source.status === "failed" && source.error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {source.error}
        </p>
      )}
      {source.status === "pending" && (
        <p className="mt-2 text-sm text-muted-foreground">
          Queued for indexing — usually ready in a few minutes.
        </p>
      )}
      {source.status === "processing" && (
        <p className="mt-2 text-sm text-muted-foreground">
          Indexing now — this page updates automatically. Refresh in a minute or two.
        </p>
      )}

      {faqPairs.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowFaqs((v) => !v)}
            className="text-sm underline underline-offset-4"
            aria-expanded={showFaqs}
          >
            {showFaqs ? "Hide" : "Show"} {faqPairs.length} Q&amp;A
            {faqPairs.length === 1 ? "" : "s"}
          </button>
          {showFaqs && (
            <ul className="mt-2 flex flex-col gap-2">
              {faqPairs.map((p, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{p.question}</span>
                  <br />
                  <span className="text-muted-foreground">{p.answer}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(source.sourceType === "website" || source.sourceType === "sitemap") && (
        <div className="mt-2">
          {editingExcluded ? (
            <div className="flex flex-col gap-2">
              <label htmlFor={`excluded-${source.id}`} className="text-sm font-medium">
                Excluded paths (one per line)
              </label>
              <Input
                id={`excluded-${source.id}`}
                value={excluded}
                onChange={(e) => setExcluded(e.target.value)}
                placeholder="/admin"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveExcluded} disabled={busy === "save"}>
                  {busy === "save" ? "Saving…" : "Save and refresh"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingExcluded(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Saving re-queues the source, so exclusions apply on the next crawl.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingExcluded(true)}
              className="text-sm underline underline-offset-4"
            >
              Edit excluded paths
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={busy !== null || source.status === "processing"}
        >
          {busy === "refresh" ? "Refreshing…" : "Refresh"}
        </Button>
        {confirmDelete ? (
          <>
            <Button size="sm" variant="destructive" onClick={remove} disabled={busy !== null}>
              {busy === "delete" ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

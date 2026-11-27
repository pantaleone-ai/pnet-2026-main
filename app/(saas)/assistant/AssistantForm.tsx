"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface AssistantChatbot {
  id: string;
  name: string;
  description: string | null;
  status: string;
  publicId: string;
  welcomeMessage: string | null;
  leadCaptureMode: string;
  appearance: { theme?: string; launcherPosition?: string };
}

export interface AssistantSettings {
  tone: string | null;
  systemInstructions: string | null;
  suggestedQuestions: string[];
  fallbackMessage: string | null;
  topK: number | null;
}

export interface AssistantSource {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  linked: boolean;
}

/**
 * Assistant configuration form. Identity + behavior save through the
 * tenant APIs; knowledge selection links/unlinks per source; publish
 * requires a ready source (enforced server-side, 409 otherwise).
 */
export default function AssistantForm({
  chatbot,
  settings,
  sources,
}: {
  chatbot: AssistantChatbot;
  settings: AssistantSettings;
  sources: AssistantSource[];
}) {
  const router = useRouter();
  const [name, setName] = useState(chatbot.name);
  const [description, setDescription] = useState(chatbot.description ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(chatbot.welcomeMessage ?? "");
  const [leadCaptureMode, setLeadCaptureMode] = useState(chatbot.leadCaptureMode);
  const [theme, setTheme] = useState(chatbot.appearance.theme ?? "auto");
  const [launcherPosition, setLauncherPosition] = useState(
    chatbot.appearance.launcherPosition ?? "right",
  );
  const [tone, setTone] = useState(settings.tone ?? "");
  const [instructions, setInstructions] = useState(settings.systemInstructions ?? "");
  const [suggested, setSuggested] = useState(settings.suggestedQuestions.join("\n"));
  const [fallbackMessage, setFallbackMessage] = useState(settings.fallbackMessage ?? "");
  const [linked, setLinked] = useState<Record<string, boolean>>(
    Object.fromEntries(sources.map((s) => [s.id, s.linked])),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function call(path: string, init?: RequestInit) {
    const res = await fetch(path, init);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || "Request failed.");
  }

  async function saveAll() {
    setError(null);
    setNotice(null);
    setPending("save");
    try {
      const suggestedQuestions = suggested
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 6);
      await call(`/api/chatbots/${chatbot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          welcomeMessage: welcomeMessage.trim() || null,
          leadCaptureMode,
          appearance: { theme, launcherPosition },
        }),
      });
      await call(`/api/chatbots/${chatbot.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: tone.trim() || null,
          systemInstructions: instructions.trim() || null,
          suggestedQuestions,
          fallbackMessage: fallbackMessage.trim() || undefined,
        }),
      });
      // Knowledge selection diff.
      for (const s of sources) {
        const want = linked[s.id] ?? s.linked;
        if (want === s.linked) continue;
        if (want) {
          await call(`/api/chatbots/${chatbot.id}/sources/${s.id}`, { method: "POST" });
        } else {
          await call(`/api/chatbots/${chatbot.id}/sources/${s.id}`, { method: "DELETE" });
        }
      }
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setPending(null);
    }
  }

  async function setPublish(publish: boolean) {
    setError(null);
    setNotice(null);
    setPending("publish");
    try {
      await call(`/api/chatbots/${chatbot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: publish ? "published" : "draft" }),
      });
      setNotice(publish ? "Published. Your assistant is live." : "Unpublished. Visitors see nothing until you republish.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change status.");
    } finally {
      setPending(null);
    }
  }

  const isPublished = chatbot.status === "published";

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      )}

      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="text-lg font-medium">Identity</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-name">Name</Label>
          <Input id="asst-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-desc">Description (internal note)</Label>
          <Input id="asst-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Answers questions for the bakery site" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-welcome">Welcome message</Label>
          <Input id="asst-welcome" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} maxLength={500} placeholder="Hi! Ask me anything about our menu." />
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="text-lg font-medium">Behavior</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-tone">Tone</Label>
          <Input id="asst-tone" value={tone} onChange={(e) => setTone(e.target.value)} maxLength={300} placeholder="friendly and concise" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-instructions">Business instructions</Label>
          <Textarea id="asst-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={2000} rows={3} placeholder="Always mention holiday hours in December." />
          <p className="text-xs text-muted-foreground">Appended to the system prompt. Keep it short and factual.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-suggested">Suggested questions (one per line, up to 6)</Label>
          <Textarea id="asst-suggested" value={suggested} onChange={(e) => setSuggested(e.target.value)} rows={3} placeholder={"What are your hours?\nDo you ship?"} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-fallback">Fallback message</Label>
          <Input id="asst-fallback" value={fallbackMessage} onChange={(e) => setFallbackMessage(e.target.value)} maxLength={500} placeholder="Leave blank for the default." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-lead">Lead capture</Label>
          <select
            id="asst-lead"
            value={leadCaptureMode}
            onChange={(e) => setLeadCaptureMode(e.target.value)}
            className="border-input bg-background ring-offset-background flex h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="contact">Contact mode — ask when it looks like buying intent</option>
            <option value="always">Always — offer contact details in every conversation</option>
            <option value="off">Off — never ask</option>
          </select>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="text-lg font-medium">Appearance</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-theme">Theme</Label>
          <select id="asst-theme" value={theme} onChange={(e) => setTheme(e.target.value)} className="border-input bg-background ring-offset-background flex h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <option value="auto">Auto (follow the site)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asst-pos">Launcher position</Label>
          <select id="asst-pos" value={launcherPosition} onChange={(e) => setLauncherPosition(e.target.value)} className="border-input bg-background ring-offset-background flex h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <option value="right">Bottom right</option>
            <option value="left">Bottom left</option>
          </select>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
        <h2 className="text-lg font-medium">Knowledge</h2>
        <p className="text-sm text-muted-foreground">Only selected sources feed this assistant.</p>
        {sources.length === 0 && (
          <p className="text-sm text-muted-foreground">No sources yet. Add some on the knowledge page first.</p>
        )}
        {sources.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={linked[s.id] ?? s.linked}
              onChange={(e) => setLinked({ ...linked, [s.id]: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="font-medium">{s.name}</span>
            <span className="text-muted-foreground">· {s.sourceType} · {s.status}</span>
          </label>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={saveAll} disabled={pending !== null || !name.trim()}>
          {pending === "save" ? "Saving…" : "Save changes"}
        </Button>
        {isPublished ? (
          <Button variant="outline" onClick={() => setPublish(false)} disabled={pending !== null}>
            {pending === "publish" ? "Working…" : "Unpublish"}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setPublish(true)} disabled={pending !== null}>
            {pending === "publish" ? "Working…" : "Publish"}
          </Button>
        )}
      </div>

      {isPublished && (
        <p className="text-sm text-muted-foreground">
          Publish to update the live version. Unpublish to take it offline.
        </p>
      )}
    </div>
  );
}

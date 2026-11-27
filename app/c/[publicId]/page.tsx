import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound } from "next/navigation";

import { getDb } from "@/lib/db";
import { resolvePublicChatbot } from "@/lib/tenant-chat";
import TenantChat from "@/features/chat/TenantChat";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Hosted public chat page. Standalone branded surface + embed target
 * (`?embed=1` strips site chrome for the iframe). Unpublished bots 404.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);
  const resolved = await resolvePublicChatbot(db, publicId).catch(() => null);
  if (!resolved) return { title: "Not found" };
  return {
    title: `${resolved.bot.name} | Pantaleone Chat`,
    description: `Chat with ${resolved.bot.name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function HostedChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams?: Promise<{ embed?: string }>;
}) {
  const { publicId } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);
  const resolved = await resolvePublicChatbot(db, publicId).catch(() => null);
  if (!resolved) notFound();

  const embed = (await searchParams)?.embed === "1";

  const body = (
    <main className={embed ? "p-3" : "mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10"}>
      {!embed && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{resolved.bot.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answers from the business&apos;s own pages, with sources.
          </p>
        </div>
      )}
      <TenantChat
        publicId={publicId}
        config={{
          name: resolved.bot.name,
          welcomeMessage: resolved.welcomeMessage,
          suggestedQuestions: resolved.suggestedQuestions,
        }}
      />
      {!embed && (
        <p className="text-xs text-muted-foreground">
          Powered by Pantaleone Chat
        </p>
      )}
    </main>
  );

  if (embed) return body;
  return (
    <div className="mx-auto flex min-h-screen w-full flex-col">
      <div className="mx-auto w-full max-w-2xl px-4 pt-6">
        <a href="https://www.pantaleone.net" className="text-sm text-muted-foreground hover:underline">
          ← pantaleone.net
        </a>
      </div>
      {body}
    </div>
  );
}

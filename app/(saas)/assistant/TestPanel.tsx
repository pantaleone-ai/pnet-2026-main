"use client";

import TenantChat from "@/features/chat/TenantChat";

/**
 * Owner test drive: same UI as visitors get, but against the authed
 * preview endpoint — works on drafts, never persists, never meters.
 */
export default function TestPanel({
  chatbotId,
  botName,
}: {
  chatbotId: string;
  botName: string;
}) {
  return (
    <section className="rounded-lg border border-border p-4 flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-medium">Test</h2>
        <p className="text-sm text-muted-foreground">
          Try your assistant against its current knowledge. Tests are not
          saved and do not count toward usage.
        </p>
      </div>
      <TenantChat
        publicId={chatbotId}
        endpoint={`/api/chatbots/${chatbotId}/preview`}
        compact
        config={{ name: botName, welcomeMessage: null, suggestedQuestions: [] }}
      />
    </section>
  );
}

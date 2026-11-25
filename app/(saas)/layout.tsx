import Link from "next/link";

/**
 * Minimal SaaS shell. Deliberately separate from the marketing site chrome:
 * the app has its own navigation, workspace context, and dashboard.
 */
export default function SaasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-10">
      <Link href="https://www.pantaleone.net" className="mb-8 text-sm text-muted-foreground hover:underline">
        ← pantaleone.net
      </Link>
      <main id="saas-content">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-session";

/**
 * Protected SaaS area. Unauthenticated visitors are sent to /login —
 * authorization for everything under /dashboard happens here, once,
 * server-side.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}

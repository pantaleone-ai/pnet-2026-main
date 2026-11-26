import { redirect } from "next/navigation";

/**
 * Email links point at {baseURL}/reset-password/{token} (path param).
 * Bounce through the better-auth callback endpoint, which validates the
 * token and redirects to /reset-password?token=… (or ?error=…).
 */
export default async function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(
    `/api/auth/reset-password/${encodeURIComponent(token)}?callbackURL=${encodeURIComponent("/reset-password")}`,
  );
}

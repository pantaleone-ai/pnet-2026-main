import { getIdentifier, rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const NO_STORE = { "Cache-Control": "no-store" } as const;

const MAX_BODY_BYTES = 64 * 1024;

// Module-level buckets (per-process). Reads and writes are isolated so a
// polling monitor can never starve mutations, and vice versa.
const readLimiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});
const writeLimiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function checkRate(
  request: Request,
  limit: number,
  kind: "read" | "write" = "read",
): Promise<NextResponse | null> {
  try {
    await (kind === "read" ? readLimiter : writeLimiter).check(
      limit,
      `${getIdentifier(request)}:campaign:${kind}`,
    );
    return null;
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: NO_STORE },
    );
  }
}

export function bodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  if (bodyTooLarge(request)) throw new Error("Payload too large.");
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function methodNotAllowed(methods: string): NextResponse {
  return NextResponse.json(
    { error: `Method not allowed. Use ${methods}.` },
    { status: 405, headers: NO_STORE },
  );
}

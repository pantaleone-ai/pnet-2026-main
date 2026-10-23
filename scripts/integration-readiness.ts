// Integration readiness (Phase 6): presence-only diagnostics.
// Never prints secret values — only whether each credential is set and, for
// Meta, whether the token authenticates (GET /me). No publishing, no writes.
// Run: npx tsx scripts/integration-readiness.ts
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { CHANNELS } from "./social-issues/publish/channels";
import { SOCIAL_PROJECTS } from "@/config/social-growth/projects";

function present(name: string): boolean {
  return Boolean(process.env[name]);
}

async function metaAuth(): Promise<string> {
  const token = process.env.META_CAPI_ACCESS_TOKEN ?? "";
  if (!token) return "missing";
  try {
    const res = await fetch(
      `https://graph.facebook.com/v26.0/me?access_token=${token}`,
      { signal: AbortSignal.timeout(20000) },
    );
    if (!res.ok) return "invalid";
    const data = (await res.json()) as { name?: string };
    return `ok (${data.name ?? "unknown"})`;
  } catch {
    return "unreachable";
  }
}

async function main(): Promise<void> {
  console.log("== channels ==");
  for (const c of CHANNELS) {
    const missing = c.requiredEnvs.filter((k) => !present(k));
    const state = !c.implemented
      ? "not-implemented"
      : missing.length > 0
        ? `blocked (missing ${missing.join(",")})`
        : "credentialed";
    console.log(`${c.id}: ${state} autoPost=${c.autoPost}`);
  }
  console.log(`\nmeta token: ${await metaAuth()}`);
  console.log("\n== campaign adapters ==");
  for (const [k, v] of [
    [
      "WEBSITE_API_BASE/TOKEN",
      present("WEBSITE_API_BASE") && present("WEBSITE_API_TOKEN"),
    ],
    [
      "LINKEDIN_ACCESS_TOKEN+PERSON_URN",
      present("LINKEDIN_ACCESS_TOKEN") && present("LINKEDIN_PERSON_URN"),
    ],
    [
      "EMAIL_PROVIDER_API_KEY/FROM",
      present("EMAIL_PROVIDER_API_KEY") && present("EMAIL_FROM"),
    ],
  ] as Array<[string, boolean]>) {
    console.log(`${k}: ${v ? "set" : "missing"}`);
  }
  console.log("\n== projects ==");
  console.log(
    `PROJECTS_TOKEN: ${present("PROJECTS_TOKEN") ? "set" : "missing (boards will skip, queue unaffected)"}`,
  );
  for (const [app, p] of Object.entries(SOCIAL_PROJECTS)) {
    console.log(
      `${app}: project ${p.number} secret ${p.secret} ${present(p.secret) ? "set" : "missing"}`,
    );
  }
  console.log("\n== notes ==");
  console.log("- Reddit is manual-only by policy regardless of credentials.");
  console.log(
    "- Env presence is not validity: expired OAuth still reports blocked at publish time.",
  );
}

const isMain = (process.argv[1] ?? "").endsWith("integration-readiness.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}

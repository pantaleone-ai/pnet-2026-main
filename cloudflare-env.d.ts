// Minimal Cloudflare environment declarations for this project.
//
// NOTE: do NOT replace this file with `wrangler types` output. The generated
// file redeclares global fetch types (Body.json<T>()) which changes
// Response.json() from Promise<any> to Promise<unknown> repo-wide and breaks
// type checking in unrelated files. Declare only the bindings consumed here;
// extend explicitly if more are ever needed.

interface CloudflareAI {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

interface CloudflareEnv {
  AI?: CloudflareAI;
}

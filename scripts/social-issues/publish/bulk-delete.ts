/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- operational helper, style unchanged */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const GRAPH = "https://graph.facebook.com/v26.0";
function delFast(token: string, path: string): any {
  const out = execFileSync(
    "curl",
    [
      "-sS",
      "-m",
      "20",
      "-X",
      "DELETE",
      `${GRAPH}/${path}`,
      "--data-urlencode",
      `access_token=${token}`,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(out);
}
function getFast(
  token: string,
  path: string,
  params: Record<string, string> = {},
): any {
  const args = [
    "-sS",
    "-m",
    "20",
    "-G",
    `${GRAPH}/${path}`,
    "--data-urlencode",
    `access_token=${token}`,
  ];
  for (const [k, v] of Object.entries(params))
    args.push("--data-urlencode", `${k}=${v}`);
  return JSON.parse(execFileSync("curl", args, { encoding: "utf8" }) as string);
}
async function main() {
  const sysTok =
    fs
      .readFileSync(".env.local", "utf8")
      .split("META_CAPI_ACCESS_TOKEN=")[1]
      ?.split(/\s/)[0]
      ?.trim() ?? "";
  if (!sysTok) throw new Error("missing META_CAPI_ACCESS_TOKEN in .env.local");
  const cutoff = new Date("2025-10-20T00:00:00Z");
  const mode = process.argv[2];
  const limit = parseInt(process.argv[3] || "10", 10);
  const offset = parseInt(process.argv[4] || "0", 10);
  if (mode === "--delete-ig") {
    const ig = JSON.parse(fs.readFileSync("/tmp/pnet-ig-all.json", "utf8"));
    const old = ig.filter((p: any) => new Date(p.timestamp) < cutoff);
    const batch = old.slice(offset, offset + limit);
    console.log(
      `IG batch off=${offset} n=${batch.length} totalOld=${old.length}`,
    );
    let ok = 0,
      fail = 0,
      limited = false;
    for (const p of batch) {
      try {
        const r = delFast(sysTok, p.id);
        if ((r as any).success === true) {
          ok++;
          fs.appendFileSync("/tmp/pnet-delete-ig2.log", `${p.id} OK\n`);
          console.log(`${p.id} OK`);
        } else {
          const msg = JSON.stringify(r);
          if (
            msg.includes("maximum number of deletions") ||
            msg.includes("too many actions")
          ) {
            limited = true;
            fail++;
            fs.appendFileSync(
              "/tmp/pnet-delete-ig2.log",
              `${p.id} LIMITED ${msg.slice(0, 150)}\n`,
            );
            console.log(`${p.id} LIMITED`);
            break;
          }
          fail++;
          fs.appendFileSync(
            "/tmp/pnet-delete-ig2.log",
            `${p.id} FAIL ${msg.slice(0, 200)}\n`,
          );
          console.log(`${p.id} FAIL`);
        }
      } catch (e: any) {
        fail++;
        console.log(`${p.id} ERR`);
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    console.log(JSON.stringify({ ok, fail, limited }));
  } else if (mode === "--delete-fb") {
    const pt = (
      getFast(sysTok, "101092449202509", { fields: "access_token" }) as any
    ).access_token as string;
    const fb = JSON.parse(fs.readFileSync("/tmp/pnet-fb-all.json", "utf8"));
    const old = fb.filter((p: any) => new Date(p.created_time) < cutoff);
    const batch = old.slice(offset, offset + limit);
    console.log(
      `FB batch off=${offset} n=${batch.length} totalOld=${old.length}`,
    );
    let ok = 0,
      fail = 0,
      notApp = 0;
    for (const p of batch) {
      try {
        const r = delFast(pt, p.id);
        if ((r as any).success === true) {
          ok++;
          fs.appendFileSync("/tmp/pnet-delete-fb2.log", `${p.id} OK\n`);
          console.log(`${p.id} OK`);
        } else {
          const msg = JSON.stringify(r);
          if (msg.includes("wasn't created by the application")) notApp++;
          fail++;
          fs.appendFileSync(
            "/tmp/pnet-delete-fb2.log",
            `${p.id} FAIL ${msg.slice(0, 180)}\n`,
          );
          console.log(`${p.id} FAIL`);
        }
      } catch (e: any) {
        fail++;
        console.log(`${p.id} ERR`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log(JSON.stringify({ ok, fail, notApp }));
  }
}
main();

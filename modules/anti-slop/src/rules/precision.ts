/**
 * High-precision detection rules (Lead Linter expansion, 10 rules).
 *
 * Text rules run on the PROTECTED analyzed text (code fences, quotes, URLs,
 * frontmatter already vaulted → those exemptions are automatic). The code
 * rule runs on the RAW original input because fenced code is vaulted away
 * before text analysis.
 *
 * All findings are soft (suggestion-only, never auto-fixed, never in the
 * default hardGates). The single high-severity rule (code-placeholder) still
 * passes standard builds; only fake-specificity/chatbot fail CI.
 */

import type { Finding, ScanOptions } from "../types.js";

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Date.now().toString(36)}`;

function excerpt(text: string, index: number, radius = 48): string {
  const s = Math.max(0, index - radius);
  const e = Math.min(text.length, index + radius);
  return (s > 0 ? "…" : "") + text.slice(s, e).replace(/\s+/g, " ") + (e < text.length ? "…" : "");
}

function allowed(opts: ScanOptions, pattern: string): boolean {
  return (opts.projectProfile?.allowlist ?? []).some((a) => a.toLowerCase() === pattern.toLowerCase());
}

/* ------------------------------------------------------------------ */
/* 1. conclusion-cliche — L2 rhetorical, medium 0.85                    */
/* ------------------------------------------------------------------ */

const CONCLUSION_PHRASES = [
  "in conclusion",
  "ultimately",
  "in summary",
  "as we look to the future",
  "at the end of the day",
  "to sum up",
  "all in all",
];

const conclusionRe = new RegExp(
  `(^|\\n)\\s*(${CONCLUSION_PHRASES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

function checkConclusionCliche(text: string): Finding[] {
  const out: Finding[] = [];
  if (text.length < 100) return out;
  // Final ## or ### section body.
  const heads = [...text.matchAll(/^#{2,3}\s+.+$/gm)];
  const finalStart = heads.length > 0 ? (heads[heads.length - 1].index ?? 0) : 0;
  const finalBody = text.slice(finalStart);
  const firstTen = finalBody
    .replace(/^#{2,3}\s*.+\n?/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
    .join(" ")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const inFinalOpening = CONCLUSION_PHRASES.some((p) => firstTen.startsWith(p));
  if (inFinalOpening) {
    const m = /^\s*#{2,3}\s*.+\n?\s*(.{1,80})/m.exec(finalBody);
    out.push({
      id: nid("prec"), category: "rhetorical", severity: "medium",
      location: excerpt(text, finalStart),
      pattern: "conclusion-cliche",
      explanation: `Concluding phrase "${(m?.[1] ?? firstTen).trim().slice(0, 60)}" introduces unnecessary narrative wrap-up fluff.`,
      suggested_action: "Delete the transition phrase and state the concluding assertion directly.",
      confidence: 0.85, layer: 2, offset: finalStart,
    });
    return out;
  }
  // …or within the last 15% of the document (paragraph openings).
  const tailStart = Math.floor(text.length * 0.85);
  conclusionRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = conclusionRe.exec(text)) !== null) {
    if ((m.index ?? 0) < tailStart) continue;
    out.push({
      id: nid("prec"), category: "rhetorical", severity: "medium",
      location: excerpt(text, m.index ?? tailStart),
      pattern: "conclusion-cliche",
      explanation: `Concluding phrase "${m[2].trim().slice(0, 60)}" introduces unnecessary narrative wrap-up fluff.`,
      suggested_action: "Delete the transition phrase and state the concluding assertion directly.",
      confidence: 0.85, layer: 2, offset: m.index ?? tailStart,
    });
    if (out.length >= 2) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 2. manufactured-gravity — L2 rhetorical, medium 0.80                  */
/* NOTE: prompt regex contained `keep\\tag` (literal tab match); fixed   */
/* to `keep\\s+in\\s+mind`. "that" made optional (superset).             */
/* ------------------------------------------------------------------ */

const GRAVITY_RE = /\bit\s+is\s+(important|crucial|essential|worth\s+noting|vital|key)\s+to\s+(note|understand|remember|keep\s+in\s+mind)(\s+that)?\b/gi;

function checkManufacturedGravity(text: string): Finding[] {
  const out: Finding[] = [];
  GRAVITY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = GRAVITY_RE.exec(text)) !== null) {
    out.push({
      id: nid("prec"), category: "rhetorical", severity: "medium",
      location: excerpt(text, m.index),
      pattern: "manufactured-gravity",
      explanation: `Phrasing "${m[0].trim().slice(0, 60)}" inflates tone without adding substance.`,
      suggested_action: "Remove the introductory clause and state the fact directly.",
      confidence: 0.8, layer: 2, offset: m.index,
    });
    if (out.length >= 5) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 3. symmetrical-section-pacing — L3 style, low 0.75                    */
/* ------------------------------------------------------------------ */

function checkSectionPacing(text: string): Finding[] {
  const parts = text.split(/(?=^##\s+)/m).filter((s) => /^##\s+/.test(s));
  if (parts.length < 3) return [];
  const counts = parts.map((s) => s.replace(/^##\s*.+\n?/, "").split(/\s+/).filter(Boolean).length);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 600) return [];
  const mean = total / counts.length;
  const sd = Math.sqrt(counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length);
  const cv = mean ? sd / mean : 1;
  if (cv >= 0.15) return [];
  return [{
    id: nid("prec"), category: "style", severity: "low",
    location: `${parts.length} ## sections, ~${Math.round(mean)} words each (CV ${cv.toFixed(2)})`,
    pattern: "symmetrical-section-pacing",
    explanation: `Document sections display repetitive structural length (~${Math.round(mean)} words per section).`,
    suggested_action: "Vary section depth: expand core technical insights and consolidate brief background sections.",
    confidence: 0.75, layer: 3,
  }];
}

/* ------------------------------------------------------------------ */
/* 4. passive-voice-density — L3 style, low 0.70                         */
/* ------------------------------------------------------------------ */

const IRREGULAR_PARTICIPLES = new Set(
  "written,built,taken,given,known,shown,found,thought,brought,bought,caught,taught,chosen,broken,spoken,driven,risen,fallen,forgotten,hidden,bound,wound,done,gone,laid,paid,said,heard,held,kept,left,lost,made,met,sold,sent,spent,stood,sunk,swung,drawn,grown,thrown,blown,flown".split(","),
);

// Standard technical passives that carry meaning — never counted.
const TECH_PASSIVE_EXEMPT = new Set(
  "based,used,compiled,deployed,rendered,generated,parsed,serialized,encrypted,authenticated,configured,installed,executed,returned,cached,hosted,served,tested,released,documented,licensed,designed,optimized,implemented,supported,required,expected".split(","),
);

const PASSIVE_RE = /\b(is|are|was|were|been|be|being)\s+([a-z]+)\b/gi;

function checkPassive(text: string): Finding[] {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 80) return []; // short inputs spike rates; need a real sample
  let count = 0;
  PASSIVE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PASSIVE_RE.exec(text)) !== null) {
    const w = m[2].toLowerCase();
    if (TECH_PASSIVE_EXEMPT.has(w)) continue;
    if (w.length > 3 && (w.endsWith("ed") || w.endsWith("en") || IRREGULAR_PARTICIPLES.has(w))) count++;
  }
  const per200 = (count / Math.max(1, words)) * 200;
  if (per200 <= 4) return [];
  return [{
    id: nid("prec"), category: "style", severity: "low",
    location: `${count} passive constructions in ~${words} words`,
    pattern: "passive-voice-density",
    explanation: `Passive construction density (${per200.toFixed(1)} per 200 words) exceeds style threshold.`,
    suggested_action: "Convert passive verbs to active subject-verb-object structures.",
    confidence: 0.7, layer: 3,
  }];
}

/* ------------------------------------------------------------------ */
/* 5. unanchored-demonstrative-opening — L4 content, medium 0.85         */
/* ------------------------------------------------------------------ */

const DEMO_VERBS = new Set(
  "allow,allows,enable,enables,demonstrate,demonstrates,show,shows,mean,means,provide,provides,ensure,ensures,require,requires,support,supports,illustrate,illustrates,explain,explains,highlight,highlights,reveal,reveals,confirm,confirms,suggest,suggests,indicate,indicates,prove,proves,improve,improves,reduce,reduces,increase,increases,let,lets,make,makes,create,creates,define,defines,describe,describes,cover,covers,handle,handles,manage,manages,contain,contains,include,includes,offer,offers,deliver,delivers,drive,drives,power,powers,unlock,unlocks,simplify,simplifies".split(","),
);

function checkDemonstrative(text: string): Finding[] {
  const out: Finding[] = [];
  const headRe = /^#{2,3}\s*(.+)$/gm;
  let h: RegExpExecArray | null;
  while ((h = headRe.exec(text)) !== null) {
    const after = text.slice((h.index ?? 0) + h[0].length);
    const body = after.replace(/^\s+/, "");
    if (!body || body.startsWith("#") || body.startsWith("```") || body.startsWith("|") || body.startsWith(">") || body.startsWith("-") || body.startsWith("*") || body.startsWith("1")) continue;
    const first = body.split(/(?<=[.!?])\s+/)[0]?.slice(0, 160) ?? "";
    const m = /^(This|These)\s+([A-Za-z']+)/.exec(first.trim());
    if (m && DEMO_VERBS.has(m[2].toLowerCase())) {
      out.push({
        id: nid("prec"), category: "content", severity: "medium",
        location: excerpt(text, h.index ?? 0),
        pattern: "unanchored-demonstrative-opening",
        explanation: `Opening sentence uses unanchored demonstrative "${first.trim().slice(0, 60)}" at section start.`,
        suggested_action: `Explicitly state the noun object (e.g., replace "${m[1]} ${m[2]}" with "This architecture ${m[2].toLowerCase()}").`,
        confidence: 0.85, layer: 4, offset: h.index ?? 0,
      });
      if (out.length >= 4) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 6. fluff-to-substance-ratio — L4 content, medium 0.80                 */
/* ------------------------------------------------------------------ */

const BUNDLED_TECH = "api,mcp,rag,llm,gpt,agent,agents,workflow,workflows,orchestration,pipeline,typescript,javascript,python,react,nextjs,nodejs,postgres,postgresql,redis,docker,kubernetes,graphql,rest,oauth,jwt,sdk,cli,webhook,websocket,vector,embedding,embeddings,latency,throughput,cache,caching,auth,tls,dns,tcp,http,https,json,yaml,markdown,mdx,github,vercel,stripe,n8n,gpu,cpu,inference,prompt,prompts,token,tokens,checkpoint,deployment,staging,replica,shard,index,schema,migration,backup,observability,telemetry,trace,metric,alert,incident,sla,encryption,firewall,vpn,vpc,subnet,loadbalancer,autoscaling,serverless,container,microservice,monorepo,endpoint,rate,quota,pagination,filter,sort,index,query,cache,session,cookie,cors,csp,sso,saml,oidc,ldap,rbac,abac,policy,audit,compliance,gdpr,soc2,iso,pci,kms,secrets,vault,ssh,gpg,ci,cicd,cd,git,branch,merge,pr,review,lint,test,tests,e2e,unit,integration,staging,canary,bluegreen,rollback,feature,flag,flags,experiment,analytics,funnel,cohort,retention,churn,mrr,arr,ltv,cac,seo,a11y,i18n,l10n,ssr,ssg,isr,csr,spa,pwa,wasm,cdn,edge,origin,prefetch,preload,lazy,suspense,hydration,virtualdom,fiber,reconciler,hook,hooks,store,state,reducer,action,dispatch,selector,middleware,interceptor,guard,pipe,operator,observable,subject,stream,topic,queue,partition,offset,consumer,producer,broker,deadletter,retry,backoff,circuit,breaker,bulkhead,timeout,idempotency,saga,twopc,outbox,inbox,cqrs,eventsourcing,ddd,hexagonal,clean,onion,layered,mvc,mvvm,repository,dao,orm,dto,vo,entity,aggregate,value,invariant,ubiquitous,domain,subdomain,context,bounded,acl,corruption,translation,facade,adapter,proxy,decorator,observer,factory,singleton,builder,strategy,command,state,memento,visitor,template,chain,mediator,interpreter,iterator,composite,flyweight,bridge,abstract,interface,class,struct,enum,trait,mixin,generic,generics,lifetime,borrow,ownership,move,copy,clone,async,await,promise,future,thread,process,goroutine,actor,channel,mutex,semaphore,lock,atomic,volatile,barrier,latch,countdown,fork,join,spawn,exec,syscall,signal,handler,trap,fault,panic,exception,error,result,option,either,try,monad,functor,curry,partial,closure,lambda,anonymous,callback,hoc,render,props,slots,teleport,fragment,portal,shadow,custom,element,webcomponent,lifecycle,mount,unmount,update,diff,patch,key,ref,forward,portal,context,provider,consumer,theme,token,design,figma,storybook,chromatic,percy,axe,pa11y,lighthouse,webvitals,lcp,inp,cls,fcp,tti,ttfb,speed,tti,bundle,treeshake,minify,uglify,terser,esbuild,rollup,webpack,vite,turbopack,swc,babel,postcss,sass,less,css,tailwind,bootstrap,chakra,mui,radix,shadcn,framer,motion,gsap,three,d3,canvas,svg,webgl,shader,texture,mesh,scene,camera,light,material,geometry,raycast,raster,vector".split(",");

const STOP = new Set(
  "the,and,for,are,but,not,you,all,can,had,her,was,one,our,out,has,have,will,with,from,that,this,these,those,they,them,their,your,when,what,which,where,there,about,into,more,most,very,just,also,only,than,its,over,under,while,after,before,between,across,through,within,without,because,however,often,each,every,other,such,then,would,should,could,really,quite,rather,fairly,highly,deeply,truly,simply,basically,essentially,actually,literally,obviously,clearly,surely,utterly,extremely,incredibly,particularly,relatively,generally,typically,usually,sometimes,always,never,often,much,many,some,any,such,own,same,here,there,where,when,why,how,what,which,who,whom,whose,been,being,does,did,doing,down,once,only,both,few,while,whom,a,an,as,at,by,in,is,it,of,on,or,to,up,we,if,no,nor,too,own".split(","),
);

function buildTechSet(opts: ScanOptions): Set<string> {
  const set = new Set(BUNDLED_TECH);
  const add = (terms?: string[]) => {
    for (const t of terms ?? []) {
      const norm = t.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (norm.length >= 2) set.add(norm);
    }
  };
  add(opts.voiceProfile?.vocabulary);
  add(opts.voiceProfile?.brandTerms);
  return set;
}

function checkFluff(text: string, opts: ScanOptions): Finding[] {
  const out: Finding[] = [];
  const tech = buildTechSet(opts);
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  for (const b of blocks) {
    if (/^\s*(#{1,6}\s+|>\s*|\|\s*)/.test(b)) continue;
    const words = b.split(/\s+/).filter(Boolean);
    if (words.length < 150) continue;
    const seen = new Set<string>();
    let stops = 0;
    for (const w of words) {
      const n = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!n) continue;
      if (tech.has(n)) seen.add(n);
      else if (STOP.has(n)) stops++;
    }
    const ratio = seen.size / Math.max(1, stops);
    if (ratio < 0.18) {
      out.push({
        id: nid("prec"), category: "content", severity: "medium",
        location: `Block (${words.length} words): "${b.slice(0, 90).replace(/\s+/g, " ")}…"`,
        pattern: "fluff-to-substance-ratio",
        explanation: `Paragraph block (${words.length} words) contains minimal concrete technical facts or entity signals.`,
        suggested_action: "Condense or replace introductory filler with concrete architectural details, code examples, or data.",
        confidence: 0.8, layer: 4,
      });
      if (out.length >= 3) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 7. generic-anchor-text — SEO, medium 0.90, layer 3                   */
/* ------------------------------------------------------------------ */

const ANCHOR_RE = /\[(click here|read more|learn more|link|this article|here|source)\]\([^)]+\)/gi;

function checkAnchors(text: string): Finding[] {
  const out: Finding[] = [];
  ANCHOR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ANCHOR_RE.exec(text)) !== null) {
    out.push({
      id: nid("prec"), category: "seo", severity: "medium",
      location: excerpt(text, m.index),
      pattern: "generic-anchor-text",
      explanation: `Hyperlink anchor text "${m[1].slice(0, 40)}" lacks contextual descriptive keywords.`,
      suggested_action: "Rewrite anchor text to describe the target destination (e.g., \"[Read the Redis Caching Guide]\").",
      confidence: 0.9, layer: 3, offset: m.index,
    });
    if (out.length >= 5) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 8. code-placeholder — runs on RAW input (code is vaulted in text).   */
/* Category code, high 0.95, layer 4. Soft: not a default hard gate.    */
/* ------------------------------------------------------------------ */

const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;
const TODO_RE = /^\s*(?:\/\/|#|--|;|\*)\s*(TODO|FIXME)/i;
const SECRET_RE = /YOUR_SECRET_HERE|insert_key_here|<\s*YOUR_[A-Z0-9_]+\s*>|YOUR_API_KEY/i;
const ELISION_RE = /\/\/\s*\.\.\.\s*rest of|#\s*\.\.\.\s*code goes here|\.\.\.\s*rest of (the )?code|code goes here/i;

export function analyzePrecisionRaw(input: string, opts: ScanOptions = {}): Finding[] {
  const out: Finding[] = [];
  if (allowed(opts, "code-placeholder")) return out;
  FENCE_RE.lastIndex = 0;
  let b: RegExpExecArray | null;
  let n = 0;
  while ((b = FENCE_RE.exec(input)) !== null) {
    n++;
    const lang = b[1] || "code";
    for (const line of b[2].split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const hit = TODO_RE.test(t) || SECRET_RE.test(t) || ELISION_RE.test(t);
      if (hit) {
        out.push({
          id: nid("prec"), category: "code", severity: "high",
          location: `code block ${n} (${lang}): "${t.slice(0, 80)}"`,
          pattern: "code-placeholder",
          explanation: `Code snippet contains unfulfilled placeholder "${t.slice(0, 60)}".`,
          suggested_action: "Provide a fully working, self-contained code example or a syntactically complete mock.",
          confidence: 0.95, layer: 4,
        });
        if (out.length >= 5) return out;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 9. tech-entity-capitalization-drift — L1 lexical, medium 0.85        */
/* ------------------------------------------------------------------ */

interface Entity { key: string; canonical: string; variants: string[] }

const ENTITIES: Entity[] = [
  { key: "next.js", canonical: "Next.js", variants: ["Next.js", "NextJS", "Nextjs", "next.js"] },
  { key: "postgresql", canonical: "PostgreSQL", variants: ["PostgreSQL", "Postgres", "postgres"] },
  { key: "tailwind", canonical: "Tailwind CSS", variants: ["Tailwind CSS", "TailwindCSS", "Tailwind", "tailwind"] },
  { key: "typescript", canonical: "TypeScript", variants: ["TypeScript", "Typescript", "typescript"] },
  { key: "javascript", canonical: "JavaScript", variants: ["JavaScript", "Javascript", "javascript"] },
  { key: "github", canonical: "GitHub", variants: ["GitHub", "Github", "github"] },
  { key: "node.js", canonical: "Node.js", variants: ["Node.js", "NodeJS", "Nodejs", "nodejs"] },
  { key: "api", canonical: "API", variants: ["API", "api"] },
  { key: "mcp", canonical: "MCP", variants: ["MCP", "mcp"] },
  { key: "n8n", canonical: "n8n", variants: ["n8n", "N8N", "N8n"] },
  { key: "stripe", canonical: "Stripe", variants: ["Stripe", "stripe"] },
  { key: "vercel", canonical: "Vercel", variants: ["Vercel", "vercel"] },
  { key: "ios", canonical: "iOS", variants: ["iOS", "IOS", "ios"] },
  { key: "macos", canonical: "macOS", variants: ["macOS", "Macos", "macos"] },
  { key: "graphql", canonical: "GraphQL", variants: ["GraphQL", "Graphql", "graphql"] },
  { key: "redis", canonical: "Redis", variants: ["Redis", "redis"] },
  { key: "oauth", canonical: "OAuth", variants: ["OAuth", "Oauth", "oauth"] },
];

const GUARD_CHARS = new Set(["/", "'", '"', "."]);

function checkTechDrift(text: string): Finding[] {
  const out: Finding[] = [];
  for (const e of ENTITIES) {
    const seen = new Map<string, number>();
    for (const v of e.variants) {
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?<![A-Za-z])${esc}(?![A-Za-z])`, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const idx = m.index ?? 0;
        const before = idx > 0 ? text[idx - 1] : "";
        const after = text[idx + m[0].length] ?? "";
        if (GUARD_CHARS.has(before) || GUARD_CHARS.has(after)) continue;
        if (e.key === "tailwind" && after === "-") continue; // utility class, not prose
        if (!seen.has(m[0])) seen.set(m[0], idx);
      }
    }
    if (seen.size >= 2) {
      const [a, b] = [...seen.keys()];
      out.push({
        id: nid("prec"), category: "lexical", severity: "medium",
        location: `"${a}" vs "${b}"`,
        pattern: "tech-entity-capitalization-drift",
        explanation: `Inconsistent technical naming detected: "${b}" conflicts with earlier usage in document ("${a}").`,
        suggested_action: `Standardize all occurrences to official vendor branding ("${e.canonical}").`,
        confidence: 0.85, layer: 1, offset: seen.get(b),
      });
      if (out.length >= 4) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 10. missing-or-generic-alt-text — structure, medium 0.90, layer 3     */
/* ------------------------------------------------------------------ */

const IMG_RE = /!\[([^\]]*)\]\([^)]+\)/g;
const GENERIC_ALT = new Set(["image", "images", "img", "photo", "photos", "screenshot", "screenshots", "picture", "pictures", "graphic", "graphics", "banner", "screenshot?"]);

function checkAltText(text: string): Finding[] {
  const out: Finding[] = [];
  IMG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMG_RE.exec(text)) !== null) {
    const alt = m[1].trim();
    const low = alt.toLowerCase();
    const generic =
      alt === "" ||
      GENERIC_ALT.has(low) ||
      /^img[_-]\d/i.test(alt) ||
      /^dsc[_-]/i.test(alt) ||
      /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(alt) ||
      /^(screen\s?shot)[\s_-]*\d*$/i.test(alt);
    if (generic) {
      out.push({
        id: nid("prec"), category: "structure", severity: "medium",
        location: excerpt(text, m.index),
        pattern: "missing-or-generic-alt-text",
        explanation: `Image tag contains non-descriptive or empty alt text "${alt.slice(0, 40) || "(empty)"}".`,
        suggested_action: "Write descriptive alt text explaining the content or visual hierarchy of the image.",
        confidence: 0.9, layer: 3, offset: m.index,
      });
      if (out.length >= 5) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */

export function analyzePrecisionText(text: string, opts: ScanOptions = {}): Finding[] {
  const out: Finding[] = [];
  const run = (name: string, fn: () => Finding[]) => {
    if (allowed(opts, name)) return;
    try { out.push(...fn()); } catch { /* analyzer never blocks */ }
  };
  run("conclusion-cliche", () => checkConclusionCliche(text));
  run("manufactured-gravity", () => checkManufacturedGravity(text));
  run("symmetrical-section-pacing", () => checkSectionPacing(text));
  run("passive-voice-density", () => checkPassive(text));
  run("unanchored-demonstrative-opening", () => checkDemonstrative(text));
  run("fluff-to-substance-ratio", () => checkFluff(text, opts));
  run("generic-anchor-text", () => checkAnchors(text));
  run("tech-entity-capitalization-drift", () => checkTechDrift(text));
  run("missing-or-generic-alt-text", () => checkAltText(text));
  return out;
}

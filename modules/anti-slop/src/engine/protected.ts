/**
 * Protected-content handling.
 *
 * Never modified unless explicitly instructed: product/company names,
 * trademarks, code, URLs, API names, legal text, quoted material,
 * citations, and explicit PROTECT_START…PROTECT_END spans.
 */

export interface ProtectedDoc {
  /** text with protected spans replaced by placeholders */
  text: string;
  /** placeholder -> original */
  vault: Map<string, string>;
}

let counter = 0;

function stash(vault: Map<string, string>, original: string): string {
  const key = `\u0000PROT${counter++}\u0000`;
  vault.set(key, original);
  return key;
}

/** Extract protected spans; returns maskable text + vault for restore. */
export function protect(
  input: string,
  extraTerms: string[] = [],
): ProtectedDoc {
  const vault = new Map<string, string>();
  let text = input;

  // 1. Explicit PROTECT_START … PROTECT_END blocks (kept verbatim).
  text = text.replace(/PROTECT_START[\s\S]*?PROTECT_END/g, (m) => stash(vault, m));

  // 2. Fenced code blocks + inline code.
  text = text.replace(/```[\s\S]*?```/g, (m) => stash(vault, m));
  text = text.replace(/`[^`\n]+`/g, (m) => stash(vault, m));

  // 3. URLs, emails, file paths that look intentional.
  text = text.replace(/https?:\/\/[^\s)]+/g, (m) => stash(vault, m));
  text = text.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, (m) => stash(vault, m));

  // 4. Quoted material ("…", "…", '…', > blockquotes).
  text = text.replace(/(^|\n)>([^\n]*)/g, (m) => stash(vault, m));
  text = text.replace(/"[^"\n]{3,}"/g, (m) => stash(vault, m));
  text = text.replace(/“[^”\n]{3,}”/g, (m) => stash(vault, m));

  // 5. Frontmatter (SEO/CMS metadata must survive rewrites).
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = text.slice(0, end + 4);
      text = stash(vault, fm) + text.slice(end + 4);
    }
  }

  // 6. Explicit protected terms (product names, API names, SEO keywords).
  for (const term of extraTerms) {
    if (!term || term.length < 2) continue;
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(esc, "g");
    text = text.replace(re, (m) => stash(vault, m));
  }

  return { text, vault };
}

/** Restore protected spans into (possibly edited) text. */
export function unprotect(text: string, vault: Map<string, string>): string {
  let out = text;
  for (const [key, original] of vault) {
    out = out.split(key).join(original);
  }
  return out;
}

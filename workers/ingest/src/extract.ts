/**
 * File text extraction for the ingest worker. TXT/MD/CSV decode as UTF-8
 * directly. PDF goes through unpdf (Workers-compatible). Returns null
 * when a file cannot be turned into text so the pipeline marks the
 * document failed with an actionable error instead of silent garbage.
 */
import { extractText } from "unpdf";

export async function extractFileText(
  bytes: Uint8Array,
  fileType: string,
): Promise<string | null> {
  try {
    if (fileType === "txt" || fileType === "md" || fileType === "csv") {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return text.trim() ? text : null;
    }
    if (fileType === "pdf") {
      const result = (await extractText(bytes, { mergePages: true })) as {
        text?: string | string[];
        totalPages?: number;
      };
      const raw = result?.text;
      const text = Array.isArray(raw) ? raw.join("\n\n") : (raw ?? "");
      return text.trim() ? text : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function describeFileTarget(fileName: string): string {
  return fileName;
}

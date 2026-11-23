import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const SITE_ORIGIN = "https://www.pantaleone.net";

/**
 * Assistant message renderer. Markdown only — no raw HTML
 * (react-markdown escapes it by default). External links open in a new
 * tab; same-site links stay in-page.
 */
export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words",
        "prose-invert",
        "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
        "prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-foreground",
        "prose-a:text-foreground prose-a:underline prose-a:underline-offset-4",
        "prose-code:rounded-md prose-code:border prose-code:bg-muted/50",
        "prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:text-[0.85em]",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:rounded-lg prose-pre:border",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (!href) return <span>{children}</span>;
            const isExternal =
              /^https?:\/\//.test(href) && !href.startsWith(SITE_ORIGIN);
            if (isExternal) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {children}
                </a>
              );
            }
            return <a href={href}>{children}</a>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

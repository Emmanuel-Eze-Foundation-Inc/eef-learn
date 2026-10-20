"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "./code-block";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withoutMatchingTitle(markdown: string, title: string) {
  return markdown.replace(new RegExp(`^#+\\s+${escapeRegExp(title)}\\s*\\n+`, "i"), "");
}

/** Lesson copy: GFM markdown in the reader's measure. */
export function LessonMarkdown({ markdown, title }: { markdown: string; title?: string | null }) {
  const source = title ? withoutMatchingTitle(markdown.trim(), title) : markdown.trim();
  if (!source) return null;

  return (
    <div className="space-y-5 text-[17px] leading-[1.75] text-star-100/90">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="pt-4 text-2xl font-semibold tracking-tight text-star-100">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="pt-4 text-2xl font-semibold tracking-tight text-star-100">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="pt-2 text-xl font-semibold tracking-tight text-star-100">{children}</h4>
          ),
          h4: ({ children }) => (
            <h5 className="pt-1 text-lg font-semibold text-star-100">{children}</h5>
          ),
          ul: ({ children }) => <ul className="list-disc space-y-2 pl-6 marker:text-aurora-400">{children}</ul>,
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-6 marker:text-star-400">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-aurora-400/60 bg-night-900/60 py-2 pr-4 pl-5 text-star-100/80 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-aurora-400 underline decoration-aurora-400/40 underline-offset-4 hover:decoration-aurora-400"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-star-100">{children}</strong>,
          hr: () => <hr className="border-night-800" />,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl border border-night-800">
              <table className="w-full border-collapse text-left text-[15px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-night-800 bg-night-900 px-4 py-2.5 font-semibold text-star-100">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border-b border-night-800/70 px-4 py-2.5">{children}</td>,
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const text = String(children ?? "");
            if (lang || text.includes("\n")) {
              return <CodeBlock language={lang ?? ""} code={text.replace(/\n$/, "")} />;
            }
            return (
              <code className="rounded-md bg-night-800 px-1.5 py-0.5 font-mono text-[0.85em] text-aurora-400">
                {children}
              </code>
            );
          },
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}

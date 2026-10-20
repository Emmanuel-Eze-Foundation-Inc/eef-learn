"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CodeBlock({ language, code, title }: { language: string; code: string; title?: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div data-theme="dark" className="overflow-hidden rounded-xl border border-night-800 bg-[#050d09]">
      <div className="flex items-center justify-between border-b border-night-800 px-4 py-2">
        <span className="font-mono text-[11px] tracking-[0.12em] text-star-400 uppercase">
          {title || language || "code"}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => void copy()} aria-label="Copy code">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13.5px] leading-relaxed text-star-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

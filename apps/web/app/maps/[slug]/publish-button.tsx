"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Creator-only publish control (ticket T11). Gold is earned; publishing is offered → aurora. */
export function PublishButton({
  mapId,
  slug,
  visibility,
}: {
  mapId: string;
  slug: string;
  visibility: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const isPublic = visibility === "public";

  async function toggle() {
    setPending(true);
    await fetch(`/api/maps/${mapId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: isPublic ? "private" : "public" }),
    });
    setPending(false);
    router.refresh();
  }

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex items-center gap-3">
      {isPublic && (
        <button
          onClick={copy}
          className="rounded-full border border-aurora-400/50 px-4 py-2 text-sm text-aurora-400 hover:border-aurora-400"
        >
          {copied ? "Link copied ✓" : "Copy share link"}
        </button>
      )}
      <button
        onClick={toggle}
        disabled={pending}
        className="rounded-full border border-night-800 px-4 py-2 text-sm text-star-400 hover:border-star-400 hover:text-star-100 disabled:opacity-60"
      >
        {pending ? "…" : isPublic ? "Make private" : "Publish map"}
      </button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

import { useAuthDialog } from "./auth-dialog";

export function CommunityMapCard({
  slug,
  title,
  nodeCount,
  creatorName,
  signedIn,
}: {
  slug: string;
  title: string;
  nodeCount: number;
  creatorName: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const dialog = useAuthDialog();

  return (
    <div className="h-full rounded-2xl border border-night-800 bg-night-900 p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">Community map</p>
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-star-400">
        {nodeCount} star{nodeCount === 1 ? "" : "s"} · shared by {creatorName}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push(`/share/${slug}`)}
          className="rounded-full border border-night-800 px-4 py-2 text-sm hover:border-star-400"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => {
            if (signedIn) {
              router.push(`/maps/${slug}`);
              return;
            }
            dialog.open({ next: `/maps/${slug}`, intent: "signin" });
          }}
          className="rounded-full bg-aurora-400 px-4 py-2 text-sm font-semibold text-ink-900"
        >
          Enter map
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { PublicMap } from "@/lib/public-maps";

import { useAuthDialog } from "./auth-dialog";
import { MiniConstellation } from "./mini-constellation";

export function MapSkyCard({
  map,
  signedIn,
  active = false,
  onFocusMap,
}: {
  map: PublicMap;
  signedIn: boolean;
  active?: boolean;
  onFocusMap?: (slug: string) => void;
}) {
  const router = useRouter();
  const dialog = useAuthDialog();
  const path = map.nodes.map((node) => node.title);
  const pathLabel =
    path.length <= 4 ? path.join(" · ") : `${path.slice(0, 3).join(" · ")} · +${path.length - 3}`;

  function enter() {
    if (signedIn) {
      router.push(`/maps/${map.slug}`);
      return;
    }
    dialog.open({ next: `/maps/${map.slug}`, intent: "signin" });
  }

  return (
    <article
      id={`map-${map.slug}`}
      onMouseEnter={() => onFocusMap?.(map.slug)}
      onFocusCapture={() => onFocusMap?.(map.slug)}
      className={`overflow-hidden rounded-[1.75rem] border bg-night-900 shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition-[border-color,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        active ? "border-aurora-400" : "border-night-800 hover:border-star-400"
      }`}
    >
      <div className="relative h-64 bg-night-950 sm:h-72">
        <MiniConstellation slug={map.slug} nodes={map.nodes} edges={map.edges} active={active} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-night-900 to-night-900/0" />
        <p className="absolute left-4 top-4 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
          {`${map.nodes.length} ${map.nodes.length === 1 ? "star" : "stars"}`}
        </p>
      </div>
      <div className="p-6 sm:p-7">
        <h2 className="text-pretty text-2xl font-semibold tracking-tight">{map.title}</h2>
        {map.topic.trim().toLowerCase() !== map.title.trim().toLowerCase() && (
          <p className="mt-3 max-w-[62ch] leading-relaxed text-star-400">{map.topic}</p>
        )}
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
          Published by {map.creatorName}
        </p>
        {path.length > 0 && (
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-star-400/80">{pathLabel}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/share/${map.slug}`}
            className="rounded-full border border-night-800 px-5 py-2.5 text-sm hover:border-star-400"
          >
            Preview
          </Link>
          <button
            type="button"
            onClick={enter}
            className="rounded-full bg-aurora-400 px-5 py-2.5 text-sm font-semibold text-ink-900"
          >
            Enter map
          </button>
        </div>
      </div>
    </article>
  );
}

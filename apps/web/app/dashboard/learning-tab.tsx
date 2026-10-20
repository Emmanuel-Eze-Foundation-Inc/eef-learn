"use client";

import { Compass, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import type { LearningMap } from "@/lib/dashboard";
import { send } from "@/lib/send";

import { ago, plural } from "./format";

function StatusBadge({ map }: { map: LearningMap }) {
  const done = map.lessons > 0 && map.mastered === map.lessons;
  switch (map.access) {
    case "open":
      return done ? <Badge variant="gold">Completed</Badge> : null;
    case "approved":
      return done ? <Badge variant="gold">Completed</Badge> : <Badge>Private · approved</Badge>;
    case "pending":
      return <Badge variant="aurora">Waiting for approval</Badge>;
    case "declined":
      return <Badge>Request declined</Badge>;
    case "revoked":
      return <Badge>No longer shared</Badge>;
    default: {
      const _exhaustive: never = map.access;
      return _exhaustive;
    }
  }
}

function PrimaryAction({ map, onAskAgain }: { map: LearningMap; onAskAgain: () => void }) {
  const href = `/maps/${map.slug}${map.resumeSlug ? `?node=${encodeURIComponent(map.resumeSlug)}` : ""}`;
  const done = map.lessons > 0 && map.mastered === map.lessons;
  switch (map.access) {
    case "open":
    case "approved":
      return (
        <Button asChild size="sm">
          <Link href={href}>{done ? "Review" : map.mastered || map.resumeSlug ? "Continue" : "Start"}</Link>
        </Button>
      );
    case "pending":
      return (
        <Button size="sm" variant="outline" disabled>
          Request sent
        </Button>
      );
    case "declined":
    case "revoked":
      return (
        <Button size="sm" variant="outline" onClick={onAskAgain}>
          Ask again
        </Button>
      );
    default: {
      const _exhaustive: never = map.access;
      return _exhaustive;
    }
  }
}

export function LearningTab({ maps }: { maps: LearningMap[] }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState<LearningMap | null>(null);
  const [busy, setBusy] = useState(false);

  async function leave(map: LearningMap) {
    setBusy(true);
    try {
      await send(`/api/maps/${map.id}/access`, "DELETE", {});
      toast.success(`You left “${map.title}”`);
      setLeaving(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't leave the map.");
    } finally {
      setBusy(false);
    }
  }

  async function askAgain(map: LearningMap) {
    try {
      await send(`/api/maps/${map.id}/access`, "POST", {});
      toast.success("Request sent. You'll see it here once the creator decides.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the request.");
    }
  }

  if (!maps.length) {
    return (
      <div className="rounded-2xl border border-dashed border-night-800 p-10 text-center">
        <Compass className="mx-auto size-6 text-aurora-400" aria-hidden />
        <h3 className="mt-4 text-lg font-semibold">You haven&apos;t joined anyone&apos;s map yet.</h3>
        <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-relaxed text-star-400">
          Maps other people built show up here once you start one or ask to join a private one. Your
          own maps live under My maps.
        </p>
        <Button asChild className="mt-6">
          <Link href="/community">Browse community maps</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {maps.map((map) => {
          const pct = map.lessons ? Math.round((map.mastered / map.lessons) * 100) : 0;
          return (
            <li
              key={map.id}
              className="flex flex-col gap-4 rounded-2xl border border-night-800 bg-night-900/40 p-4 sm:flex-row sm:items-center sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate font-semibold">{map.title}</h3>
                  <StatusBadge map={map} />
                </div>
                <p className="mt-1 text-sm text-star-400">
                  by {map.creatorName}
                  {map.lastActive ? ` · active ${ago(map.lastActive)}` : ""}
                </p>
                <div className="mt-3 flex max-w-sm items-center gap-3">
                  <Progress value={pct} aria-label={`${map.title} progress`} className="h-1.5" />
                  <span className="shrink-0 text-xs text-star-400 tabular-nums">
                    {map.mastered} of {plural(map.lessons, "lesson")}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PrimaryAction map={map} onAskAgain={() => void askAgain(map)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label={`More for ${map.title}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/share/${map.slug}`}>View the map</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setLeaving(map)}>
                      Leave map
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={leaving !== null} onOpenChange={(open) => !open && !busy && setLeaving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave “{leaving?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {leaving?.mastered
                ? `Your progress on ${plural(leaving.mastered, "lesson")} will be deleted.`
                : "It disappears from your dashboard."}
              {leaving && leaving.access !== "open" ? " It's private, so you'd have to ask again to rejoin." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Stay</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (leaving) void leave(leaving);
              }}
              className="border border-ember-500/40 bg-ember-500/15 text-ember-300 hover:bg-ember-500/25"
            >
              Leave map
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

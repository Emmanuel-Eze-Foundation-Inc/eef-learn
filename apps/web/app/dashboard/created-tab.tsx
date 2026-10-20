"use client";

import { Globe, Lock, MoreHorizontal, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AI_PROVIDERS } from "@/lib/ai-providers";
import type { CreatedMap, DashboardData } from "@/lib/dashboard";
import { send } from "@/lib/send";

import { ago, plural } from "./format";

type Access = "public" | "private";

export function CreatedTab({
  maps,
  ai,
  onShowRequests,
}: {
  maps: CreatedMap[];
  ai: DashboardData["ai"];
  onShowRequests: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<CreatedMap | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  async function setAccess(map: CreatedMap, access: Access) {
    if (!map.lessons && access === "public") {
      toast.error("Add at least one lesson before making the map public.");
      return;
    }
    setSaving(map.id);
    try {
      await send(`/api/maps/${map.id}`, "PATCH", { visibility: access });
      toast.success(
        access === "public"
          ? `“${map.title}” is public and listed in Community maps.`
          : `“${map.title}” is private. People with the link can ask to join.`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't change who can see it.");
    } finally {
      setSaving(null);
    }
  }

  async function remove(map: CreatedMap) {
    setBusy(true);
    try {
      await send(`/api/maps/${map.id}`, "DELETE");
      toast.success(`Deleted “${map.title}”`);
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the map.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(map: CreatedMap) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${map.slug}`);
      toast.success(
        map.visibility === "public" ? "Share link copied." : "Share link copied. People who open it can ask to join.",
      );
    } catch {
      toast.error("Couldn't copy. The link is /share/" + map.slug);
    }
  }

  const aiNote = ai ? (
    `The course agent runs on your ${AI_PROVIDERS[ai.provider].label} key, with no limits.`
  ) : (
    <>
      The course agent runs on your own AI.{" "}
      <Link href="/dashboard?tab=settings#ai" className="text-aurora-400 hover:underline">
        Connect it in Settings
      </Link>
      .
    </>
  );

  if (!maps.length) {
    return (
      <div className="rounded-2xl border border-dashed border-night-800 p-10 text-center">
        <h3 className="text-lg font-semibold">You haven&apos;t made a map yet.</h3>
        <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-relaxed text-star-400">
          Give the course agent a topic and it drafts the modules, finds videos, and writes lessons.
          You edit, then decide who can see it. {aiNote}
        </p>
        <Button asChild className="mt-6">
          <Link href="/maps/new">
            <Plus /> Create your first map
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-star-400">{aiNote}</p>
      <ul className="flex flex-col gap-2">
        {maps.map((map) => {
          const access: Access = map.visibility === "public" ? "public" : "private";
          return (
            <li
              key={map.id}
              className="flex flex-col gap-4 rounded-2xl border border-night-800 bg-night-900/40 p-4 md:flex-row md:items-center md:p-5"
            >
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">
                  <Link href={`/maps/${map.slug}/studio`} className="hover:text-aurora-400">
                    {map.title}
                  </Link>
                </h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-star-400 tabular-nums">
                  <span>{plural(map.lessons, "lesson")}</span>
                  <span aria-hidden>·</span>
                  <span>{plural(map.learners, "learner")}</span>
                  <span aria-hidden>·</span>
                  <span>edited {ago(map.updatedAt)}</span>
                  {map.pending ? (
                    <>
                      <span aria-hidden>·</span>
                      <button
                        type="button"
                        onClick={onShowRequests}
                        className="font-medium text-aurora-400 underline-offset-4 hover:underline"
                      >
                        {plural(map.pending, "request")} waiting
                      </button>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Select
                  value={access}
                  onValueChange={(v) => void setAccess(map, v as Access)}
                  disabled={saving === map.id}
                >
                  <SelectTrigger size="sm" aria-label={`Who can see ${map.title}`} className="w-fit min-w-32 border-night-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="public">
                      <Globe className="text-aurora-400" /> Public
                    </SelectItem>
                    <SelectItem value="private">
                      <Lock className="text-star-400" /> Private, by request
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/maps/${map.slug}/studio`}>Edit</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label={`More for ${map.title}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                      <Link href={`/maps/${map.slug}`}>Open as a learner</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/share/${map.slug}`}>View share page</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void copyLink(map)}>Copy share link</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(map)}>
                      Delete map
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && !busy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `Its ${plural(deleting.lessons, "lesson")} and all their content will be deleted` : ""}
              {deleting?.learners ? `, along with progress for ${plural(deleting.learners, "learner")}` : ""}. This
              can&apos;t be undone. To hide it instead, make it private.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) void remove(deleting);
              }}
              className="border border-ember-500/40 bg-ember-500/15 text-ember-300 hover:bg-ember-500/25"
            >
              Delete map
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

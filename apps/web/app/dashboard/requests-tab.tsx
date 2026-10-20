"use client";

import { Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { AccessPerson } from "@/lib/dashboard";
import { send } from "@/lib/send";

import { ago, initials } from "./format";

function Person({ person, detail }: { person: AccessPerson; detail: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-night-800 text-xs text-star-100">{initials(person.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm">
          <span className="font-medium">{person.name}</span>{" "}
          <span className="text-star-400">{person.email}</span>
        </p>
        {detail}
      </div>
    </div>
  );
}

export function RequestsTab({ requests, people }: { requests: AccessPerson[]; people: AccessPerson[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>, done: string) {
    setBusy(key);
    try {
      await action();
      toast.success(done);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const byMap = new Map<string, { title: string; people: AccessPerson[] }>();
  for (const p of people) {
    const group = byMap.get(p.mapId) ?? { title: p.mapTitle, people: [] };
    group.people.push(p);
    byMap.set(p.mapId, group);
  }

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="pending-heading">
        <h3 id="pending-heading" className="text-base font-semibold">
          Waiting for you
        </h3>
        {requests.length === 0 ? (
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-dashed border-night-800 p-5 text-sm text-star-400">
            <Inbox className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="leading-relaxed">
              No requests right now. When one of your maps is private, anyone who opens its share
              link can ask to join, and their request lands here.
            </p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {requests.map((r) => {
              const key = `${r.mapId}:${r.userId}`;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-4 rounded-2xl border border-night-800 bg-night-900/40 p-4 sm:flex-row sm:items-center"
                >
                  <Person
                    person={r}
                    detail={
                      <>
                        <p className="mt-0.5 text-sm text-star-400">
                          wants to join <span className="text-star-100">{r.mapTitle}</span> · {ago(r.at)}
                        </p>
                        {r.message ? (
                          <p className="mt-2 rounded-lg bg-night-950/60 px-3 py-2 text-sm leading-relaxed text-star-100">
                            “{r.message}”
                          </p>
                        ) : null}
                      </>
                    }
                  />
                  <div className="flex shrink-0 gap-2 sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === key}
                      onClick={() =>
                        void run(
                          key,
                          () => send(`/api/maps/${r.mapId}/access`, "PATCH", { userId: r.userId, status: "declined" }),
                          `Declined ${r.name}.`,
                        )
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy === key}
                      onClick={() =>
                        void run(
                          key,
                          () => send(`/api/maps/${r.mapId}/access`, "PATCH", { userId: r.userId, status: "approved" }),
                          `${r.name} can now enter ${r.mapTitle}.`,
                        )
                      }
                    >
                      Approve
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="people-heading">
        <h3 id="people-heading" className="text-base font-semibold">
          People with access to your private maps
        </h3>
        {byMap.size === 0 ? (
          <p className="mt-3 text-sm text-star-400">Nobody yet. Approved learners show up here.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-6">
            {[...byMap].map(([mapId, group]) => (
              <div key={mapId}>
                <p className="text-sm text-star-400">{group.title}</p>
                <ul className="mt-2 divide-y divide-night-800 rounded-2xl border border-night-800">
                  {group.people.map((p) => {
                    const key = `${p.mapId}:${p.userId}`;
                    return (
                      <li key={key} className="flex items-center gap-3 px-4 py-3">
                        <Person person={p} detail={<p className="text-xs text-star-400">approved {ago(p.at)}</p>} />
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === key}
                          className="shrink-0 hover:text-ember-300"
                          onClick={() =>
                            void run(
                              key,
                              () => send(`/api/maps/${p.mapId}/access`, "DELETE", { userId: p.userId }),
                              `Removed ${p.name}. They can ask again from the share link.`,
                            )
                          }
                        >
                          Remove
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LearnNav } from "@/components/chrome/learn-nav";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardData } from "@/lib/dashboard";

import { UnseenEngineSponsor } from "../components/unseen-engine-sponsor";
import { CreatedTab } from "./created-tab";
import { plural } from "./format";
import { LearningTab } from "./learning-tab";
import { RequestsTab } from "./requests-tab";
import { SettingsTab } from "./settings-tab";
import type { DashboardTab } from "./tabs";

function Count({ n, alert = false }: { n: number; alert?: boolean }) {
  if (!n) return null;
  return (
    <span
      className={
        alert
          ? "ml-1 rounded-full bg-aurora-400 px-1.5 text-[11px] leading-5 font-semibold text-night-950 tabular-nums"
          : "ml-1 text-star-400 tabular-nums"
      }
    >
      {n}
    </span>
  );
}

export function DashboardView({
  data,
  mock,
  googleEnabled,
  initialTab,
}: {
  data: DashboardData;
  mock: boolean;
  googleEnabled: boolean;
  initialTab: DashboardTab;
}) {
  const [tab, setTab] = useState<DashboardTab>(initialTab);
  const firstName = (data.user.name || "friend").split(" ")[0];
  const active = data.learning.filter((m) => m.access === "open" || m.access === "approved");
  const finished = active.filter((m) => m.lessons > 0 && m.mastered === m.lessons).length;

  function go(next: DashboardTab) {
    setTab(next);
    window.history.replaceState(null, "", next === "learning" ? "/dashboard" : `/dashboard?tab=${next}`);
  }

  const summary = [
    active.length ? `${plural(active.length, "map")} in progress` : null,
    finished ? `${finished} finished` : null,
    data.created.length ? `${plural(data.created.length, "map")} you made` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="flex min-h-screen flex-col bg-night-950 text-star-100">
      <LearnNav signedIn active="dashboard" />
      <div className="mx-auto w-full max-w-[1100px] flex-1 px-5 pt-8 pb-20 lg:px-8 lg:pt-12">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Welcome back, {firstName}.</h1>
            <p className="mt-2 text-star-400">{summary || "Your first map is one topic away."}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/community">Browse maps</Link>
            </Button>
            <Button asChild>
              <Link href="/maps/new">
                <Plus /> New map
              </Link>
            </Button>
          </div>
        </header>

        {data.resume ? (
          <Link
            href={`/maps/${data.resume.mapSlug}?node=${encodeURIComponent(data.resume.lessonSlug)}`}
            className="group mt-8 flex flex-col gap-4 rounded-2xl border border-aurora-400/30 bg-night-900/60 p-5 transition-colors duration-200 hover:border-aurora-400/70 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="min-w-0">
              <p className="text-sm text-star-400">Pick up where you left off</p>
              <p className="mt-1 truncate text-xl font-semibold">{data.resume.mapTitle}</p>
              <p className="mt-1 truncate text-sm text-star-400">
                {data.resume.mastered ? "Finished " : "On "}
                <span className="text-gold-400">{data.resume.lessonTitle}</span>
                {data.resume.mastered ? ". The next lesson is waiting." : ""}
              </p>
            </div>
            <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-aurora-400 px-4 text-sm font-semibold text-night-950 transition-colors group-hover:bg-aurora-400/90">
              Continue
            </span>
          </Link>
        ) : null}

        <Tabs value={tab} onValueChange={(v) => go(v as DashboardTab)} className="mt-10">
          <TabsList className="h-auto w-full justify-start overflow-x-auto [scrollbar-width:none] sm:w-fit">
            <TabsTrigger value="learning">
              Learning <Count n={data.learning.length} />
            </TabsTrigger>
            <TabsTrigger value="created">
              My maps <Count n={data.created.length} />
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests <Count n={data.requests.length} alert />
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="learning" className="mt-6">
            <LearningTab maps={data.learning} />
          </TabsContent>
          <TabsContent value="created" className="mt-6">
            <CreatedTab maps={data.created} ai={data.ai} onShowRequests={() => go("requests")} />
          </TabsContent>
          <TabsContent value="requests" className="mt-6">
            <RequestsTab requests={data.requests} people={data.people} />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <SettingsTab data={data} mock={mock} googleEnabled={googleEnabled} />
          </TabsContent>
        </Tabs>
      </div>
      <footer className="border-t border-night-800 px-5 py-8 lg:px-12">
        <UnseenEngineSponsor variant="footer" />
      </footer>
    </main>
  );
}

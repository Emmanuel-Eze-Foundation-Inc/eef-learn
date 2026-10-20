import { redirect } from "next/navigation";

import { googleAuthEnabled } from "@/lib/auth";
import { loadDashboard } from "@/lib/dashboard";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";

import { DashboardView } from "./dashboard-view";
import { isDashboardTab } from "./tabs";

export const dynamic = "force-dynamic";

/** Learner + creator home: maps you're on, maps you made, access requests, settings. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/dashboard");
  const data = await loadDashboard(session.user.id);
  if (!data) redirect("/sign-in?next=/dashboard");
  const { tab } = await searchParams;

  return <DashboardView
      data={data}
      mock={env.AI_PROVIDER === "mock"}
      googleEnabled={googleAuthEnabled}
      initialTab={isDashboardTab(tab) ? tab : "learning"} />;
}

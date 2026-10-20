import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { StartStudio } from "./start-studio";

export const dynamic = "force-dynamic";

/** New maps open straight in the studio; a topic from the landing page starts the agent building it. */
export default async function NewMapPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const session = await getSession();
  const topic = (await searchParams).topic?.trim() ?? "";
  if (!session) {
    const next = topic ? `/maps/new?topic=${encodeURIComponent(topic)}` : "/maps/new";
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }
  return <StartStudio topic={topic} />;
}

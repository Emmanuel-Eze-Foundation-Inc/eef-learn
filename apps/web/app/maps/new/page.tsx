import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { userHasApiKey } from "@/lib/user-ai-key";

import { NewMapForm } from "./new-map-form";

export const dynamic = "force-dynamic";

export default async function NewMapPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const session = await getSession();
  const { topic } = await searchParams;
  const defaultTopic = topic?.trim() ?? "";
  if (!session) {
    const next = defaultTopic
      ? `/maps/new?topic=${encodeURIComponent(defaultTopic)}`
      : "/maps/new";
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }
  return (
    <NewMapForm
      defaultTopic={defaultTopic}
      hasKey={await userHasApiKey(session.user.id)}
      mock={env.AI_PROVIDER === "mock"}
    />
  );
}

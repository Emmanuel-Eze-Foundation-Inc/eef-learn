import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";

import { ConsentForm } from "./consent-form";

type PublicClient = { client_name?: string; logo_uri?: string; client_uri?: string };

function clientLabel(clientId: string, client: PublicClient | null): string {
  if (client?.client_name) return client.client_name;
  try {
    return new URL(clientId).hostname;
  } catch {
    return "An AI app";
  }
}

/** The OAuth consent step for MCP clients; Better Auth signs the query it redirects here with. */
export default async function ConsentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const one of [value].flat()) if (one !== undefined) query.append(key, one);
  }
  const { secret } = await auth.$context;
  if (!(await verifyOAuthQueryParams(query.toString(), secret))) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">This link expired</h1>
        <p className="mt-3 leading-relaxed text-star-400">Start connecting again from your AI app.</p>
      </div>
    );
  }

  const session = await getSession();
  if (!session) redirect(`/sign-in?${query.toString()}`);

  const clientId = query.get("client_id") ?? "";
  const client = (await auth.api
    .getOAuthClientPublic({ query: { client_id: clientId }, headers: await headers() })
    .catch(() => null)) as PublicClient | null;
  const scopes = (query.get("scope") ?? "").split(" ").filter(Boolean);

  return (
    <ConsentForm
      clientName={clientLabel(clientId, client)}
      clientUri={client?.client_uri ?? null}
      email={session.user.email}
      offline={scopes.includes("offline_access")}
    />
  );
}

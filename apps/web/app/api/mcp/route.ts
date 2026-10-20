import { requireMcpAuth } from "@better-auth/mcp";
import { prisma } from "@eef/db";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { auth, MCP_RESOURCE, mcpEnabled } from "@/lib/auth";
import { buildMcpServer } from "@/lib/mcp-tools";

const handler = createMcpHandler(({ authInfo }) => {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string") throw new Error("MCP request reached the server without a verified user");
  return buildMcpServer({ userId, client: authInfo?.clientId ?? "client" });
});

const protectedPost = requireMcpAuth(
  auth,
  async (req, claims) => {
    const clientId = String(claims.azp ?? claims.client_id ?? "");
    const client = clientId
      ? await prisma.oauthClient.findUnique({ where: { clientId }, select: { name: true } })
      : null;
    return handler.fetch(req, {
      authInfo: {
        token: "",
        clientId: client?.name ?? clientId,
        scopes: String(claims.scope ?? "").split(" ").filter(Boolean),
        extra: { userId: claims.sub },
      },
    });
  },
  { resource: MCP_RESOURCE },
);

/** POST /api/mcp — EEF Learn's MCP server for the creator's own AI client (OAuth bearer token). */
export function POST(req: Request) {
  if (!mcpEnabled) return Response.json({ error: "MCP needs this server on an https AUTH_URL." }, { status: 404 });
  return protectedPost(req);
}

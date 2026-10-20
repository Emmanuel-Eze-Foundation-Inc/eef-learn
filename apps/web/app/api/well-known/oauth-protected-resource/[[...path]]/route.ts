import { auth } from "@/lib/auth";

/** RFC 9728 metadata for /api/mcp, served by the Better Auth MCP plugin at its well-known path. */
export function GET(req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  return params.then(({ path }) => {
    const url = new URL(req.url);
    url.pathname = ["/.well-known/oauth-protected-resource", ...(path ?? [])].join("/");
    return auth.handler(new Request(url, { headers: req.headers }));
  });
}

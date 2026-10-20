"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { send } from "@/lib/send";

type App = { clientId: string; name: string; connectedAt: string };

type Client = { id: string; label: string; steps: string[]; snippet?: (url: string) => string };

const CLIENTS: Client[] = [
  {
    id: "claude",
    label: "Claude",
    steps: [
      "In Claude on the web or desktop, open Settings, then Connectors.",
      "Choose Add custom connector, name it EEF Learn, and paste the server URL.",
      "Choose Connect, sign in to EEF Learn, and select Allow.",
    ],
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    steps: [
      "In ChatGPT, open Settings, then Apps, then Advanced settings, and turn on Developer mode.",
      "Choose Create app, name it EEF Learn, paste the server URL, and pick OAuth.",
      "Sign in to EEF Learn when asked, and select Allow.",
    ],
  },
  {
    id: "cursor",
    label: "Cursor",
    steps: [
      "Open Cursor Settings, then MCP, and add a new server, or put this in ~/.cursor/mcp.json.",
      "Select Connect next to eef-learn, sign in to EEF Learn, and select Allow.",
    ],
    snippet: (url) => JSON.stringify({ mcpServers: { "eef-learn": { url } } }, null, 2),
  },
  {
    id: "claude-code",
    label: "Claude Code",
    steps: ["Run this in a terminal.", "In Claude Code, run /mcp, pick eef-learn, and sign in to EEF Learn."],
    snippet: (url) => `claude mcp add --transport http eef-learn ${url}`,
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    steps: [
      "Add this to ~/.gemini/settings.json.",
      "In Gemini CLI, run /mcp auth eef-learn, sign in to EEF Learn, and select Allow.",
    ],
    snippet: (url) => JSON.stringify({ mcpServers: { "eef-learn": { httpUrl: url } } }, null, 2),
  },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-label={label}
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        })
      }
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

/** Connect Claude, ChatGPT, Cursor or Gemini to EEF Learn over MCP; it builds courses on the user's own plan. */
export function ConnectAiPanel({ mcpUrl, apps }: { mcpUrl: string | null; apps: App[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  async function disconnect(app: App) {
    setRemoving(app.clientId);
    try {
      await send(`/api/me/ai-apps/${encodeURIComponent(app.clientId)}`, "DELETE");
      toast.success(`${app.name} is disconnected.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't disconnect that app.");
    } finally {
      setRemoving(null);
    }
  }

  if (!mcpUrl) {
    return (
      <p className="max-w-[62ch] text-sm leading-relaxed text-star-400">
        Connecting Claude, ChatGPT, Cursor or Gemini needs this server on https. Ask whoever runs it to set an https
        AUTH_URL, or bring a model key below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-star-100">Connect your assistant</h3>
        <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-star-400">
          Your assistant builds and edits your courses here on your own plan. Ask it to “build an EEF Learn course
          on…” once it&apos;s connected.
        </p>
      </div>
      <div className="flex gap-2">
        <Input readOnly value={mcpUrl} aria-label="EEF Learn MCP server URL" className="h-9 font-mono text-xs" />
        <CopyButton text={mcpUrl} label="Copy the server URL" />
      </div>
      <Tabs defaultValue="claude">
        <TabsList className="flex-wrap">
          {CLIENTS.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {CLIENTS.map((c) => (
          <TabsContent key={c.id} value={c.id} className="flex flex-col gap-3 pt-2">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-star-200">
              {c.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {c.snippet ? (
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg border border-night-800 bg-night-950 p-3 pr-24 font-mono text-xs text-star-200">
                  {c.snippet(mcpUrl)}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={c.snippet(mcpUrl)} label={`Copy the ${c.label} setup`} />
                </div>
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
      {apps.length ? (
        <div>
          <h3 className="text-sm font-medium text-star-100">Connected</h3>
          <ul className="mt-2 divide-y divide-night-800 rounded-lg border border-night-800">
            {apps.map((app) => (
              <li key={app.clientId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-star-100">{app.name}</p>
                  <p className="text-xs text-star-400">Since {new Date(app.connectedAt).toLocaleDateString()}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={removing === app.clientId}
                  onClick={() => void disconnect(app)}
                >
                  {removing === app.clientId ? "Disconnecting…" : "Disconnect"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

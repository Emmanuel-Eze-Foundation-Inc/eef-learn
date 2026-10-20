"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AI_PROVIDER_IDS, AI_PROVIDERS, aiKeyProblem, guessAiProvider, type AiProvider } from "@/lib/ai-providers";
import { send } from "@/lib/send";

import { Field } from "./section";

export function ModelKeyForm({
  initial,
  mock,
}: {
  initial: { provider: AiProvider; model: string | null } | null;
  mock: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [provider, setProvider] = useState<AiProvider>(initial?.provider ?? "openrouter");
  const [key, setKey] = useState("");
  const [model, setModel] = useState(initial?.model ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = AI_PROVIDERS[provider];
  const keepsKey = saved?.provider === provider;
  const dirty = Boolean(key) || provider !== saved?.provider || (model.trim() || null) !== (saved?.model ?? null);

  function applyKey(raw: string) {
    const next = raw.trim().replace(/\s+/g, "");
    setKey(next);
    setError(null);
    const guess = guessAiProvider(next);
    if (guess && guess !== provider && next.length > 8) setProvider(guess);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = key ? aiKeyProblem(provider, key) : keepsKey ? null : `Paste your ${meta.label} key.`;
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    try {
      const data = await send("/api/me/ai-key", "POST", { provider, key: key || undefined, model: model.trim() || undefined });
      setSaved({ provider: data.provider, model: data.model });
      setKey("");
      toast.success(`The course agent and tutor now run on your ${meta.label} key.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that key.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await send("/api/me/ai-key", "DELETE");
      setSaved(null);
      setKey("");
      setModel("");
      toast.success("Key removed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove the key.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
      <p className="text-sm text-star-400">
        {saved
          ? `Using your ${AI_PROVIDERS[saved.provider].label} key${saved.model ? ` with ${saved.model}` : ""}. No usage limits: your provider bills you directly.`
          : mock
            ? "This instance runs in mock mode, so the agent works without a key. Add one for a real model."
            : "No key yet."}
      </p>
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Field id="ai-provider" label="Provider">
          <Select
            value={provider}
            onValueChange={(v) => {
              setProvider(v as AiProvider);
              setError(null);
            }}
          >
            <SelectTrigger id="ai-provider" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDER_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {AI_PROVIDERS[id].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          id="ai-key"
          label="API key"
          hint={
            <>
              {meta.note}{" "}
              <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-aurora-400 hover:underline">
                Get a key <ExternalLink className="size-3" />
              </a>
            </>
          }
        >
          <Input
            id="ai-key"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={keepsKey ? "Saved. Paste a new key to replace it." : meta.placeholder}
            value={key}
            onChange={(e) => applyKey(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (!text) return;
              e.preventDefault();
              applyKey(text);
            }}
            className="h-9 font-mono text-xs"
          />
        </Field>
      </div>
      <Field id="ai-model" label="Model (optional)" hint={`Leave empty for ${meta.defaultModel}.`}>
        <Input
          id="ai-model"
          autoComplete="off"
          spellCheck={false}
          placeholder={meta.defaultModel}
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setError(null);
          }}
          className="h-9 font-mono text-xs sm:max-w-sm"
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-ember-300">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {pending ? "Saving…" : saved ? "Save changes" : "Save key"}
        </Button>
        {saved ? (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void remove()}>
            Remove key
          </Button>
        ) : null}
      </div>
    </form>
  );
}

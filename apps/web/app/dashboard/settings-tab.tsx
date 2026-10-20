"use client";

import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import type { DashboardData } from "@/lib/dashboard";
import { send } from "@/lib/send";

import { AccountSection, type LinkedAccount } from "./settings/account-section";
import { ConnectAiPanel } from "./settings/connect-ai-section";
import { DeleteAccountSection } from "./settings/delete-account-section";
import { ModelKeyForm } from "./settings/model-key-section";
import { ProfileSection } from "./settings/profile-section";
import { SettingsSection } from "./settings/section";
import { SessionsSection } from "./settings/sessions-section";
import { SignOutButton } from "./sign-out-button";

const noSubscribe = () => () => {};

async function fetchAccounts(): Promise<LinkedAccount[]> {
  const { data } = await authClient.listAccounts();
  return (data ?? []).map((a) => ({ id: a.id, providerId: a.providerId }));
}

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Sign-in and security" },
  { id: "sessions", label: "Devices" },
  { id: "privacy", label: "Privacy" },
  { id: "ai", label: "Your AI" },
  { id: "delete", label: "Delete account" },
];

function PrivacySection({ userId, initialPublic }: { userId: string; initialPublic: boolean }) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [saving, setSaving] = useState(false);
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const path = `/people/${userId}`;

  async function toggle(next: boolean) {
    setIsPublic(next);
    setSaving(true);
    try {
      await send("/api/me", "PATCH", { learningPathPublic: next });
      toast.success(next ? "Your learning path is public." : "Your learning path is private again.");
      router.refresh();
    } catch (err) {
      setIsPublic(!next);
      toast.error(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection id="privacy" title="Public learning path">
      <div className="flex items-start justify-between gap-6">
        <p id="path-help" className="max-w-[62ch] text-sm leading-relaxed text-star-400">
          Share a page with your profile, the public maps you&apos;re on, how far along you are, and what
          you&apos;ve finished. Private maps and requests never appear on it.
        </p>
        <Switch
          checked={isPublic}
          disabled={saving}
          onCheckedChange={(next) => void toggle(next)}
          aria-label="Make my learning path public"
          aria-describedby="path-help"
          className="mt-1"
        />
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {isPublic ? (
          <Input readOnly value={`${origin}${path}`} aria-label="Your public learning path link" className="h-9 font-mono text-xs" />
        ) : null}
        <div className="flex gap-2">
          {isPublic ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() =>
                void navigator.clipboard
                  .writeText(`${window.location.origin}${path}`)
                  .then(() => toast.success("Link copied."))
                  .catch(() => toast.error("Couldn't copy the link."))
              }
            >
              <Copy /> Copy
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline" className="h-9">
            <Link href={path}>
              <ExternalLink /> {isPublic ? "View" : "Preview"}
            </Link>
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}

export function SettingsTab({ data, mock, googleEnabled }: { data: DashboardData; mock: boolean; googleEnabled: boolean }) {
  const { user } = data;
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
  const [sessionsVersion, setSessionsVersion] = useState(0);

  const reloadAccounts = useCallback(() => void fetchAccounts().then(setAccounts), []);

  useEffect(() => {
    let live = true;
    void fetchAccounts().then((rows) => live && setAccounts(rows));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label="Settings" className="hidden lg:block">
        <ul className="sticky top-24 flex flex-col gap-0.5 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-lg px-3 py-2 text-star-400 transition-colors hover:bg-night-900 hover:text-star-100"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        <ProfileSection
          initial={{
            name: user.name,
            image: user.image,
            headline: user.headline,
            bio: user.bio,
            location: user.location,
            website: user.website,
          }}
        />
        <AccountSection
          email={user.email}
          emailVerified={user.emailVerified}
          googleEnabled={googleEnabled}
          accounts={accounts}
          onAccountsChange={reloadAccounts}
          onSessionsChange={() => setSessionsVersion((v) => v + 1)}
        />
        <SessionsSection key={sessionsVersion} />
        <PrivacySection userId={user.id} initialPublic={user.learningPathPublic} />
        <SettingsSection
          id="ai"
          title="Your AI"
          description="EEF Learn doesn't provide AI credits. The course agent and tutor run on your own model, with no usage limits."
        >
          <ConnectAiPanel mcpUrl={data.mcpUrl} apps={data.aiApps} />
          <div className="mt-6 border-t border-night-800 pt-6">
            <h3 className="text-sm font-medium text-star-100">Or bring a model key</h3>
            <p className="mt-1 mb-4 max-w-[62ch] text-sm leading-relaxed text-star-400">
              For Watch it build, the studio course agent and the tutor, which run here on your key.
            </p>
            <ModelKeyForm initial={data.ai} mock={mock} />
          </div>
        </SettingsSection>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-night-800 px-5 py-4 sm:px-6">
          <p className="text-sm text-star-400">Signed in as {user.email}</p>
          <div className="flex items-center gap-2">
            {user.isAdmin ? (
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/inquiries">Inquiries</Link>
              </Button>
            ) : null}
            <SignOutButton />
          </div>
        </div>
        <DeleteAccountSection
          email={user.email}
          createdMaps={data.created.length}
          hasPassword={Boolean(accounts?.some((a) => a.providerId === "credential"))}
        />
      </div>
    </div>
  );
}

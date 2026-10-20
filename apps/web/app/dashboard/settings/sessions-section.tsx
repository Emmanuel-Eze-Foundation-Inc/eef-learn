"use client";

import { Laptop, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

import { ago } from "../format";
import { SettingsSection } from "./section";

type DeviceSession = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  updatedAt: Date | string;
};

function describe(ua: string | null | undefined) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return { label: os ? `${browser} on ${os}` : browser, mobile: /Mobile|iPhone|Android/.test(ua) };
}

type Loaded = { sessions: DeviceSession[]; currentToken: string | null };

async function fetchSessions(): Promise<Loaded> {
  const [list, current] = await Promise.all([authClient.listSessions(), authClient.getSession()]);
  if (list.error) toast.error("Couldn't load your sessions.");
  const sessions = [...(list.data ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return { sessions, currentToken: current.data?.session.token ?? null };
}

function shownIp(ip: string | null | undefined) {
  if (!ip || /^[0:]+1?$/.test(ip) || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") return null;
  return ip;
}

export function SessionsSection() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(() => void fetchSessions().then(setLoaded), []);

  useEffect(() => {
    let live = true;
    void fetchSessions().then((next) => live && setLoaded(next));
    return () => {
      live = false;
    };
  }, []);

  async function revoke(token: string) {
    setPending(token);
    const { error } = await authClient.revokeSession({ token });
    setPending(null);
    if (error) return void toast.error("Couldn't sign that device out.");
    toast.success("Signed out of that device.");
    load();
  }

  async function revokeOthers() {
    setPending("others");
    const { error } = await authClient.revokeOtherSessions();
    setPending(null);
    if (error) return void toast.error("Couldn't sign out the other devices.");
    toast.success("Signed out everywhere else.");
    load();
  }

  const sessions = loaded?.sessions ?? null;
  const currentToken = loaded?.currentToken;
  const others = sessions?.filter((s) => s.token !== currentToken).length ?? 0;

  return (
    <SettingsSection
      id="sessions"
      title="Where you're signed in"
      description="Sign out of a device you don't recognize, or one you no longer use."
    >
      {sessions === null ? (
        <p className="text-sm text-star-400">Loading…</p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-night-800">
            {sessions.map((s) => {
              const device = describe(s.userAgent);
              const Icon = device.mobile ? Smartphone : Laptop;
              const isCurrent = s.token === currentToken;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="size-4 shrink-0 text-star-400" aria-hidden />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{device.label}</span>
                        {isCurrent ? <Badge variant="aurora">This device</Badge> : null}
                      </p>
                      <p className="truncate text-xs text-star-400">
                        {[shownIp(s.ipAddress), isCurrent ? "active now" : `active ${ago(new Date(s.updatedAt).toISOString())}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  {isCurrent ? null : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending !== null}
                      onClick={() => void revoke(s.token)}
                    >
                      {pending === s.token ? "Signing out…" : "Sign out"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {others > 1 ? (
            <div className="mt-4 flex justify-end border-t border-night-800 pt-4">
              <Button type="button" size="sm" variant="outline" disabled={pending !== null} onClick={() => void revokeOthers()}>
                {pending === "others" ? "Signing out…" : `Sign out of ${others} other devices`}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </SettingsSection>
  );
}

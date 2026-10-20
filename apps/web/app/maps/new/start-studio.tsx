"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function StartStudio({ topic }: { topic: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "blank", topic: topic.length >= 2 ? topic : undefined }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { slug?: string; error?: string } | null;
    if (!res?.ok || !body?.slug) {
      setError(body?.error ?? "Couldn't open the studio. Try again.");
      return;
    }
    router.replace(`/maps/${body.slug}/studio?mode=chat${topic.length >= 2 ? "&build=1" : ""}`);
  }, [router, topic]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  return (
    <main className="grid min-h-svh place-items-center bg-night-950 px-6 text-star-100">
      {error ? (
        <div className="max-w-sm text-center">
          <p className="text-base font-semibold">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button type="button" onClick={() => void start()}>
              Try again
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-star-400" role="status">
          <Loader2 className="size-4 animate-spin" />
          Opening the studio…
        </p>
      )}
    </main>
  );
}

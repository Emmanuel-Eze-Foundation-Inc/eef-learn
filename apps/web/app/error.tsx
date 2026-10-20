"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";

import { StrayPage } from "./components/stray-page";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <StrayPage
      mood="thinking"
      title="Something broke on our side"
      body="It's been reported, and your progress is saved. Try again, or head back and pick up where you left off."
      action={
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}

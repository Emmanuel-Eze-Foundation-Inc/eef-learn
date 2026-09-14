"use client";

import { useSearchParams } from "next/navigation";

import { safeNextPath } from "@/lib/paths";

import { AuthPanel } from "../../components/auth-dialog";

export function SignInClient({ googleEnabled }: { googleEnabled: boolean }) {
  const next = safeNextPath(useSearchParams().get("next"));
  return <AuthPanel googleEnabled={googleEnabled} next={next} intent="signin" />;
}

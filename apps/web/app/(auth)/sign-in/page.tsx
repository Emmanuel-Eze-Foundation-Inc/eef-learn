import { Suspense } from "react";

import { googleAuthEnabled } from "@/lib/auth";

import { SignInClient } from "./sign-in-client";

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="text-star-400">Loading sign in…</p>}>
      <SignInClient googleEnabled={googleAuthEnabled} />
    </Suspense>
  );
}

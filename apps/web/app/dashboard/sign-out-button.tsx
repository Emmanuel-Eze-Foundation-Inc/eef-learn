"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
      }}
      className="rounded-full border border-night-800 px-5 py-2 text-sm text-star-400 hover:border-star-400 hover:text-star-100"
    >
      Sign out
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";

import { useAuthDialog } from "./auth-dialog";

export function EnterMapButton({
  slug,
  signedIn,
  label = "Enter map",
  node,
  className = "rounded-full bg-aurora-400 px-5 py-2.5 text-sm font-semibold text-ink-900",
}: {
  slug: string;
  signedIn: boolean;
  label?: string;
  node?: string;
  className?: string;
}) {
  const router = useRouter();
  const dialog = useAuthDialog();
  const href = node ? `/maps/${slug}?node=${encodeURIComponent(node)}` : `/maps/${slug}`;

  return (
    <button
      type="button"
      onClick={() => {
        if (signedIn) {
          router.push(href);
          return;
        }
        dialog.open({ next: href, intent: "signin" });
      }}
      className={className}
    >
      {label}
    </button>
  );
}

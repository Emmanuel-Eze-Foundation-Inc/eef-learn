"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InquiryStatusButton({
  id,
  status,
}: {
  id: string;
  status: "open" | "closed";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const next = status === "open" ? "closed" : "open";

  async function toggle() {
    setPending(true);
    await fetch("/api/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="rounded-full border border-night-800 px-4 py-2 text-sm text-star-400 hover:border-star-400 hover:text-star-100 disabled:opacity-60"
    >
      {pending ? "Saving" : status === "open" ? "Mark closed" : "Reopen"}
    </button>
  );
}

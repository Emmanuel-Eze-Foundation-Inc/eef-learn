"use client";

import { useRouter } from "next/navigation";

/** Hero topic form: send the learner to map creation (sign-in if needed). */
export function LandingStartForm() {
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const topic = String(new FormData(e.currentTarget).get("topic") ?? "").trim();
    if (topic.length < 2) return;
    router.push(`/maps/new?topic=${encodeURIComponent(topic)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-9 flex items-center gap-2 rounded-2xl border border-night-800 bg-night-900 p-2"
    >
      <input
        name="topic"
        required
        minLength={2}
        maxLength={200}
        className="flex-1 bg-transparent px-4 py-3 text-star-100 outline-none placeholder:text-star-400"
        placeholder="What do you want to learn?"
        aria-label="What do you want to learn?"
      />
      <button type="submit" className="rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900">
        Watch it build
      </button>
    </form>
  );
}

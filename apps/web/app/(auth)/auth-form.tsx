"use client";

/** Shared Aurora-styled form primitives for the auth pages (ticket T2). */

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-night-800 bg-night-900 px-4 py-3 text-star-100 outline-none placeholder:text-star-400 focus:border-aurora-400 [color-scheme:dark]"
    />
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-aurora-400 px-6 py-3.5 font-semibold text-ink-900 transition-opacity disabled:opacity-60"
    >
      {pending ? "One moment…" : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-3 text-sm text-ember-300">
      {message}
    </p>
  );
}

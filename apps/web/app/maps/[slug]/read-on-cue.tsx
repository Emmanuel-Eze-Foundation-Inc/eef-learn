function TrailMark({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="40"
      viewBox="0 0 22 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="4.5" r="3" fill="#0d1f18" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M11 8.5 V24"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeDasharray="2.5 3.5"
      />
      <path
        d="M4.5 22 L11 32 L17.5 22"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReadOnChrome({
  side,
  children,
}: {
  side: "top" | "bottom";
  children: React.ReactNode;
}) {
  const bottom = side === "bottom";
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center ${
        bottom ? "bottom-0 rounded-b-3xl pb-3 pt-16" : "top-0 rounded-t-3xl pb-14 pt-3"
      }`}
      style={{
        background: bottom
          ? "linear-gradient(to top, #0d1f18 0%, #0d1f18 58%, rgba(13,31,24,0) 100%)"
          : "linear-gradient(to bottom, #0d1f18 0%, #0d1f18 58%, rgba(13,31,24,0) 100%)",
      }}
    >
      {children}
    </div>
  );
}

/** Waypath drip: this plate still has trail below (or above). */
export function ReadOnCue({
  direction,
  mode,
}: {
  direction: "up" | "down";
  mode: "more" | "leave";
}) {
  const down = direction === "down";
  const mark = (
    <TrailMark className="motion-safe:animate-[read-on_1.8s_var(--ease-in-out)_infinite] motion-reduce:opacity-90" />
  );

  if (mode === "leave") {
    return (
      <div className="relative flex flex-col items-center text-aurora-400">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(52,217,140,0.22) 0%, rgba(52,217,140,0) 70%)",
          }}
        />
        {!down && <span className="rotate-180">{mark}</span>}
        <p className="relative font-mono text-[10px] uppercase tracking-[0.18em] text-aurora-400">
          {down ? "one more scroll continues" : "one more scroll goes back"}
        </p>
        {down && mark}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center text-aurora-400">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(52,217,140,0.22) 0%, rgba(52,217,140,0) 70%)",
        }}
      />
      {!down && <span className="rotate-180">{mark}</span>}
      <span className="relative font-mono text-[10px] uppercase tracking-[0.18em] text-aurora-400">
        keep reading
      </span>
      {down && mark}
    </div>
  );
}

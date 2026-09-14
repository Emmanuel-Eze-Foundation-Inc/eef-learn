/** Foramen on the plate edge: the waypath sockets into the lesson. */
export function SpineSocket({
  side,
  terminus,
  alive = false,
}: {
  side: "left" | "right";
  terminus?: "start" | "end";
  alive?: boolean;
}) {
  const left = side === "left";
  const stroke =
    terminus === "start"
      ? "var(--star-100)"
      : terminus === "end" || left
        ? "var(--gold-400)"
        : "var(--aurora-400)";
  const dash = !left && terminus !== "end" ? "7 11" : undefined;

  return (
    <svg
      width="88"
      height="132"
      viewBox="0 0 88 132"
      fill="none"
      className={`pointer-events-none absolute top-1/2 z-10 ${
        alive ? "motion-safe:animate-[socket-earn_620ms_var(--ease-out)_both]" : ""
      }`}
      style={{
        [left ? "left" : "right"]: 0,
        transform: left
          ? "translate(-50%, -50%)"
          : "translate(50%, -50%) scaleX(-1)",
      }}
      aria-hidden="true"
    >
      <path
        d="M0 66 H32"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={dash}
      />
      {terminus === "start" ? (
        <>
          <path d="M8 52 V80" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <circle cx="40" cy="66" r="13" fill="var(--night-950)" />
          <circle cx="40" cy="66" r="13" stroke={stroke} strokeWidth="2.4" />
          <circle cx="40" cy="66" r="4.5" fill={stroke} />
        </>
      ) : terminus === "end" ? (
        <path
          d="M40 46 L43.2 62.8 L60 66 L43.2 69.2 L40 86 L36.8 69.2 L20 66 L36.8 62.8 Z"
          fill="var(--gold-400)"
          stroke="var(--gold-400)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <circle cx="40" cy="66" r="11" fill="var(--night-950)" />
          <circle cx="40" cy="66" r="11" stroke={stroke} strokeWidth="2.2" />
          <circle cx="40" cy="66" r="4" fill={stroke} />
        </>
      )}
    </svg>
  );
}

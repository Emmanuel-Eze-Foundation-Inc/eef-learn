/**
 * Foundation primary mark: gold star on an emerald badge. The aurora ring is
 * night-only (Figma 05 Lockups), so it reads from `--eef-ring` per theme.
 */
export function EefBadge({
  shape = "square",
  className,
}: {
  shape?: "square" | "circle";
  className?: string;
}) {
  const circle = shape === "circle";
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect width="64" height="64" rx={circle ? 32 : 18} fill="#0E7A55" />
      <rect
        x="6.625"
        y="6.625"
        width="50.75"
        height="50.75"
        rx={circle ? 25.375 : 13.375}
        stroke="var(--eef-ring)"
        strokeWidth="1.25"
      />
      <path
        d="M32 15L36.2992 26.7008L48 31L36.2992 35.2992L32 47L27.7008 35.2992L16 31L27.7008 26.7008L32 15Z"
        fill="#F2C14E"
      />
    </svg>
  );
}

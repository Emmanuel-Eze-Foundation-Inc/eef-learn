/** Foundation primary mark: gold star in an aurora-ringed emerald badge. */
export function EefBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#0E7A55" />
      <rect
        x="6.625"
        y="6.625"
        width="50.75"
        height="50.75"
        rx="13.375"
        stroke="#34D98C"
        strokeWidth="1.25"
      />
      <path
        d="M32 15L36.2992 26.7008L48 31L36.2992 35.2992L32 47L27.7008 35.2992L16 31L27.7008 26.7008L32 15Z"
        className="fill-gold-400"
      />
    </svg>
  );
}

/** The Waypath mark: three nodes + the next star, lit (BRAND.md §2). */
export function WaypathMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 22 L11 13 L17 17 L24 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 4 L23.2 7.2 L26 8.4 L23.2 9.6 L22 12.8 L20.8 9.6 L18 8.4 L20.8 7.2 Z"
        className="fill-gold-400"
      />
    </svg>
  );
}

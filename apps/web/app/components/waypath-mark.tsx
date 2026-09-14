/** EEF Learn waypath: three nodes on a rising route, gold star at the head. Path follows currentColor (night/day). */
export function WaypathMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 66 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 54 L22 28 L39 41 L50 16"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="54" r="4.5" fill="currentColor" />
      <circle cx="22" cy="28" r="4.5" fill="currentColor" />
      <circle cx="39" cy="41" r="4.5" fill="currentColor" />
      <path
        d="M54 2L56.9557 10.0443L65 13L56.9557 15.9557L54 24L51.0443 15.9557L43 13L51.0443 10.0443L54 2Z"
        className="fill-gold-400"
      />
    </svg>
  );
}

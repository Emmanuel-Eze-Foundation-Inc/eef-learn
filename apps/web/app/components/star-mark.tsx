/** Shared gold north star. Tiny sizes and the badge interior. */
export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 0L30.4488 17.5512L48 24L30.4488 30.4488L24 48L17.5512 30.4488L0 24L17.5512 17.5512L24 0Z"
        className="fill-gold-400"
      />
    </svg>
  );
}

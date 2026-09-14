/**
 * Hero constellation — static SVG version of the map language (BRAND.md §5).
 * Gold = mastered (earned), aurora = you-are-here (offered), dashed = locked.
 */
export function Constellation({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 520" fill="none" className={className} aria-hidden="true">
      {/* dust */}
      <g className="fill-star-400" opacity="0.35">
        <circle cx="40" cy="60" r="1.2" />
        <circle cx="120" cy="30" r="1" />
        <circle cx="210" cy="90" r="1.4" />
        <circle cx="330" cy="40" r="1" />
        <circle cx="470" cy="70" r="1.3" />
        <circle cx="560" cy="120" r="1" />
        <circle cx="70" cy="200" r="1" />
        <circle cx="520" cy="250" r="1.2" />
        <circle cx="60" cy="420" r="1.3" />
        <circle cx="180" cy="480" r="1" />
        <circle cx="400" cy="490" r="1.2" />
        <circle cx="540" cy="430" r="1" />
      </g>
      {/* edges */}
      <g className="stroke-star-400" strokeWidth="1.4" opacity="0.5">
        <path d="M120 400 L230 330" />
        <path d="M230 330 L200 210" />
        <path d="M230 330 L360 360" />
        <path d="M360 360 L450 260" />
        <path d="M200 210 L320 140" />
        <path d="M450 260 L320 140" />
        <path d="M320 140 L440 90" />
      </g>
      {/* traveled path (gold) */}
      <g className="stroke-gold-400" strokeWidth="2" opacity="0.9">
        <path d="M120 400 L230 330" />
        <path d="M230 330 L200 210" />
      </g>
      {/* mastered stars */}
      <g className="fill-gold-400">
        <path d="M120 388 L124 398 L134 402 L124 406 L120 416 L116 406 L106 402 L116 398 Z" />
        <path d="M230 318 L234 328 L244 332 L234 336 L230 346 L226 336 L216 332 L226 328 Z" />
      </g>
      {/* current node (aurora halo) */}
      <circle
        cx="200"
        cy="210"
        r="22"
        className="origin-[200px_210px] stroke-aurora-400 motion-safe:animate-[aurora-halo_3.2s_cubic-bezier(0.23,1,0.32,1)_infinite]"
        strokeWidth="1.4"
        opacity="0.5"
      />
      <circle cx="200" cy="210" r="9" className="fill-aurora-400" />
      {/* upcoming */}
      <circle cx="360" cy="360" r="7" className="fill-star-100" opacity="0.9" />
      <circle cx="320" cy="140" r="24" className="stroke-gold-400" strokeWidth="1.6" opacity="0.7" />
      <circle cx="320" cy="140" r="8" className="stroke-star-100" strokeWidth="1.8" />
      <circle cx="450" cy="260" r="7" className="stroke-star-400" strokeWidth="1.6" />
      {/* locked */}
      <circle cx="440" cy="90" r="7" className="stroke-star-400" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
    </svg>
  );
}

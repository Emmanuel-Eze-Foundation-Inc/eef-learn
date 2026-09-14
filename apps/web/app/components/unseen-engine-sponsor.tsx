const UNSEEN_ENGINE_URL = "https://myunseenengine.com";
const LOGO_SRC = "/sponsors/unseen-engine-logo.png";

/**
 * Studio ad for Unseen Engine. Paper on night so it cannot be mistaken
 * for product UI. Uses the official mark. CTA is ink, never gold.
 */
export function UnseenEngineSponsor({
  variant = "card",
}: {
  variant?: "card" | "tile" | "footer" | "billboard" | "official" | "official-footer";
}) {
  if (variant === "official") {
    return (
      <a
        href={UNSEEN_ENGINE_URL}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col gap-5 rounded-[20px] border border-night-800 bg-night-900 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8"
      >
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#0f1d17] sm:size-24">
          <img
            src={LOGO_SRC}
            alt="Unseen Engine"
            width={96}
            height={96}
            className="size-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold">Unseen Engine</p>
          <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-[#3e4a43]">
            Official sponsor of EEF Learn. The studio designs, builds, and stays on the systems
            behind the maps, so the foundation can keep them open.
          </p>
          <span className="mt-4 inline-flex text-sm font-semibold text-aurora-400">
            Visit Unseen Engine
          </span>
        </div>
      </a>
    );
  }

  if (variant === "official-footer") {
    return (
      <a
        href={UNSEEN_ENGINE_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400 hover:text-star-100"
      >
        <img
          src={LOGO_SRC}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] rounded-sm"
        />
        Official sponsor: Unseen Engine
      </a>
    );
  }

  if (variant === "footer") {
    return (
      <a
        href={UNSEEN_ENGINE_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400 hover:text-star-100"
      >
        <span className="rounded-sm bg-star-100/10 px-1.5 py-0.5 text-[9px] tracking-[0.16em] text-star-100">
          Ad
        </span>
        <img
          src={LOGO_SRC}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] rounded-sm"
        />
        Unseen Engine
      </a>
    );
  }

  const copy = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c47a5a]">
        Build your product.
      </p>
      <p className="mt-2 text-[15px] font-semibold leading-snug text-[#0f1d17]">
        Custom apps. AI-powered workflows. Scale without friction.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#4a5a50]">
        The engineering studio that designs, builds, and maintains the systems behind this map. Free
        your team to grow.
      </p>
      <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0f1d17] px-5 py-2.5 text-sm font-semibold text-[#f7f5ef]">
        Book a strategy call
        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs" aria-hidden="true">
          ↗
        </span>
      </span>
    </>
  );

  if (variant === "billboard") {
    return (
      <a
        href={UNSEEN_ENGINE_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Ad. Unseen Engine. Book a strategy call at myunseenengine.com"
        className="flex flex-col overflow-hidden rounded-[1.75rem] bg-[#f7f5ef] shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 ring-black/5 sm:flex-row"
      >
        <div className="relative w-full shrink-0 bg-black sm:w-56">
          <img
            src={LOGO_SRC}
            alt="Unseen Engine"
            width={512}
            height={512}
            className="h-44 w-full object-contain object-center sm:h-full"
          />
          <span className="absolute right-3 top-3 rounded-sm bg-[#f7f5ef] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#0f1d17]">
            Ad
          </span>
        </div>
        <div className="p-7 sm:py-8">{copy}</div>
      </a>
    );
  }

  if (variant === "tile") {
    return (
      <a
        href={UNSEEN_ENGINE_URL}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-2xl bg-[#f7f5ef] shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 ring-black/5"
      >
        <div className="relative bg-black">
          <img
            src={LOGO_SRC}
            alt="Unseen Engine"
            width={512}
            height={512}
            className="h-56 w-full object-cover object-center"
          />
          <span className="absolute right-3 top-3 rounded-sm bg-[#f7f5ef] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#0f1d17]">
            Ad
          </span>
        </div>
        <div className="p-8 pt-6">{copy}</div>
      </a>
    );
  }

  return (
    <a
      href={UNSEEN_ENGINE_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Ad. Unseen Engine. Book a strategy call at myunseenengine.com"
      className="block overflow-hidden rounded-2xl bg-[#f7f5ef] shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
    >
      <div className="relative bg-black">
          <img
            src={LOGO_SRC}
            alt=""
            width={512}
            height={512}
            className="h-52 w-full object-cover object-center"
          />
        <span className="absolute right-3 top-3 rounded-sm bg-[#f7f5ef] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#0f1d17]">
          Ad
        </span>
      </div>
      <div className="p-6 pt-5">{copy}</div>
    </a>
  );
}

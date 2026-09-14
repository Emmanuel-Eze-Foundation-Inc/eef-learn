"use client";

import { useEffect } from "react";

export function XTimeline() {
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-eef-twitter]");
    if (existing) {
      const twttr = (window as Window & { twttr?: { widgets?: { load: () => void } } }).twttr;
      twttr?.widgets?.load();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.dataset.eefTwitter = "";
    document.body.appendChild(script);
  }, []);

  return (
    <div className="overflow-hidden rounded-[20px] border border-night-800 bg-night-900">
      <a
        className="twitter-timeline block px-5 py-4 text-sm font-semibold text-aurora-400"
        data-height="480"
        data-theme="light"
        data-chrome="noheader nofooter noborders transparent"
        href="https://twitter.com/emmanuelezef"
      >
        See posts on X
      </a>
    </div>
  );
}

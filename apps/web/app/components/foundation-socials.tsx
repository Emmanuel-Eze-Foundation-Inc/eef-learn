import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  MediumLogo,
  XLogo,
} from "@phosphor-icons/react/ssr";
import type { ComponentType } from "react";

import { FOUNDATION_SOCIALS } from "@/lib/foundation";
import type { FoundationPost } from "@/lib/foundation-feed";

import { XTimeline } from "./x-timeline";

const icons: Record<(typeof FOUNDATION_SOCIALS)[number]["name"], ComponentType<{ className?: string; weight?: "regular" | "bold" }>> = {
  Instagram: InstagramLogo,
  X: XLogo,
  Facebook: FacebookLogo,
  LinkedIn: LinkedinLogo,
  Medium: MediumLogo,
};

export function FoundationSocials({ posts }: { posts: FoundationPost[] }) {
  return (
    <aside id="follow" className="min-w-0 scroll-mt-24">
      <h2 className="text-[28px] font-bold tracking-[-0.02em] sm:text-[34px]">Follow the work</h2>
      <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-[#3e4a43]">
        Real posts from the foundation accounts. Nothing here is invented for the page.
      </p>
      <SocialLinkRow />
      {posts.length > 0 ? (
        <ol className="mt-8">
          {posts.map((post) => (
            <li key={post.href} className="border-t border-night-800 py-4 first:border-t-0 first:pt-0">
              <a
                href={post.href}
                target="_blank"
                rel="noreferrer"
                className="text-[17px] font-semibold leading-snug hover:text-aurora-400"
              >
                {post.title}
              </a>
              {post.dateLabel ? (
                <p className="mt-1 font-mono text-[12px] text-star-400">{post.dateLabel} · Medium</p>
              ) : (
                <p className="mt-1 font-mono text-[12px] text-star-400">Medium</p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 text-sm text-[#3e4a43]">
          Writing will land here when a post is live. The accounts above are current.
        </p>
      )}
      <div className="mt-8">
        <XTimeline />
      </div>
    </aside>
  );
}

export function SocialLinkRow({ tone = "paper" }: { tone?: "paper" | "night" }) {
  const color = tone === "night" ? "text-star-400 hover:text-star-100" : "text-star-100 hover:text-aurora-400";
  return (
    <ul className="mt-6 flex flex-wrap gap-2">
      {FOUNDATION_SOCIALS.map((social) => {
        const Icon = icons[social.name];
        return (
          <li key={social.name}>
            <a
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 rounded-full border border-night-800 px-3.5 py-2 text-sm font-medium ${color}`}
            >
              <Icon className="h-4 w-4" weight="bold" />
              {social.name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

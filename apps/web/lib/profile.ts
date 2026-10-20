import { z } from "zod";

export const PROFILE_LIMITS = { name: 80, headline: 90, bio: 280, location: 60, website: 200 } as const;

/** Avatars are cropped and resized in the browser, so a stored data URL stays small. */
export const AVATAR_SIZE = 256;
const MAX_AVATAR_CHARS = 400_000;
const AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export type Profile = {
  name: string;
  image: string | null;
  headline: string;
  bio: string;
  location: string;
  website: string;
};

const trimmed = (max: number) => z.string().trim().max(max);

const website = trimmed(PROFILE_LIMITS.website).refine(
  (value) => value === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value),
  "Use a full link that starts with https://",
);

const avatar = z
  .string()
  .max(MAX_AVATAR_CHARS, "That photo is too large.")
  .refine((value) => AVATAR_DATA_URL.test(value) || /^https:\/\/[^\s]+$/.test(value), "That photo can't be used.")
  .nullable();

export const profileSchema = z.object({
  name: trimmed(PROFILE_LIMITS.name).min(1, "Add the name people will see."),
  headline: trimmed(PROFILE_LIMITS.headline),
  bio: trimmed(PROFILE_LIMITS.bio),
  location: trimmed(PROFILE_LIMITS.location),
  website,
  image: avatar,
});

export function normalizeWebsite(value: string) {
  const v = value.trim();
  if (!v || /^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

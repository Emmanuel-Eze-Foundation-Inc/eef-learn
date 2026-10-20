"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AVATAR_SIZE, normalizeWebsite, PROFILE_LIMITS, profileSchema, type Profile } from "@/lib/profile";
import { send } from "@/lib/send";

import { initials } from "../format";
import { Field, SettingsSection } from "./section";

/** Center-crops to a square and shrinks it, so the stored photo stays a few dozen KB. */
async function toAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't resize photos.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.86);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.86);
}

const FIELDS = ["name", "headline", "bio", "location", "website", "image"] as const;

export function ProfileSection({ initial }: { initial: Profile }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = FIELDS.some((key) => draft[key] !== saved[key]);
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    try {
      set("image", await toAvatar(file));
    } catch {
      setError("That photo couldn't be read. Try a JPG or PNG.");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...draft, website: normalizeWebsite(draft.website) };
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setPending(true);
    try {
      const next = (await send("/api/me", "PATCH", parsed.data)) as Profile;
      setSaved(next);
      setDraft(next);
      toast.success("Profile saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSection
      id="profile"
      title="Profile"
      description="How you appear on maps you publish, on access requests, and on your public learning path."
    >
      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="size-16 border border-night-800">
            {draft.image ? <AvatarImage src={draft.image} alt="" /> : null}
            <AvatarFallback className="bg-night-900 text-lg font-semibold">{initials(draft.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic"
              className="sr-only"
              aria-label="Upload a profile photo"
              onChange={(e) => {
                void pickPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Camera /> {draft.image ? "Change photo" : "Upload photo"}
            </Button>
            {draft.image ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => set("image", null)}>
                <Trash2 /> Remove
              </Button>
            ) : null}
          </div>
          <p className="basis-full text-xs text-star-400">A square crop of your photo is saved. JPG, PNG, or WebP.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="profile-name" label="Name" count={{ value: draft.name.length, max: PROFILE_LIMITS.name }}>
            <Input
              id="profile-name"
              value={draft.name}
              maxLength={PROFILE_LIMITS.name}
              autoComplete="name"
              required
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field id="profile-headline" label="Headline" count={{ value: draft.headline.length, max: PROFILE_LIMITS.headline }}>
            <Input
              id="profile-headline"
              value={draft.headline}
              maxLength={PROFILE_LIMITS.headline}
              placeholder="Learning data science, one map at a time"
              onChange={(e) => set("headline", e.target.value)}
            />
          </Field>
        </div>

        <Field id="profile-bio" label="Bio" count={{ value: draft.bio.length, max: PROFILE_LIMITS.bio }}>
          <Textarea
            id="profile-bio"
            value={draft.bio}
            maxLength={PROFILE_LIMITS.bio}
            rows={3}
            placeholder="What you're learning, what you build, what you can help others with."
            onChange={(e) => set("bio", e.target.value)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="profile-location" label="Location">
            <Input
              id="profile-location"
              value={draft.location}
              maxLength={PROFILE_LIMITS.location}
              autoComplete="address-level2"
              placeholder="Lagos, Nigeria"
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>
          <Field id="profile-website" label="Website">
            <Input
              id="profile-website"
              value={draft.website}
              maxLength={PROFILE_LIMITS.website}
              inputMode="url"
              autoComplete="url"
              placeholder="https://"
              onChange={(e) => set("website", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-night-800 pt-4">
          {error ? (
            <p role="alert" className="mr-auto text-sm text-ember-300">
              {error}
            </p>
          ) : null}
          <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={() => setDraft(saved)}>
            Discard
          </Button>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

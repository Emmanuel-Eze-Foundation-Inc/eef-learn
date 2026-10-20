import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, scryptSync } from "node:crypto";

import { prisma } from "@eef/db";

import { isAiProvider, type AiProvider } from "./ai-providers";
import { env } from "./env";

const PREFIX = "v1:";

function keyMaterial(): Buffer {
  // The salt predates other providers; changing it would orphan stored keys.
  return scryptSync(env.AUTH_SECRET, "eef-openrouter-key", 32);
}

/** Encrypt a user's model key for at-rest storage. */
export function encryptUserApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64url");
}

/** Decrypt a stored model key. Returns null if the blob is malformed. */
export function decryptUserApiKey(blob: string): string | null {
  if (!blob.startsWith(PREFIX)) return null;
  try {
    const buf = Buffer.from(blob.slice(PREFIX.length), "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** The user's own model: what every AI call on their behalf runs on. The platform has none. */
export type UserModel = { provider: AiProvider; key: string; model: string | null };

export async function getUserModel(userId: string): Promise<UserModel | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiKeyCipher: true, aiKeyProvider: true, aiKeyModel: true },
  });
  if (!user?.aiKeyCipher) return null;
  const key = decryptUserApiKey(user.aiKeyCipher);
  if (!key) return null;
  return { provider: isAiProvider(user.aiKeyProvider) ? user.aiKeyProvider : "openrouter", key, model: user.aiKeyModel };
}

/** A user model as stored in a GenerationJob payload: the key sealed, never plain. */
export type SealedUserModel = { provider: AiProvider; model: string | null; sealedKey: string };

const JOB_PREFIX = "j1:";

/**
 * Job rows sit in Postgres (and its backups) until they're cleaned up, so the key is sealed
 * with AI_SERVICE_TOKEN, a secret only the web and AI services hold. apps/ai unseals it and
 * drops it from the payload when the job finishes. Must match eef_ai.providers.chat.unseal_key.
 */
export function sealForJob(user: UserModel): SealedUserModel {
  const key = Buffer.from(hkdfSync("sha256", env.AI_SERVICE_TOKEN, "eef-job-key", "user-model v1", 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(user.key, "utf8"), cipher.final()]);
  const sealedKey = JOB_PREFIX + Buffer.concat([iv, enc, cipher.getAuthTag()]).toString("base64url");
  return { provider: user.provider, model: user.model, sealedKey };
}

/** What settings may show: never the key itself. */
export async function userModelSummary(userId: string): Promise<{ provider: AiProvider; model: string | null } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiKeyCipher: true, aiKeyProvider: true, aiKeyModel: true },
  });
  if (!user?.aiKeyCipher) return null;
  return { provider: isAiProvider(user.aiKeyProvider) ? user.aiKeyProvider : "openrouter", model: user.aiKeyModel };
}

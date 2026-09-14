import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { prisma } from "@eef/db";

import { env } from "./env";

const PREFIX = "v1:";

function keyMaterial(): Buffer {
  return scryptSync(env.AUTH_SECRET, "eef-openrouter-key", 32);
}

/** Encrypt a learner's OpenRouter key for at-rest storage. */
export function encryptUserApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64url");
}

/** Decrypt a stored OpenRouter key. Returns null if the blob is malformed. */
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

export function looksLikeOpenRouterKey(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("sk-or-") && trimmed.length >= 20 && trimmed.length <= 256;
}

export async function getUserApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openRouterKeyCipher: true },
  });
  if (!user?.openRouterKeyCipher) return null;
  return decryptUserApiKey(user.openRouterKeyCipher);
}

export async function userHasApiKey(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openRouterKeyCipher: true },
  });
  return Boolean(user?.openRouterKeyCipher);
}

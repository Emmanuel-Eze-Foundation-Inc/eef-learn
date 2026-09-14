import { parseEligibleBirthdate, MIN_AGE_YEARS } from "@eef/core";
import { prisma } from "@eef/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { sendEmail } from "./email";
import { env } from "./env";

export const googleAuthEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

function birthdateFromCookie(cookieHeader: string | null | undefined): Date | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|; )eef-birthdate=([^;]+)/);
  if (!match) return undefined;
  return parseEligibleBirthdate(decodeURIComponent(match[1])) ?? undefined;
}

/**
 * Better Auth server (ticket T1).
 * - email/password with verification (console/Mailpit in dev, SMTP in prod)
 * - AUTH_EMAIL_VERIFICATION=off escape hatch for local/self-host
 * - 13+ birthdate gate enforced server-side at email signup and via cookie on Google
 * - roles: user | admin (stored on User, default user)
 * - optional Google OAuth when GOOGLE_CLIENT_ID/SECRET are set
 */
export const auth = betterAuth({
  baseURL: env.AUTH_URL,
  secret: env.AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: env.AUTH_EMAIL_VERIFICATION === "on",
  },
  emailVerification: {
    sendOnSignUp: env.AUTH_EMAIL_VERIFICATION === "on",
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your EEF Learn account",
        text: `Welcome to EEF Learn! Verify your email to start your first learning map:\n\n${url}\n\nIf you didn't sign up, you can ignore this email.`,
      });
    },
  },
  socialProviders: googleAuthEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID as string,
          clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : undefined,
  user: {
    additionalFields: {
      birthdate: { type: "date", required: false, input: true },
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const cookieHeader =
            ctx && typeof ctx === "object" && "headers" in ctx
              ? (ctx.headers as Headers | undefined)?.get?.("cookie")
              : undefined;
          const fromCookie = birthdateFromCookie(cookieHeader);
          if (!fromCookie) return { data: user };
          return { data: { ...user, birthdate: fromCookie } };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const raw = (ctx.body as Record<string, unknown> | undefined)?.birthdate;
      const birthdate = typeof raw === "string" || raw instanceof Date ? parseEligibleBirthdate(String(raw)) : null;
      if (!birthdate) {
        throw new APIError("BAD_REQUEST", {
          message: `You must be at least ${MIN_AGE_YEARS} years old to create an EEF Learn account.`,
          code: "AGE_GATE",
        });
      }
      return { context: { ...ctx, body: { ...ctx.body, birthdate } } };
    }),
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
});

export type Session = typeof auth.$Infer.Session;

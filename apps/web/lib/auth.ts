import { parseEligibleBirthdate, MIN_AGE_YEARS } from "@eef/core";
import { prisma } from "@eef/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { sendEmail } from "./email";
import { env } from "./env";

/**
 * Better Auth server (ticket T1).
 * - email/password with verification (console/Mailpit in dev, SMTP in prod)
 * - AUTH_EMAIL_VERIFICATION=off escape hatch for local/self-host
 * - 13+ birthdate gate enforced server-side at signup
 * - roles: user | moderator | admin (stored on User, default user)
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
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  user: {
    additionalFields: {
      birthdate: { type: "date", required: true, input: true },
      role: { type: "string", required: false, defaultValue: "user", input: false },
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
      // Normalize to a Date so the adapter stores a proper timestamp.
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

import { parseEligibleBirthdate, MIN_AGE_YEARS } from "@eef/core";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { prisma } from "@eef/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { jwt } from "better-auth/plugins";

import { sendEmail } from "./email";
import { env } from "./env";

/** The MCP endpoint's canonical URL; OAuth access tokens are audience-bound to it. */
export const MCP_RESOURCE = `${env.AUTH_URL.replace(/\/$/, "")}/api/mcp`;
export const MCP_SCOPES = ["openid", "profile", "email", "offline_access"];

/** MCP OAuth needs an https origin; plain http works only on loopback, for local development. */
export const mcpEnabled = (() => {
  const { protocol, hostname } = new URL(env.AUTH_URL);
  return protocol === "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
})();

export const googleAuthEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

function birthdateFromCookie(cookieHeader: string | null | undefined): Date | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|; )eef-birthdate=([^;]+)/);
  if (!match) return undefined;
  return parseEligibleBirthdate(decodeURIComponent(match[1])) ?? undefined;
}

/**
 * Rows that point at a user without cascading. Maps go with their creator, unless another
 * person's map is built on one of them, which would break that map.
 */
async function deleteOwnedData(userId: string) {
  const borrowed = await prisma.mapComposition.count({
    where: { componentMap: { creatorId: userId }, parentMap: { creatorId: { not: userId } } },
  });
  if (borrowed) {
    throw new APIError("BAD_REQUEST", {
      message: "Someone else's map is built on one of yours. Make that map private, or ask us to transfer it, before deleting your account.",
      code: "MAP_IN_USE",
    });
  }
  const mapScope = { map: { creatorId: userId } };
  await prisma.$transaction([
    prisma.mapComposition.deleteMany({ where: { componentMap: { creatorId: userId } } }),
    prisma.companionThread.deleteMany({ where: mapScope }),
    prisma.coffeeChatRequest.deleteMany({ where: mapScope }),
    prisma.generationJob.deleteMany({ where: { OR: [{ userId }, mapScope] } }),
    prisma.updateProposal.deleteMany({ where: { learnerId: userId } }),
    prisma.map.deleteMany({ where: { creatorId: userId } }),
  ]);
}

/**
 * Better Auth server (ticket T1).
 * - email/password with verification (console/Mailpit in dev, SMTP in prod)
 * - AUTH_EMAIL_VERIFICATION=off escape hatch for local/self-host
 * - 13+ birthdate gate enforced server-side at email signup and via cookie on Google
 * - roles: user | admin (stored on User, default user)
 * - optional Google OAuth when GOOGLE_CLIENT_ID/SECRET are set
 * - OAuth 2.1 provider for MCP clients (Claude, ChatGPT, Cursor, Gemini): CIMD, plus DCR
 *   for clients that still register dynamically
 */
const extraOrigins = (env.AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  baseURL: env.AUTH_URL,
  secret: env.AUTH_SECRET,
  trustedOrigins: [env.AUTH_URL, ...extraOrigins],
  advanced: {
    useSecureCookies: env.AUTH_URL.startsWith("https://"),
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: env.AUTH_EMAIL_VERIFICATION === "on",
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your EEF Learn password",
        text: `Someone asked to reset the password on your EEF Learn account.\n\nIf that was you, choose a new one here (the link works for one hour):\n\n${url}\n\nIf it wasn't, ignore this email and your password stays as it is.`,
      });
    },
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
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: env.AUTH_EMAIL_VERIFICATION !== "on",
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Confirm your new EEF Learn email",
          text: `Someone asked to change the email on your EEF Learn account to ${newEmail}.\n\nIf that was you, confirm here:\n\n${url}\n\nIf it wasn't, ignore this email and your account stays as it is.`,
        });
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await deleteOwnedData(user.id);
      },
    },
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
  disabledPaths: ["/token"],
  plugins: mcpEnabled ? mcpPlugins() : [],
});

function mcpPlugins() {
  return [
    jwt(),
    mcp({
      loginPage: "/sign-in",
      consentPage: "/connect/consent",
      resource: MCP_RESOURCE,
      scopes: MCP_SCOPES,
      resources: [{ identifier: MCP_RESOURCE, allowedScopes: MCP_SCOPES }],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultApplicationType: "infer",
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
  ];
}

export type Session = typeof auth.$Infer.Session;

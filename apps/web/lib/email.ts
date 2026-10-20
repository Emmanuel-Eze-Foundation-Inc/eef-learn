import nodemailer from "nodemailer";

import { env } from "./env";

const transport = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;

/**
 * Send an email via SMTP_URL (Mailpit locally, Resend in prod).
 * Without SMTP_URL on a local http instance, log the content to the server console so
 * contributors never need an email provider to sign up. On https the content holds live
 * sign-in and reset links, so it never goes to the log.
 */
export async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<void> {
  if (!transport && env.AUTH_URL.startsWith("https://")) {
    console.error(`[eef-learn email] not sent: SMTP_URL is unset (subject=${opts.subject})`);
    return;
  }
  if (!transport) {
    console.log(
      `\n[eef-learn email] to=${opts.to}\n[eef-learn email] subject=${opts.subject}\n[eef-learn email] ${opts.text}\n`,
    );
    return;
  }
  await transport.sendMail({ from: env.EMAIL_FROM, ...opts });
}

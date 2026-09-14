import nodemailer from "nodemailer";

import { env } from "./env";

const transport = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;

/**
 * Send an email via SMTP_URL (Mailpit locally, real SMTP in prod).
 * Without SMTP_URL, log the content to the server console — the documented
 * dev story so contributors never need an email provider to sign up.
 */
export async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<void> {
  if (!transport) {
    console.log(
      `\n[eef-learn email] to=${opts.to}\n[eef-learn email] subject=${opts.subject}\n[eef-learn email] ${opts.text}\n`,
    );
    return;
  }
  await transport.sendMail({ from: env.EMAIL_FROM, ...opts });
}

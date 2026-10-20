import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = { title: "Privacy policy · EEF Learn" };

export default function PrivacyPage() {
  return (
    <LegalPage title="How we handle your information" updated="20 October 2026">
      <p>
        EEF Learn is run by the Emmanuel Eze Foundation, a nonprofit at 216 T Street, Washington, DC. We collect the
        least we need to run it, and we do not sell or rent personal data.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your account: name, email, a hash of your password (never the password), and your birthdate, used only for the 13+ age rule. If you sign in with Google, we receive your name, email and picture from Google.</li>
        <li>Your learning: the maps you create or join, your progress, your public learning path if you turn it on, access requests, and your chats with the tutor.</li>
        <li>Your AI connections: a model key you add is encrypted before it is stored. Apps you connect (Claude, ChatGPT, Cursor, Gemini) are listed in Settings with the access you granted, and you can disconnect them there.</li>
        <li>Foundation forms: what you send when you offer a partnership, volunteer to lead a series or host an event.</li>
        <li>Running the service: sign-in sessions with their device and IP address, and error reports when something breaks.</li>
      </ul>

      <h2>Your model key and AI providers</h2>
      <p>
        EEF Learn has no AI of its own and sells no credits. When you use the tutor or the course agent, your request and
        the course content it needs go to the provider you chose (OpenRouter, OpenAI, Anthropic or Google) using your
        key, and that provider&apos;s terms and privacy policy apply to it. We send your key only to that provider, and
        a key attached to a background job is sealed and removed when the job finishes.
      </p>

      <h2>Who else handles your data</h2>
      <p>These companies run parts of EEF Learn for us and only process data to do that:</p>
      <ul>
        <li>Vercel (the website) and Google Cloud (the course agent and tutor service), in the United States.</li>
        <li>Neon (the database), in the United States.</li>
        <li>Resend (account emails such as verification and password reset).</li>
        <li>Sentry (error reports, which can include your account ID and the page you were on).</li>
        <li>YouTube shows lesson videos from its privacy-enhanced domain; Google applies its own policy when you play one.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use a sign-in cookie, a cookie that remembers your light or dark theme, and, only while you create an account
        with Google, a ten-minute cookie holding your birthdate. We use no advertising or tracking cookies.
      </p>

      <h2>What you can see and others can&apos;t</h2>
      <ul>
        <li>A published public map shows its content and your display name. A private map is visible only to you and the people you approve.</li>
        <li>Your learning path is private unless you make it public in Settings.</li>
        <li>We do not use your maps or chats to train AI models.</li>
      </ul>

      <h2>Keeping and deleting</h2>
      <p>
        We keep your data while your account is open. Deleting your account in Settings removes your account, the maps
        you made, your progress, chats, keys and connected apps from the live service. Deleted data is kept in our
        backups and is stored forever.
      </p>
      <p>
        To get a copy of your data or ask a question about it, email{" "}
        <a href="mailto:admin@emmanuelezefoundation.org">admin@emmanuelezefoundation.org</a>.
      </p>

      <h2>Learners aged 13 to 17</h2>
      <p>
        EEF Learn is for people 13 and older. We do not knowingly hold accounts for anyone younger, and we close any we
        find. We do not send a separate notice for learners aged 13 to 17.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that matters, we&apos;ll tell you in the app before it takes effect. See also the{" "}
        <Link href="/terms">Terms of use</Link> and the <Link href="/age-policy">age policy</Link>.
      </p>
    </LegalPage>
  );
}

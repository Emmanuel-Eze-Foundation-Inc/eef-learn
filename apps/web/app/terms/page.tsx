import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, ToConfirm } from "../components/legal-page";

export const metadata: Metadata = { title: "Terms of use · EEF Learn" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="20 October 2026">
      <p>
        EEF Learn is a free learning service run by the Emmanuel Eze Foundation (&ldquo;we&rdquo;). By creating an
        account or using it, you agree to these terms and to the <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 13 or older. The birthdate you give must be true.</li>
        <li>Keep your password and model key to yourself. You are responsible for what happens under your account and on your key.</li>
        <li>You can delete your account at any time in Settings.</li>
      </ul>

      <h2>What you make</h2>
      <ul>
        <li>The maps, lessons and other content you create stay yours.</li>
        <li>When you publish a map publicly, you let us show it to anyone and let other learners travel it and build on it in EEF Learn. A private map is shown only to people you approve.</li>
        <li>Only publish what you have the right to share. Link to videos and articles instead of copying them, and credit sources.</li>
      </ul>

      <h2>AI features use your own provider</h2>
      <p>
        The tutor and course agent run on the model key or AI app you connect. Your provider bills you directly and its
        terms apply. AI output can be wrong: check what it writes before you publish or rely on it. We set no usage
        limits on your key and sell no AI credits.
      </p>

      <h2>Please don&apos;t</h2>
      <ul>
        <li>Publish anything illegal, hateful, sexual, violent toward others, or that targets a person.</li>
        <li>Share someone else&apos;s personal information or work without their permission.</li>
        <li>Try to break, overload or get around the security of the service, or use it to send spam.</li>
      </ul>
      <p>We may remove content or close accounts that break these rules. We&apos;ll tell you why when we can.</p>

      <h2>The service</h2>
      <p>
        EEF Learn is provided as it is, without guarantees that it will always be available or free of errors. To the
        extent the law allows, the foundation is not liable for losses from using it. The code is open source under its
        own licence. <ToConfirm>limitation of liability wording and governing law</ToConfirm>
      </p>

      <h2>Changes and contact</h2>
      <p>
        If these terms change in a way that matters, we&apos;ll tell you in the app before it takes effect. Questions:{" "}
        <a href="mailto:admin@emmanuelezefoundation.org">admin@emmanuelezefoundation.org</a>.
      </p>
    </LegalPage>
  );
}

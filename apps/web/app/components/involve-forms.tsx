"use client";

import { useState, type FormEvent } from "react";

type Kind = "partnership" | "volunteer";
type Status = "idle" | "submitting" | "ok" | "error";

const field =
  "w-full rounded-xl border border-night-800 bg-night-900 px-4 py-3 text-star-100 outline-none placeholder:text-star-400 focus:border-aurora-400";
const label = "mb-2 block text-sm font-medium";

export function InvolveForms() {
  const [tab, setTab] = useState<Kind>("partnership");

  return (
    <div className="mt-12">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Get involved">
        <TabButton current={tab} id="partnership" onSelect={setTab}>
          Partner with us
        </TabButton>
        <TabButton current={tab} id="volunteer" onSelect={setTab}>
          Volunteer
        </TabButton>
      </div>
      {tab === "partnership" ? <PartnershipForm /> : <VolunteerForm />}
    </div>
  );
}

function TabButton({
  current,
  id,
  onSelect,
  children,
}: {
  current: Kind;
  id: Kind;
  onSelect: (id: Kind) => void;
  children: string;
}) {
  const selected = current === id;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(id)}
      className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold sm:flex-none sm:px-5 ${
        selected ? "bg-aurora-400 text-ink-900" : "border border-night-800 text-star-100"
      }`}
    >
      {children}
    </button>
  );
}

function PartnershipForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("submitting");
    setError("");
    const result = await postInquiry({
      kind: "partnership",
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      organization: String(data.get("organization") ?? ""),
      context: String(data.get("context") ?? ""),
      message: String(data.get("message") ?? ""),
      website: String(data.get("website") ?? ""),
    });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setStatus("ok");
    form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid w-full gap-5" noValidate>
      <p className="text-[#3e4a43]">
        Schools, companies, cities, and labs that want to host maps, series, or space.
      </p>
      <Honeypot />
      <Field id="p-name" name="name" label="Name" required />
      <Field id="p-email" name="email" label="Email" type="email" required />
      <Field id="p-org" name="organization" label="Organization" required />
      <div>
        <label htmlFor="p-context" className={label}>
          How you want to partner
        </label>
        <select id="p-context" name="context" required className={field} defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          <option value="host-space">Host space or tools</option>
          <option value="curriculum">Curriculum or mentors</option>
          <option value="distribution">Reach learners</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div>
        <label htmlFor="p-message" className={label}>
          Message
        </label>
        <textarea
          id="p-message"
          name="message"
          required
          minLength={8}
          maxLength={4000}
          rows={5}
          className={field}
        />
      </div>
      <FormStatus status={status} error={error} ok="Thanks. A person on the team will write back." />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-aurora-400 px-6 py-3 font-semibold text-ink-900 disabled:opacity-60 sm:w-fit"
      >
        {status === "submitting" ? "Sending" : "Send partnership note"}
      </button>
    </form>
  );
}

function VolunteerForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("submitting");
    setError("");
    const result = await postInquiry({
      kind: "volunteer",
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      volunteerIntent: String(data.get("volunteerIntent") ?? ""),
      context: String(data.get("context") ?? ""),
      message: String(data.get("message") ?? ""),
      website: String(data.get("website") ?? ""),
    });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setStatus("ok");
    form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid w-full gap-5" noValidate>
      <p className="text-[#3e4a43]">
        Lead a training series or host a community event, in person or online.
      </p>
      <Honeypot />
      <Field id="v-name" name="name" label="Name" required />
      <Field id="v-email" name="email" label="Email" type="email" required />
      <div>
        <label htmlFor="v-intent" className={label}>
          What you want to do
        </label>
        <select id="v-intent" name="volunteerIntent" required className={field} defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          <option value="lead_series">Lead a series</option>
          <option value="host_event">Host a community event</option>
        </select>
      </div>
      <Field
        id="v-context"
        name="context"
        label="City or format"
        placeholder="Lagos, Zoom, a library…"
        required
      />
      <div>
        <label htmlFor="v-message" className={label}>
          Message
        </label>
        <textarea
          id="v-message"
          name="message"
          required
          minLength={8}
          maxLength={4000}
          rows={5}
          className={field}
        />
      </div>
      <FormStatus status={status} error={error} ok="Thanks. We will write if there is a fit." />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-aurora-400 px-6 py-3 font-semibold text-ink-900 disabled:opacity-60 sm:w-fit"
      >
        {status === "submitting" ? "Sending" : "Offer to volunteer"}
      </button>
    </form>
  );
}

function Field({
  id,
  name,
  label: text,
  type = "text",
  required,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={field}
      />
    </div>
  );
}

function Honeypot() {
  return (
    <div className="hidden" aria-hidden="true">
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

function FormStatus({ status, error, ok }: { status: Status; error: string; ok: string }) {
  if (status === "ok") {
    return (
      <p className="text-sm text-aurora-400" role="status">
        {ok}
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="text-sm text-ember-500" role="alert">
        {error || "Something went wrong. Try again."}
      </p>
    );
  }
  return null;
}

async function postInquiry(body: Record<string, string>): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? "Could not send that. Try again." };
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }
}

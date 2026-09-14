import { prisma } from "@eef/db";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/admin";

import { LearnLockup } from "../../components/learn-lockup";
import { InquiryStatusButton } from "./inquiry-status-button";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");

  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="min-h-screen bg-night-950 px-8 py-6 text-star-100 lg:px-16">
      <nav className="flex items-center justify-between">
        <Link href="/learn" className="flex items-center">
          <LearnLockup />
        </Link>
        <Link href="/dashboard" className="text-sm text-star-400 hover:text-star-100">
          Dashboard
        </Link>
      </nav>

      <header className="mt-12">
        <h1 className="text-4xl font-bold tracking-tight">Inquiries</h1>
        <p className="mt-3 text-star-400">Partnership and volunteer notes from the foundation page.</p>
      </header>

      {inquiries.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-night-800 p-10 text-star-400">
          No notes yet.
        </p>
      ) : (
        <ul className="mt-10 space-y-5">
          {inquiries.map((row) => (
            <li key={row.id} className="rounded-2xl border border-night-800 bg-night-900 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-aurora-400">
                    {row.kind}
                    {row.volunteerIntent ? ` / ${row.volunteerIntent.replaceAll("_", " ")}` : ""}
                    {row.status === "closed" ? " / closed" : ""}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{row.name}</h2>
                  <p className="mt-1 text-sm text-star-400">{row.email}</p>
                </div>
                <InquiryStatusButton id={row.id} status={row.status} />
              </div>
              {row.organization ? (
                <p className="mt-4 text-sm text-star-400">Organization: {row.organization}</p>
              ) : null}
              {row.context ? <p className="mt-2 text-sm text-star-400">{row.context}</p> : null}
              <p className="mt-4 whitespace-pre-wrap leading-relaxed">{row.message}</p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
                {row.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

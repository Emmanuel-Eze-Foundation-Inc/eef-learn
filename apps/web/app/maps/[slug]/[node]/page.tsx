import { redirect } from "next/navigation";

/** Deep link into the travel world at this star. */
export default async function SectionRedirect({
  params,
}: {
  params: Promise<{ slug: string; node: string }>;
}) {
  const { slug, node } = await params;
  redirect(`/maps/${slug}?node=${encodeURIComponent(node)}`);
}

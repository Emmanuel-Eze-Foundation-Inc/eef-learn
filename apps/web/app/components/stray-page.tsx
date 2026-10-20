import Link from "next/link";

import { Owlbert, type OwlbertMood } from "@/components/learn/owlbert";
import { Button } from "@/components/ui/button";

/** Full-page dead end (404, crash) with Owlbert and a way back. */
export function StrayPage({
  title,
  body,
  mood = "idle",
  action,
}: {
  title: string;
  body: string;
  mood?: OwlbertMood;
  action?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-night-950 px-6 py-16 text-center text-star-100">
      <div className="flex max-w-md flex-col items-center">
        <Owlbert size={140} mood={mood} />
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">{title}</h1>
        <p className="mt-3 leading-relaxed text-pretty text-star-400">{body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {action}
          <Button asChild variant={action ? "secondary" : "default"}>
            <Link href="/learn">Back to Learn</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

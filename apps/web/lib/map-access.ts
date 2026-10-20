import { prisma } from "@eef/db";

type MapGate = { id: string; visibility: string; creatorId: string };

/** Who may travel a map: anyone if it's public, otherwise its creator and the learners they approved. */
export async function canTravel(map: MapGate, userId: string | null | undefined): Promise<boolean> {
  if (map.visibility === "public") return true;
  if (!userId) return false;
  if (map.creatorId === userId) return true;
  const access = await prisma.mapAccess.findUnique({
    where: { mapId_userId: { mapId: map.id, userId } },
    select: { status: true },
  });
  return access?.status === "approved";
}

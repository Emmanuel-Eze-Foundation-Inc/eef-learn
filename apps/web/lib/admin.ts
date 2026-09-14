import { prisma } from "@eef/db";

import { getSession } from "./session";

export async function getAdminUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user || user.role !== "admin") return null;
  return user;
}

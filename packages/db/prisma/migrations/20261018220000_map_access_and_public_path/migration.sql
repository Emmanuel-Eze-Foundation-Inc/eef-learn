-- Learners can opt in to a public learning path.
ALTER TABLE "User" ADD COLUMN "learningPathPublic" BOOLEAN NOT NULL DEFAULT false;

-- Private maps: learners request access, creators approve.
CREATE TYPE "AccessStatus" AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE "MapAccess" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AccessStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MapAccess_mapId_userId_key" ON "MapAccess"("mapId", "userId");
CREATE INDEX "MapAccess_userId_idx" ON "MapAccess"("userId");
CREATE INDEX "MapAccess_mapId_status_idx" ON "MapAccess"("mapId", "status");

ALTER TABLE "MapAccess" ADD CONSTRAINT "MapAccess_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MapAccess" ADD CONSTRAINT "MapAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

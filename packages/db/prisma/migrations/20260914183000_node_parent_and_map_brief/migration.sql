-- Nested lesson tree + creator interview brief.
ALTER TABLE "Map" ADD COLUMN "brief" JSONB;
ALTER TABLE "Node" ADD COLUMN "parentId" TEXT;

CREATE INDEX "Node_parentId_idx" ON "Node"("parentId");

ALTER TABLE "Node" ADD CONSTRAINT "Node_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- GenerationJob dedup (PLAN.md M1, eng E1):
-- a second tab / double-click attaches to the existing job's checkpoints
-- instead of double-spending. Partial unique index over active jobs only.
CREATE UNIQUE INDEX "GenerationJob_active_dedup"
  ON "GenerationJob" ("mapId", "nodeId", "blockIndex")
  WHERE "status" IN ('queued', 'running');

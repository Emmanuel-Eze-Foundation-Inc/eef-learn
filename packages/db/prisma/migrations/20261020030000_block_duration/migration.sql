-- Real media length (seconds) for video blocks, used for lesson and module time estimates.
ALTER TABLE "ContentBlock" ADD COLUMN "durationSeconds" INTEGER;

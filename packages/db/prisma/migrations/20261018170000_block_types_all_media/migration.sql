-- Lessons hold any content type, not just watch/read/check.
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'image';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'audio';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'embed';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'code';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'resource';

-- Recall beats: flashcards and knowledge checks (no scores stored).
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'flashcard';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'quiz';

ALTER TABLE "User" RENAME COLUMN "openRouterKeyCipher" TO "aiKeyCipher";
ALTER TABLE "User" ADD COLUMN "aiKeyProvider" TEXT;
ALTER TABLE "User" ADD COLUMN "aiKeyModel" TEXT;
UPDATE "User" SET "aiKeyProvider" = 'openrouter' WHERE "aiKeyCipher" IS NOT NULL;
DROP TABLE "Quota";

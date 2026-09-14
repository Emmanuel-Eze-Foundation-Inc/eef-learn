-- BYOK OpenRouter key (encrypted at rest) + optional birthdate for social signup.
ALTER TABLE "User" ALTER COLUMN "birthdate" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "openRouterKeyCipher" TEXT;

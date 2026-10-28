-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "requiresOutletPhoto";

-- CreateEnum
CREATE TYPE "RepRole" AS ENUM ('rep', 'admin', 'pran');

-- AlterTable
ALTER TABLE "Rep" ADD COLUMN "role" "RepRole" NOT NULL DEFAULT 'rep';

-- Backfill: any rep already flagged isAdmin keeps an equivalent role.
UPDATE "Rep" SET "role" = 'admin'::"RepRole" WHERE "isAdmin" = true;

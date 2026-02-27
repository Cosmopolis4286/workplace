-- AlterEnum
-- Rename old enum, create new one, migrate data, drop old

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER', 'NORMAL');

-- Migrate existing data: ADMIN → COMMERCE (they are restaurant owners), MANAGER/STAFF → NORMAL
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'COMMERCE'::"Role"
    WHEN 'MANAGER' THEN 'NORMAL'::"Role"
    WHEN 'STAFF' THEN 'NORMAL'::"Role"
    ELSE 'NORMAL'::"Role"
  END
);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'NORMAL'::"Role";

DROP TYPE "Role_old";

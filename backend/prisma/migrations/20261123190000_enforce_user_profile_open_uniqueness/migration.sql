-- Enforce profile activation invariants at the database boundary.
-- Historical REJECTED/SUSPENDED rows remain allowed; only PENDING/ACTIVE
-- rows participate in these partial unique indexes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "user_profiles"
    WHERE "status" IN ('PENDING', 'ACTIVE')
    GROUP BY "userId", "type"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce user profile uniqueness: duplicate PENDING/ACTIVE rows exist for the same user and profile type. Resolve duplicates before retrying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "user_profiles"
    WHERE "status" IN ('PENDING', 'ACTIVE')
      AND "type" IN ('BUSINESS', 'PROFESSIONAL')
    GROUP BY "userId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce BUSINESS/PROFESSIONAL exclusivity: users have multiple open business/professional profiles. Resolve conflicts before retrying this migration.';
  END IF;
END
$$;

-- One open profile per user and type. Historical REJECTED/SUSPENDED rows
-- are preserved and do not prevent a new application.
CREATE UNIQUE INDEX "user_profiles_userId_type_open_key"
  ON "user_profiles" ("userId", "type")
  WHERE "status" IN ('PENDING', 'ACTIVE');

-- BUSINESS and PROFESSIONAL are mutually exclusive, including PENDING
-- applications. This also serializes concurrent requests of different types.
CREATE UNIQUE INDEX "user_profiles_userId_business_professional_open_key"
  ON "user_profiles" ("userId")
  WHERE "status" IN ('PENDING', 'ACTIVE')
    AND "type" IN ('BUSINESS', 'PROFESSIONAL');

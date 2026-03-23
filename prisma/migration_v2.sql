-- Migration: displayName to firstName/lastName
-- Run this in your Supabase SQL Editor if you have existing users.

UPDATE "users" SET 
  "firstName" = SPLIT_PART("displayName", ' ', 1),
  "lastName" = SPLIT_PART("displayName", ' ', 2)
WHERE "displayName" IS NOT NULL AND ("firstName" = '' OR "firstName" IS NULL);

-- Verification
-- SELECT id, "displayName", "firstName", "lastName" FROM "users";

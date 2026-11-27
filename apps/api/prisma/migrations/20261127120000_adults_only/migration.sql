-- 18+ rule, enforced by the database as a last line of defence (the API
-- applies the exact rule on the member's local date before this).
-- Refuses any profile whose holder is not yet 18 anywhere on Earth: the
-- reference date is the earliest one in use (UTC+14), so the API, never this
-- trigger, decides the birthday-at-local-midnight case. Additive: existing
-- rows are not rewritten; only inserts and birth-date changes are checked.
CREATE OR REPLACE FUNCTION "profile_adults_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."birthDate" IS NULL
     OR NEW."birthDate" > ((now() AT TIME ZONE 'Pacific/Kiritimati')::date - INTERVAL '18 years')::date THEN
    RAISE EXCEPTION 'adults_only' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS "profile_adults_only" ON "Profile";
CREATE TRIGGER "profile_adults_only"
  BEFORE INSERT OR UPDATE OF "birthDate" ON "Profile"
  FOR EACH ROW EXECUTE FUNCTION "profile_adults_only"();

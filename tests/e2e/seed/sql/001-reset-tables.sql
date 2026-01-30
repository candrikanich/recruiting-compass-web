-- Reset test database
-- Truncate all user-generated data while preserving schema and system data

-- Disable foreign key constraints temporarily
SET session_replication_role = 'replica';

-- Truncate tables in dependency order
TRUNCATE TABLE IF EXISTS notifications CASCADE;
TRUNCATE TABLE IF EXISTS preference_history CASCADE;
TRUNCATE TABLE IF EXISTS user_preferences CASCADE;
TRUNCATE TABLE IF EXISTS athlete_tasks CASCADE;
TRUNCATE TABLE IF EXISTS interactions CASCADE;
TRUNCATE TABLE IF EXISTS coaches CASCADE;
TRUNCATE TABLE IF EXISTS schools CASCADE;
TRUNCATE TABLE IF EXISTS account_links CASCADE;

-- Re-enable foreign key constraints
SET session_replication_role = 'origin';

-- Delete test users (keep system accounts)
DELETE FROM auth.users
WHERE email LIKE '%@test.com' OR email LIKE '%test%';

-- Reset sequences if needed
ALTER SEQUENCE IF EXISTS schools_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS coaches_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS interactions_id_seq RESTART WITH 1;

COMMIT;

-- Study Library — create the database and the app's MySQL user. Run this ONCE,
-- before starting the app for the first time.
--
-- You do NOT create any tables here: the app creates and upgrades them itself on
-- every start (server/src/migrations/*.sql, tracked in schema_migrations). That is
-- also why the user below needs CREATE/ALTER rights, not just read/write.
--
-- 1. Change DB_PASSWORD_HERE below (use a long random password).
-- 2. Run it:
--      mysql -u root -p < scripts/create-database.sql
-- 3. Put the same values in .env (DB_NAME / DB_USER / DB_PASSWORD).
--
-- On cPanel shared hosting use "MySQL Databases" in cPanel instead — it prefixes
-- the names (cpuser_library) and you cannot log in as root. See
-- docs/DEPLOY-SHARED-HOSTING.md §2.

-- utf8mb4 everywhere: Hindi/Marathi names, ₹ and emoji. The collation is set
-- explicitly because the tables inherit it, and foreign keys between tables only
-- work when the character set matches.
CREATE DATABASE IF NOT EXISTS study_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'library_app'@'localhost'
  IDENTIFIED BY 'DB_PASSWORD_HERE';

-- If the app then fails with "Authentication plugin 'caching_sha2_password'
-- cannot be loaded", replace the line above with:
--   CREATE USER IF NOT EXISTS 'library_app'@'localhost'
--     IDENTIFIED WITH mysql_native_password BY 'DB_PASSWORD_HERE';

-- Scoped to this one database, and nothing else on the server.
GRANT ALL PRIVILEGES ON study_library.* TO 'library_app'@'localhost';

FLUSH PRIVILEGES;

-- Optional, developer machines only: the database the integration tests use.
-- It is DROPPED AND RECREATED on every test run, so never point this at real data.
-- Its name must end in _test (the test harness refuses anything else).
--
-- CREATE DATABASE IF NOT EXISTS study_library_test
--   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- GRANT ALL PRIVILEGES ON `study_library_test`.* TO 'library_app'@'localhost';
-- GRANT CREATE, DROP ON *.* TO 'library_app'@'localhost';  -- per-file test databases
-- FLUSH PRIVILEGES;

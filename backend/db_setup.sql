-- ============================================================
-- NWIS Database Setup Script
-- ============================================================
-- Run this in pgAdmin Query Tool or psql as the postgres superuser.
-- This creates the database, user, and grants required permissions.
--
-- Instructions:
--   1. Open pgAdmin 4
--   2. Right-click on 'postgres' server → Query Tool
--   3. Paste and run this entire script
--   4. Then update backend/.env with your actual postgres password
-- ============================================================

-- Create the NWIS application user (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nwis_user') THEN
    CREATE USER nwis_user WITH PASSWORD 'nwis_password';
    RAISE NOTICE 'Created user nwis_user';
  ELSE
    RAISE NOTICE 'User nwis_user already exists';
  END IF;
END
$$;

-- Create the NWIS database (if not exists)
SELECT 'CREATE DATABASE nwis_db OWNER nwis_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nwis_db')
\gexec

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE nwis_db TO nwis_user;

-- Connect to nwis_db and grant schema permissions
\c nwis_db
GRANT ALL ON SCHEMA public TO nwis_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nwis_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nwis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nwis_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nwis_user;

\echo 'NWIS database setup complete. Database: nwis_db, User: nwis_user'

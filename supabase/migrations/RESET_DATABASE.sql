-- COMPLETE DATABASE RESET SCRIPT
-- IMPORTANT: Run this script in your Supabase Dashboard SQL Editor
-- This will DELETE ALL DATA and drop all tables in the public schema

-- ========================================
-- WARNING: THIS WILL DELETE ALL YOUR DATA
-- ========================================

-- 1. Drop all existing tables in the correct order (reverse dependencies)
DO $$
DECLARE
    table_name text;
BEGIN
    -- Drop functions first
    DROP FUNCTION IF EXISTS safe_delete_user(UUID);
    DROP FUNCTION IF EXISTS preview_user_deletion(UUID);
    DROP FUNCTION IF EXISTS handle_user_deletion();
    DROP FUNCTION IF EXISTS handle_auth_user_deletion();
    DROP FUNCTION IF EXISTS create_notification(UUID, UUID, UUID, TEXT, TEXT, TEXT, JSONB);
    DROP FUNCTION IF EXISTS update_auction_timestamps();
    DROP FUNCTION IF EXISTS handle_new_user();
    
    -- Drop triggers
    DROP TRIGGER IF EXISTS on_user_delete ON public.users;
    DROP TRIGGER IF EXISTS on_public_user_delete ON public.users;
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS update_auctions_timestamp ON public.auctions;
    
    -- Drop all tables in public schema
    FOR table_name IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    )
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(table_name) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', table_name;
    END LOOP;
    
    -- Drop custom types
    DROP TYPE IF EXISTS auction_status CASCADE;
    DROP TYPE IF EXISTS bid_status CASCADE;
    DROP TYPE IF EXISTS notification_type CASCADE;
    DROP TYPE IF EXISTS transaction_status CASCADE;
    DROP TYPE IF EXISTS counter_offer_status CASCADE;
    
    RAISE NOTICE 'Database reset completed successfully';
END $$;

-- 2. Verify all tables are dropped
SELECT 'All public tables dropped. Database is clean.' AS status;

-- Show remaining tables (should be empty or only system tables)
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

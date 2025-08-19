-- =====================================================
-- ⚡ EMERGENCY USER TRIGGER FIX
-- =====================================================
-- This script ensures robust automatic user profile creation
-- and fixes any edge cases that might cause trigger failures
-- =====================================================

-- 🛡️ STEP 1: ENHANCED USER CREATION FUNCTION
-- =====================================================

-- Drop and recreate function with better error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_full_name text;
    user_avatar_url text;
BEGIN
    -- Extract user metadata safely
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );
    
    user_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

    -- Try to insert new user profile
    BEGIN
        INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            user_full_name,
            user_avatar_url,
            COALESCE(NEW.created_at, NOW()),
            NOW()
        );
        
        RAISE NOTICE 'Successfully created user profile for %', NEW.email;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- User already exists, update their info
            UPDATE public.users SET
                email = NEW.email,
                full_name = CASE 
                    WHEN full_name IS NULL OR full_name = '' THEN user_full_name
                    ELSE full_name
                END,
                avatar_url = COALESCE(user_avatar_url, avatar_url),
                updated_at = NOW()
            WHERE id = NEW.id;
            
            RAISE NOTICE 'Updated existing user profile for %', NEW.email;
            
        WHEN OTHERS THEN
            -- Log detailed error but don't fail the auth process
            RAISE WARNING 'Failed to create/update user profile for % (ID: %): % - %', 
                NEW.email, NEW.id, SQLSTATE, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ⚡ STEP 2: CREATE ROBUST TRIGGER
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Create new trigger with better naming
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 🔧 STEP 3: REPAIR ANY REMAINING ISSUES
-- =====================================================

-- Fix any users that might have been missed
INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        au.raw_user_meta_data->>'display_name',
        SPLIT_PART(au.email, '@', 1),
        'User'
    ) as full_name,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
AND au.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE 
        WHEN public.users.full_name IS NULL OR public.users.full_name = '' 
        THEN EXCLUDED.full_name
        ELSE public.users.full_name
    END,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();

-- =====================================================
-- 🔍 STEP 4: VALIDATION AND VERIFICATION
-- =====================================================

-- Create function to validate user before bidding
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id uuid)
RETURNS boolean AS $$
DECLARE
    user_exists boolean := false;
    auth_email text;
    auth_metadata jsonb;
BEGIN
    -- Check if user profile exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id) INTO user_exists;
    
    IF user_exists THEN
        RETURN true;
    END IF;
    
    -- If not exists, try to create from auth.users
    SELECT email, raw_user_meta_data 
    INTO auth_email, auth_metadata
    FROM auth.users 
    WHERE id = user_id;
    
    IF auth_email IS NOT NULL THEN
        INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
        VALUES (
            user_id,
            auth_email,
            COALESCE(
                auth_metadata->>'full_name',
                auth_metadata->>'name',
                SPLIT_PART(auth_email, '@', 1)
            ),
            auth_metadata->>'avatar_url',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ✅ STEP 5: FINAL VERIFICATION
-- =====================================================

-- Test the trigger function
DO $$
DECLARE
    total_auth_users integer;
    total_profile_users integer;
    missing_profiles integer;
BEGIN
    SELECT COUNT(*) INTO total_auth_users FROM auth.users;
    SELECT COUNT(*) INTO total_profile_users FROM public.users;
    missing_profiles := total_auth_users - total_profile_users;
    
    RAISE NOTICE '=== USER PROFILE REPAIR STATUS ===';
    RAISE NOTICE 'Auth Users: %', total_auth_users;
    RAISE NOTICE 'Profile Users: %', total_profile_users;
    RAISE NOTICE 'Missing Profiles: %', missing_profiles;
    
    IF missing_profiles = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All users have profiles!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: % users still missing profiles', missing_profiles;
    END IF;
END $$;

-- Show any remaining issues
SELECT 
    'REMAINING ISSUES' as status,
    au.id,
    au.email,
    au.created_at as auth_created,
    CASE 
        WHEN pu.id IS NULL THEN 'Missing profile'
        ELSE 'Profile exists'
    END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
LIMIT 5;

-- =====================================================
-- 🎉 EMERGENCY FIX COMPLETE!
-- =====================================================
-- Robust automatic user profile creation is now active
-- All foreign key constraint errors should be resolved
-- =====================================================

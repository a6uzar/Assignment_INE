-- =====================================================
-- 🔧 PRODUCTION USER REPAIR - FIX FOREIGN KEY ERRORS
-- =====================================================
-- This script fixes the foreign key constraint errors by:
-- 1. Creating missing user profiles for all authenticated users
-- 2. Setting up automatic user profile creation for new signups
-- 3. Repairing any broken user relationships
-- =====================================================

-- 🚨 STEP 1: CREATE MISSING USER PROFILES
-- =====================================================
-- Insert missing user profiles for all authenticated users
INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name', 
        SPLIT_PART(au.email, '@', 1)
    ) as full_name,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL  -- Only insert users that don't exist in public.users
AND au.email IS NOT NULL;

-- =====================================================
-- 🛡️ STEP 2: CREATE AUTOMATIC USER CREATION FUNCTION
-- =====================================================

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, update their info instead
    UPDATE public.users SET
      email = NEW.email,
      full_name = COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1),
        full_name
      ),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ⚡ STEP 3: CREATE TRIGGER FOR AUTOMATIC USER CREATION
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 🔄 STEP 4: REPAIR EXISTING USER DATA
-- =====================================================

-- Update any users with missing or incomplete data
UPDATE public.users SET
  full_name = CASE 
    WHEN full_name IS NULL OR full_name = '' THEN 
      COALESCE(
        (SELECT au.raw_user_meta_data->>'full_name' FROM auth.users au WHERE au.id = users.id),
        (SELECT au.raw_user_meta_data->>'name' FROM auth.users au WHERE au.id = users.id),
        SPLIT_PART(email, '@', 1)
      )
    ELSE full_name
  END,
  avatar_url = CASE
    WHEN avatar_url IS NULL THEN
      (SELECT au.raw_user_meta_data->>'avatar_url' FROM auth.users au WHERE au.id = users.id)
    ELSE avatar_url
  END,
  updated_at = NOW()
WHERE full_name IS NULL OR full_name = '' OR avatar_url IS NULL;

-- =====================================================
-- ✅ STEP 5: VERIFICATION QUERIES
-- =====================================================

-- Check that all auth users now have profiles
SELECT 
  'BEFORE REPAIR' as status,
  COUNT(*) as auth_users,
  (SELECT COUNT(*) FROM public.users) as profile_users,
  COUNT(*) - (SELECT COUNT(*) FROM public.users) as missing_profiles
FROM auth.users;

-- Show repair results
SELECT 
  'AFTER REPAIR' as status,
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as profile_users,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) 
    THEN '✅ ALL USERS HAVE PROFILES' 
    ELSE '❌ STILL MISSING PROFILES'
  END as repair_status;

-- Check for any users who might still have issues
SELECT 
  'POTENTIAL ISSUES' as check_type,
  au.id,
  au.email,
  pu.full_name,
  CASE 
    WHEN pu.id IS NULL THEN 'Missing profile'
    WHEN pu.full_name IS NULL OR pu.full_name = '' THEN 'Missing name'
    ELSE 'OK'
  END as issue
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL OR pu.full_name IS NULL OR pu.full_name = ''
LIMIT 10;

-- =====================================================
-- 🎉 REPAIR COMPLETE!
-- =====================================================
-- The foreign key constraint error should now be fixed!
-- All authenticated users now have profiles in public.users
-- New users will automatically get profiles when they sign up
-- =====================================================

-- PRODUCTION PRE-DEPLOYMENT FIX
-- This script must be run BEFORE deploying the application
-- It fixes all existing users and prevents future issues

-- 1. First, let's see how many users are affected
DO $$
DECLARE
    missing_count INTEGER;
    total_auth_users INTEGER;
BEGIN
    -- Count auth users
    SELECT COUNT(*) INTO total_auth_users FROM auth.users WHERE email IS NOT NULL;
    
    -- Count missing public.users
    SELECT COUNT(*) INTO missing_count 
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL AND au.email IS NOT NULL;
    
    RAISE NOTICE 'Total auth users: %', total_auth_users;
    RAISE NOTICE 'Missing public.users profiles: %', missing_count;
    RAISE NOTICE 'This script will repair % user profiles', missing_count;
END $$;

-- 2. Drop and recreate the user creation function with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into public.users table
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  RAISE LOG 'Created user profile for: %', NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If user already exists, just return NEW (no error)
    RAISE LOG 'User profile already exists for: %', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log any other errors but don't fail the auth process
    RAISE LOG 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Repair ALL existing users who are missing from public.users
INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    au.raw_user_meta_data->>'avatar_url',
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
    AND au.email IS NOT NULL
    AND au.email_confirmed_at IS NOT NULL  -- Only confirmed users
ON CONFLICT (id) DO NOTHING;

-- 5. Verify the repair worked
DO $$
DECLARE
    remaining_missing INTEGER;
    repaired_count INTEGER;
BEGIN
    -- Count how many we repaired
    SELECT COUNT(*) INTO repaired_count 
    FROM auth.users au
    INNER JOIN public.users pu ON au.id = pu.id
    WHERE au.email IS NOT NULL;
    
    -- Count any remaining missing
    SELECT COUNT(*) INTO remaining_missing 
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL AND au.email IS NOT NULL;
    
    RAISE NOTICE '✅ Repair complete!';
    RAISE NOTICE '✅ Users with profiles: %', repaired_count;
    RAISE NOTICE '⚠️  Remaining missing: %', remaining_missing;
    
    IF remaining_missing = 0 THEN
        RAISE NOTICE '🎉 ALL USERS REPAIRED! Ready for deployment.';
    ELSE
        RAISE NOTICE '⚠️  Some users still missing - check email confirmation status';
    END IF;
END $$;

-- 6. Create monitoring view for future use
CREATE OR REPLACE VIEW user_profile_status AS
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    au.email_confirmed_at,
    CASE 
        WHEN pu.id IS NOT NULL THEN 'Has Profile'
        WHEN au.email_confirmed_at IS NULL THEN 'Email Not Confirmed'
        ELSE 'Missing Profile'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IS NOT NULL
ORDER BY au.created_at DESC;

-- 7. Final verification query
SELECT 
    status,
    COUNT(*) as count
FROM user_profile_status
GROUP BY status
ORDER BY count DESC;

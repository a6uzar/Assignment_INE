-- Emergency fix for user creation trigger
-- This ensures that when a user signs up with Supabase Auth, 
-- a corresponding record is automatically created in public.users

-- Drop existing trigger and function if they exist (safe cleanup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into public.users table
  -- Use COALESCE to handle cases where metadata might be null
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Return the new record
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If user already exists, just return NEW (no error)
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log any other errors but don't fail the auth process
    RAISE LOG 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create trigger on_auth_user_created';
  END IF;
END $$;

-- Create function to manually repair existing users who might be missing from public.users
CREATE OR REPLACE FUNCTION repair_missing_users()
RETURNS TABLE(repaired_user_id UUID, email TEXT, status TEXT) AS $$
BEGIN
  -- Find auth users who don't have corresponding public.users records
  RETURN QUERY
  INSERT INTO public.users (id, email, full_name, avatar_url)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    au.raw_user_meta_data->>'avatar_url'
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL
    AND au.email IS NOT NULL
  ON CONFLICT (id) DO NOTHING
  RETURNING id, email, 'repaired'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the repair function to fix any existing users
DO $$
DECLARE
  repair_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO repair_count
  FROM repair_missing_users();
  
  RAISE NOTICE 'Repaired % missing user profiles', repair_count;
END $$;

-- Fix users table RLS policies to allow profile creation

-- Drop existing restrictive policies that might prevent user creation
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Public user profiles viewable" ON public.users;

-- Create more permissive policies for user profile management
CREATE POLICY "Users can view all profiles" 
ON public.users FOR SELECT 
USING (true);

CREATE POLICY "Users can create own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- Allow service role to manage users (for migrations and system operations)
CREATE POLICY "Service role can manage users" 
ON public.users FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');
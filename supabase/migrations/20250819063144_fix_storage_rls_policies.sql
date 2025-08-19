-- Fix storage bucket creation and RLS policies

-- Disable RLS temporarily for bucket creation
ALTER TABLE IF EXISTS storage.buckets DISABLE ROW LEVEL SECURITY;

-- Create auction-images storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auction-images',
  'auction-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS for buckets
ALTER TABLE IF EXISTS storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own auction images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own auction images" ON storage.objects;

-- Create storage policies for auction images
CREATE POLICY "Public can view auction images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'auction-images' );

CREATE POLICY "Authenticated users can upload auction images"
ON storage.objects FOR INSERT
WITH CHECK ( 
  bucket_id = 'auction-images' 
  AND auth.role() = 'authenticated' 
);

CREATE POLICY "Users can update auction images"
ON storage.objects FOR UPDATE
USING ( 
  bucket_id = 'auction-images' 
  AND auth.role() = 'authenticated' 
);

CREATE POLICY "Users can delete auction images"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'auction-images' 
  AND auth.role() = 'authenticated' 
);

-- Fix users table RLS policies
-- Drop existing restrictive policies
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

-- Allow authenticated users to read user profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.users FOR SELECT 
USING (auth.role() = 'authenticated');
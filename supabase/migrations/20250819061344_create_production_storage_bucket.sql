-- Ensure auction-images storage bucket exists in production
-- This migration ensures the bucket exists regardless of environment

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

-- Ensure RLS policies exist for auction images bucket
DO $$
BEGIN
  -- Check if policies exist before creating them
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public Access'
  ) THEN
    CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'auction-images' );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload images'
  ) THEN
    CREATE POLICY "Authenticated users can upload images"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'auction-images' AND auth.role() = 'authenticated' );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own auction images'
  ) THEN
    CREATE POLICY "Users can update their own auction images"
    ON storage.objects FOR UPDATE
    USING ( bucket_id = 'auction-images' AND auth.role() = 'authenticated' );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own auction images'
  ) THEN
    CREATE POLICY "Users can delete their own auction images"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'auction-images' AND auth.role() = 'authenticated' );
  END IF;
END $$;
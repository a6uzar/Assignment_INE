-- Create auction-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auction-images',
  'auction-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for auction images bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'auction-images' );

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'auction-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own auction images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'auction-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can delete their own auction images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'auction-images' AND auth.role() = 'authenticated' );

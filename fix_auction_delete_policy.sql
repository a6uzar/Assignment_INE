-- Add RLS policies for auction deletion and updating
-- This allows sellers to delete and update their own auctions

-- Enable RLS on auctions table (if not already enabled)
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Sellers can delete their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Sellers can update their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Authenticated users can insert auctions" ON public.auctions;

-- Policy for deletion - sellers can delete their own auctions
CREATE POLICY "Sellers can delete their own auctions" ON public.auctions FOR DELETE USING (
  auth.uid() = seller_id
);

-- Policy for updates - sellers can update their own auctions
CREATE POLICY "Sellers can update their own auctions" ON public.auctions FOR UPDATE USING (
  auth.uid() = seller_id
) WITH CHECK (
  auth.uid() = seller_id
);

-- Policy for insertion - authenticated users can create auctions
CREATE POLICY "Authenticated users can insert auctions" ON public.auctions FOR INSERT WITH CHECK (
  auth.uid() = seller_id
);

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'auctions' 
ORDER BY policyname;

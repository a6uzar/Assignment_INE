-- Better RLS policy for auction visibility
-- This allows users to see all auctions except cancelled ones, while sellers can see all their own auctions

DROP POLICY IF EXISTS "Anyone can view active auctions" ON public.auctions;

CREATE POLICY "Users can view public auctions" ON public.auctions FOR SELECT USING (
  -- Users can see all their own auctions regardless of status
  auth.uid() = seller_id 
  OR 
  -- Everyone can see non-cancelled auctions
  status IN ('draft', 'scheduled', 'active', 'ended', 'completed')
);

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'auctions' AND policyname LIKE '%view%';

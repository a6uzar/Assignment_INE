-- Fix auction visibility issue
-- The problem: Auctions are created with 'draft' status but RLS policy only shows 'active' and 'scheduled' auctions to other users

-- Current policy (RESTRICTIVE):
-- CREATE POLICY "Anyone can view active auctions" ON public.auctions FOR SELECT USING (status IN ('active', 'scheduled') OR auth.uid() = seller_id);

-- Option 1: Allow everyone to see all auctions (most permissive)
DROP POLICY IF EXISTS "Anyone can view active auctions" ON public.auctions;
CREATE POLICY "Anyone can view all auctions" ON public.auctions FOR SELECT USING (true);

-- Option 2: Allow viewing of all auctions except cancelled ones (recommended)
-- DROP POLICY IF EXISTS "Anyone can view active auctions" ON public.auctions;
-- CREATE POLICY "Anyone can view public auctions" ON public.auctions FOR SELECT USING (
--   status IN ('draft', 'scheduled', 'active', 'ended', 'completed') OR auth.uid() = seller_id
-- );

-- Option 3: Keep current policy but update auction creation to use proper status
-- This would require code changes to set status based on start_time

-- Verify the policy was updated
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'auctions' AND policyname LIKE '%view%';

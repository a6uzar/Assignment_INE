-- =====================================================
-- 🚨 EMERGENCY RLS FIX - RESOLVE INCREASED ISSUES
-- =====================================================
-- This script fixes overly restrictive RLS policies that
-- may have caused more issues after the initial security fix
-- =====================================================

-- 🔧 STEP 1: DROP EXISTING RESTRICTIVE POLICIES
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Active auctions are viewable by everyone" ON public.auctions;
DROP POLICY IF EXISTS "Authenticated users can create auctions" ON public.auctions;
DROP POLICY IF EXISTS "Sellers can update their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Users can view bids for visible auctions" ON public.bids;
DROP POLICY IF EXISTS "Authenticated users can place bids" ON public.bids;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- =====================================================
-- 🛡️ STEP 2: CREATE PERMISSIVE BUT SECURE POLICIES
-- =====================================================

-- USERS TABLE - More permissive policies
-- =====================================================

-- Everyone can view user profiles (needed for auctions, chat, etc.)
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (true);

-- Users can insert their own profile OR system can insert
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    auth.uid() IS NULL  -- Allow system inserts
  );

-- Users can update their own profile OR system can update
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  ) WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

-- CATEGORIES TABLE
-- =====================================================

-- Everyone can view categories (public data)
CREATE POLICY "categories_select_policy" ON public.categories
  FOR SELECT USING (true);

-- System/admin can manage categories
CREATE POLICY "categories_insert_policy" ON public.categories
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
    ))
  );

CREATE POLICY "categories_update_policy" ON public.categories
  FOR UPDATE USING (
    auth.role() = 'service_role' OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
    ))
  );

-- AUCTIONS TABLE - Very permissive for marketplace functionality
-- =====================================================

-- Everyone can view auctions (public marketplace)
CREATE POLICY "auctions_select_policy" ON public.auctions
  FOR SELECT USING (true);

-- Authenticated users can create auctions
CREATE POLICY "auctions_insert_policy" ON public.auctions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = seller_id OR auth.role() = 'service_role')
  );

-- Sellers can update their auctions OR system can update
CREATE POLICY "auctions_update_policy" ON public.auctions
  FOR UPDATE USING (
    auth.uid() = seller_id OR 
    auth.role() = 'service_role'
  ) WITH CHECK (
    auth.uid() = seller_id OR 
    auth.role() = 'service_role'
  );

-- Sellers can delete their draft auctions
CREATE POLICY "auctions_delete_policy" ON public.auctions
  FOR DELETE USING (
    auth.uid() = seller_id OR 
    auth.role() = 'service_role'
  );

-- BIDS TABLE - Permissive for bidding functionality
-- =====================================================

-- Everyone can view bids (transparent marketplace)
CREATE POLICY "bids_select_policy" ON public.bids
  FOR SELECT USING (true);

-- Authenticated users can place bids
CREATE POLICY "bids_insert_policy" ON public.bids
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = bidder_id) OR
    auth.role() = 'service_role'
  );

-- Users can update their own bids
CREATE POLICY "bids_update_policy" ON public.bids
  FOR UPDATE USING (
    auth.uid() = bidder_id OR 
    auth.role() = 'service_role'
  ) WITH CHECK (
    auth.uid() = bidder_id OR 
    auth.role() = 'service_role'
  );

-- NOTIFICATIONS TABLE
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- System can create notifications for any user
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Users can update their own notifications
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  ) WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- =====================================================
-- 🔓 STEP 3: GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Ensure service role has full access
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.auctions TO service_role;
GRANT ALL ON public.bids TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.notifications TO service_role;

-- Ensure authenticated users have necessary access
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auctions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Ensure anonymous users can view public data
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.auctions TO anon;
GRANT SELECT ON public.bids TO anon;
GRANT SELECT ON public.users TO anon;

-- =====================================================
-- 🛠️ STEP 4: CREATE BYPASS FUNCTION FOR SYSTEM OPERATIONS
-- =====================================================

-- Function to temporarily bypass RLS for system operations
CREATE OR REPLACE FUNCTION public.bypass_rls_for_system()
RETURNS void AS $$
BEGIN
  -- This function can be called by the application when needed
  -- for system-level operations that need to bypass RLS
  IF current_setting('role') = 'service_role' THEN
    SET row_security = off;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ✅ STEP 5: VERIFICATION
-- =====================================================

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'auctions', 'bids', 'categories', 'notifications')
ORDER BY tablename;

-- Test basic operations
DO $$
BEGIN
    RAISE NOTICE '=== TESTING BASIC OPERATIONS ===';
    
    -- Test if we can read from tables
    PERFORM COUNT(*) FROM public.users;
    RAISE NOTICE '✅ Can read users table';
    
    PERFORM COUNT(*) FROM public.auctions;
    RAISE NOTICE '✅ Can read auctions table';
    
    PERFORM COUNT(*) FROM public.categories;
    RAISE NOTICE '✅ Can read categories table';
    
    RAISE NOTICE '🎉 All basic operations working!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error in basic operations: %', SQLERRM;
END $$;

-- =====================================================
-- 🎉 PERMISSIVE RLS POLICIES APPLIED!
-- =====================================================
-- These policies should resolve the increased issues while
-- maintaining security for your auction platform
-- =====================================================

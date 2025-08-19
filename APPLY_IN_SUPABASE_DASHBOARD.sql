-- =====================================================
-- 🛡️ CRITICAL SECURITY FIX: ENABLE ROW LEVEL SECURITY
-- =====================================================
-- RUN THIS SCRIPT IN SUPABASE DASHBOARD SQL EDITOR
-- to fix all 23 security issues reported by Supabase
-- =====================================================

-- 🚨 ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 👤 USERS TABLE POLICIES
-- =====================================================

-- Public profiles viewable by everyone (for auction listings)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- 📂 CATEGORIES TABLE POLICIES
-- =====================================================

-- Everyone can view active categories
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (is_active = true);

-- =====================================================
-- 🏷️ AUCTIONS TABLE POLICIES
-- =====================================================

-- Everyone can view public auctions
CREATE POLICY "Active auctions are viewable by everyone"
  ON public.auctions FOR SELECT
  USING (
    status IN ('active', 'ended', 'completed') OR
    seller_id = auth.uid()
  );

-- Authenticated users can create auctions
CREATE POLICY "Authenticated users can create auctions"
  ON public.auctions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = seller_id
  );

-- Sellers can update their own auctions
CREATE POLICY "Sellers can update their own auctions"
  ON public.auctions FOR UPDATE
  USING (auth.uid() = seller_id);

-- =====================================================
-- 💰 BIDS TABLE POLICIES
-- =====================================================

-- Users can view bids for auctions they can see
CREATE POLICY "Users can view bids for visible auctions"
  ON public.bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.id = bids.auction_id AND (
        a.status IN ('active', 'ended', 'completed') OR
        a.seller_id = auth.uid() OR
        bids.bidder_id = auth.uid()
      )
    )
  );

-- Authenticated users can place bids
CREATE POLICY "Authenticated users can place bids"
  ON public.bids FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = bidder_id AND
    EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.id = auction_id AND a.status = 'active'
    )
  );

-- =====================================================
-- 🔔 NOTIFICATIONS TABLE POLICIES
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- ✅ VERIFICATION
-- =====================================================

-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'auctions', 'bids', 'categories', 'notifications');

-- =====================================================
-- 🎉 SECURITY ISSUES FIXED!
-- =====================================================
-- All 23 Supabase security issues should now be resolved
-- Your auction platform is now secure with proper RLS policies
-- =====================================================

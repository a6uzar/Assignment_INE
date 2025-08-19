-- =====================================================
-- 🏗️ ADD MISSING TABLES FOR COMPLETE AUCTION PLATFORM
-- =====================================================
-- This migration adds all missing tables identified from TypeScript types
-- Current database has: users, auctions, bids, categories, notifications
-- Adding: watchlist, counter_offers, transactions, chat, social features
-- =====================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 👀 AUCTION WATCHERS TABLE (from types.ts)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_watchers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id, auction_id)
);

-- =====================================================
-- 🤝 COUNTER OFFERS TABLE (from types.ts)
-- =====================================================

-- Create counter offer status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.counter_offer_status AS ENUM (
        'pending', 'accepted', 'rejected', 'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.counter_offers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bidder_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    original_bid_amount numeric(12,2) NOT NULL,
    counter_amount numeric(12,2) NOT NULL CHECK (counter_amount > 0),
    message text,
    status public.counter_offer_status DEFAULT 'pending',
    expires_at timestamp with time zone NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 💳 TRANSACTIONS TABLE (from types.ts)
-- =====================================================

-- Create transaction status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.transaction_status AS ENUM (
        'pending', 'completed', 'failed', 'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE RESTRICT,
    seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    counter_offer_id uuid REFERENCES public.counter_offers(id) ON DELETE SET NULL,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    commission_amount numeric(12,2) DEFAULT 0,
    shipping_cost numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) NOT NULL,
    payment_method text,
    payment_id text, -- External payment processor ID
    invoice_url text,
    status public.transaction_status DEFAULT 'pending',
    notes text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 🔖 AUCTION BOOKMARKS TABLE (from types.ts)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_bookmarks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id, auction_id)
);

-- =====================================================
-- 💬 AUCTION CHAT TABLE (from types.ts)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_chat (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message text NOT NULL,
    message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    reply_to_id uuid REFERENCES public.auction_chat(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}',
    is_edited boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 👍 AUCTION LIKES TABLE (from types.ts)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_likes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id, auction_id)
);

-- =====================================================
-- 😍 AUCTION REACTIONS TABLE (from types.ts)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_reactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    reaction_type text NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id, auction_id, reaction_type)
);

-- =====================================================
-- 📊 AUCTION ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_analytics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    date date NOT NULL,
    views integer DEFAULT 0,
    unique_views integer DEFAULT 0,
    bids integer DEFAULT 0,
    unique_bidders integer DEFAULT 0,
    watchers_added integer DEFAULT 0,
    likes_added integer DEFAULT 0,
    messages integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(auction_id, date)
);

-- =====================================================
-- ⚙️ SYSTEM SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    category text DEFAULT 'general',
    is_public boolean DEFAULT false,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 💰 PAYMENTS TABLE (Enhanced payment tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    payer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    payee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    fee_amount numeric(12,2) DEFAULT 0,
    net_amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'USD',
    payment_method text NOT NULL,
    payment_processor text DEFAULT 'stripe',
    processor_payment_id text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    failure_reason text,
    metadata jsonb DEFAULT '{}',
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 🔍 CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Auction watchers indexes
CREATE INDEX IF NOT EXISTS idx_auction_watchers_user_id ON public.auction_watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_watchers_auction_id ON public.auction_watchers(auction_id);

-- Counter offers indexes
CREATE INDEX IF NOT EXISTS idx_counter_offers_auction_id ON public.counter_offers(auction_id);
CREATE INDEX IF NOT EXISTS idx_counter_offers_bidder_id ON public.counter_offers(bidder_id);
CREATE INDEX IF NOT EXISTS idx_counter_offers_status ON public.counter_offers(status);
CREATE INDEX IF NOT EXISTS idx_counter_offers_expires_at ON public.counter_offers(expires_at);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_auction_id ON public.transactions(auction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_auction_bookmarks_user_id ON public.auction_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_bookmarks_auction_id ON public.auction_bookmarks(auction_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_auction_chat_auction_id ON public.auction_chat(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_user_id ON public.auction_chat(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_created_at ON public.auction_chat(created_at);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_auction_likes_user_id ON public.auction_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_likes_auction_id ON public.auction_likes(auction_id);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_auction_reactions_user_id ON public.auction_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_reactions_auction_id ON public.auction_reactions(auction_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_auction_analytics_auction_id ON public.auction_analytics(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_analytics_date ON public.auction_analytics(date);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_category ON public.settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_is_public ON public.settings(is_public);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- =====================================================
-- 🛡️ ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.auction_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Auction watchers policies
CREATE POLICY "Users can manage own watchlist" ON public.auction_watchers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view auction watchers" ON public.auction_watchers FOR SELECT USING (true);

-- Counter offers policies
CREATE POLICY "Counter offers viewable by participants" ON public.counter_offers FOR SELECT USING (
    auth.uid() = seller_id OR auth.uid() = bidder_id
);
CREATE POLICY "Sellers can create counter offers" ON public.counter_offers FOR INSERT WITH CHECK (
    auth.uid() = seller_id AND auth.uid() IS NOT NULL
);
CREATE POLICY "Participants can update counter offers" ON public.counter_offers FOR UPDATE USING (
    auth.uid() = seller_id OR auth.uid() = bidder_id
);

-- Transactions policies
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- Bookmarks policies
CREATE POLICY "Users manage own bookmarks" ON public.auction_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Chat policies
CREATE POLICY "Chat viewable by auction participants" ON public.auction_chat FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.auctions a 
        WHERE a.id = auction_id AND (
            a.seller_id = auth.uid() OR
            EXISTS (SELECT 1 FROM public.bids b WHERE b.auction_id = a.id AND b.bidder_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.auction_watchers w WHERE w.auction_id = a.id AND w.user_id = auth.uid())
        )
    )
);
CREATE POLICY "Users can send chat messages" ON public.auction_chat FOR INSERT WITH CHECK (
    auth.uid() = user_id AND auth.uid() IS NOT NULL
);
CREATE POLICY "Users can update own messages" ON public.auction_chat FOR UPDATE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users manage own likes" ON public.auction_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Likes viewable by all" ON public.auction_likes FOR SELECT USING (true);

-- Reactions policies
CREATE POLICY "Users manage own reactions" ON public.auction_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Reactions viewable by all" ON public.auction_reactions FOR SELECT USING (true);

-- Analytics policies
CREATE POLICY "Sellers view own auction analytics" ON public.auction_analytics FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = auction_id AND a.seller_id = auth.uid())
);

-- Settings policies
CREATE POLICY "Public settings viewable by all" ON public.settings FOR SELECT USING (is_public = true);
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
);

-- Payments policies
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (
    auth.uid() = payer_id OR auth.uid() = payee_id
);

-- =====================================================
-- 🔧 TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_auction_chat_updated_at BEFORE UPDATE ON public.auction_chat
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 📊 INSERT DEFAULT SYSTEM SETTINGS
-- =====================================================

-- Insert essential system settings for auction platform
INSERT INTO public.settings (key, value, description, category, is_public) VALUES
('site_name', '"Live Auction Platform"', 'Name of the auction site', 'general', true),
('commission_rate', '0.05', 'Default commission rate (5%)', 'financial', false),
('auto_extend_time', '300', 'Auto-extend time in seconds (5 minutes)', 'auction', true),
('max_bid_increment', '1000', 'Maximum bid increment allowed', 'auction', true),
('min_auction_duration', '3600', 'Minimum auction duration in seconds (1 hour)', 'auction', true),
('max_auction_duration', '2592000', 'Maximum auction duration in seconds (30 days)', 'auction', true),
('email_notifications', 'true', 'Enable email notifications', 'notifications', true),
('push_notifications', 'true', 'Enable push notifications', 'notifications', true),
('max_images_per_auction', '10', 'Maximum images allowed per auction', 'auction', true),
('featured_auction_cost', '10.00', 'Cost to feature an auction in USD', 'financial', true),
('chat_enabled', 'true', 'Enable real-time chat on auctions', 'features', true),
('reactions_enabled', 'true', 'Enable emoji reactions on auctions', 'features', true),
('counter_offers_enabled', 'true', 'Enable counter offer negotiations', 'features', true)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 🔔 EXTEND NOTIFICATION TYPES
-- =====================================================

-- Add new notification types to existing enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'auction_liked';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'reaction_added';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_follower';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'chat_mention';

-- =====================================================
-- ✅ VERIFICATION QUERY
-- =====================================================

-- Verify all new tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'auction_watchers', 'counter_offers', 'transactions', 'auction_bookmarks',
    'auction_chat', 'auction_likes', 'auction_reactions', 'auction_analytics',
    'settings', 'payments'
  )
ORDER BY table_name;

-- =====================================================
-- 🎉 MIGRATION COMPLETE!
-- =====================================================
-- Added all missing tables from TypeScript types:
-- ✅ auction_watchers - Users watching auctions
-- ✅ counter_offers - Counter offer negotiations  
-- ✅ transactions - Payment/transaction tracking
-- ✅ auction_bookmarks - Bookmarked auctions
-- ✅ auction_chat - Real-time chat system
-- ✅ auction_likes - Like/favorite system
-- ✅ auction_reactions - Emoji reactions
-- ✅ auction_analytics - Analytics tracking
-- ✅ settings - System configuration
-- ✅ payments - Enhanced payment processing
-- ✅ Proper RLS security policies
-- ✅ Performance optimized indexes
-- ✅ Default system settings
-- =====================================================

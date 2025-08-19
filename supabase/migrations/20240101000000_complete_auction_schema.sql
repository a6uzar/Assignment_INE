-- =====================================================
-- 🏗️ COMPLETE AUCTION PLATFORM SCHEMA
-- =====================================================
-- This migration sets up the complete database schema for the auction platform
-- Created: August 19, 2025
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 🔐 CORE USER MANAGEMENT
-- =====================================================

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    bio text,
    location text,
    phone_number text,
    date_of_birth date,
    is_verified boolean DEFAULT false,
    is_admin boolean DEFAULT false,
    notification_preferences jsonb DEFAULT '{"email": true, "push": true, "sms": false}',
    seller_rating numeric(3,2) DEFAULT 0.00 CHECK (seller_rating >= 0 AND seller_rating <= 5),
    buyer_rating numeric(3,2) DEFAULT 0.00 CHECK (buyer_rating >= 0 AND buyer_rating <= 5),
    total_sales integer DEFAULT 0,
    total_purchases integer DEFAULT 0,
    account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
    last_active_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 📂 CATEGORIES SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text UNIQUE,
    icon text DEFAULT '📦',
    description text,
    parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    image_url text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 🏷️ AUCTION SYSTEM
-- =====================================================

-- Create auction status enum
DO $$ BEGIN
    CREATE TYPE public.auction_status AS ENUM (
        'draft', 'scheduled', 'active', 'ended', 'cancelled', 'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create bidding types enum
DO $$ BEGIN
    CREATE TYPE public.bidding_type AS ENUM (
        'standard', 'reserve', 'dutch', 'penny'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create auctions table
CREATE TABLE IF NOT EXISTS public.auctions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
    seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    starting_price numeric(12,2) NOT NULL CHECK (starting_price >= 0),
    reserve_price numeric(12,2) CHECK (reserve_price >= starting_price),
    current_price numeric(12,2) DEFAULT 0,
    buy_now_price numeric(12,2) CHECK (buy_now_price >= starting_price),
    bid_increment numeric(12,2) DEFAULT 1.00 CHECK (bid_increment > 0),
    bidding_type public.bidding_type DEFAULT 'standard',
    status public.auction_status DEFAULT 'draft',
    images text[] DEFAULT '{}',
    location text,
    shipping_cost numeric(12,2) DEFAULT 0,
    shipping_details text,
    condition text,
    dimensions text,
    weight numeric(8,2),
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    auto_extend_minutes integer DEFAULT 5,
    total_bids integer DEFAULT 0,
    view_count integer DEFAULT 0,
    is_featured boolean DEFAULT false,
    featured_until timestamp with time zone,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT auction_times_check CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time)
);

-- =====================================================
-- 💰 BIDDING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bids (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    max_bid numeric(12,2) CHECK (max_bid >= amount),
    is_winning boolean DEFAULT false,
    is_auto_bid boolean DEFAULT false,
    bid_time timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 🔔 NOTIFICATION SYSTEM
-- =====================================================

-- Create notification types enum
DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM (
        'bid_placed', 'bid_outbid', 'auction_won', 'auction_ended', 
        'payment_received', 'item_shipped', 'feedback_received',
        'auction_liked', 'reaction_added', 'new_follower', 'chat_mention',
        'bid_accepted', 'counter_offer', 'auction_starting'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    message text,
    data jsonb DEFAULT '{}',
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 👀 AUCTION WATCHERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_watchers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id, auction_id)
);

-- =====================================================
-- 🤝 COUNTER OFFERS TABLE
-- =====================================================

-- Create counter offer status enum
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
-- 💳 TRANSACTIONS TABLE
-- =====================================================

-- Create transaction status enum
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
-- 🔖 AUCTION BOOKMARKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_bookmarks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id, auction_id)
);

-- =====================================================
-- 💬 AUCTION CHAT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_chat (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message text NOT NULL,
    message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system', 'announcement')),
    reply_to_id uuid REFERENCES public.auction_chat(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}',
    is_edited boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 👍 AUCTION LIKES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auction_likes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id, auction_id)
);

-- =====================================================
-- 😍 AUCTION REACTIONS TABLE
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
-- 💰 PAYMENTS TABLE
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
-- 👥 USER FOLLOWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_follows (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- =====================================================
-- 🛡️ ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public user profiles viewable" ON public.users FOR SELECT USING (true);

-- Categories policies  
CREATE POLICY "Categories viewable by all" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
);

-- Auctions policies
CREATE POLICY "Auctions viewable by all" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Users can create auctions" ON public.auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own auctions" ON public.auctions FOR UPDATE USING (auth.uid() = seller_id);

-- Bids policies
CREATE POLICY "Bids viewable by participants" ON public.bids FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = auction_id AND (a.seller_id = auth.uid() OR bidder_id = auth.uid()))
);
CREATE POLICY "Users can place bids" ON public.bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Notifications policies
CREATE POLICY "Users view own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

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

-- User follows policies
CREATE POLICY "Users can manage own follows" ON public.user_follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Follow relationships viewable by all" ON public.user_follows FOR SELECT USING (true);

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

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON public.auctions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auction_chat_updated_at BEFORE UPDATE ON public.auction_chat
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 📊 CREATE PERFORMANCE INDEXES
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Auction indexes
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON public.auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_category_id ON public.auctions(category_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_start_time ON public.auctions(start_time);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_is_featured ON public.auctions(is_featured);

-- Bid indexes
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_is_winning ON public.bids(is_winning);
CREATE INDEX IF NOT EXISTS idx_bids_bid_time ON public.bids(bid_time);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Other performance indexes
CREATE INDEX IF NOT EXISTS idx_auction_watchers_user_id ON public.auction_watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_watchers_auction_id ON public.auction_watchers(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_auction_id ON public.auction_chat(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_created_at ON public.auction_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);

-- =====================================================
-- 📦 INSERT DEFAULT CATEGORIES
-- =====================================================

INSERT INTO public.categories (id, name, slug, icon, description, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Electronics', 'electronics', '💻', 'Computers, phones, gadgets and electronic devices', true),
('22222222-2222-2222-2222-222222222222', 'Art & Collectibles', 'art-collectibles', '🎨', 'Artwork, collectibles, antiques and memorabilia', true),
('33333333-3333-3333-3333-333333333333', 'Jewelry & Watches', 'jewelry-watches', '💎', 'Fine jewelry, watches, and precious accessories', true),
('44444444-4444-4444-4444-444444444444', 'Vehicles', 'vehicles', '🚗', 'Cars, motorcycles, boats and other vehicles', true),
('55555555-5555-5555-5555-555555555555', 'Real Estate', 'real-estate', '🏠', 'Properties, land and real estate opportunities', true),
('66666666-6666-6666-6666-666666666666', 'Sports & Recreation', 'sports-recreation', '🏀', 'Sports equipment, outdoor gear and recreational items', true),
('77777777-7777-7777-7777-777777777777', 'Fashion & Accessories', 'fashion-accessories', '👕', 'Clothing, shoes, bags and fashion accessories', true),
('88888888-8888-8888-8888-888888888888', 'Home & Garden', 'home-garden', '🏡', 'Furniture, appliances, garden tools and home decor', true),
('99999999-9999-9999-9999-999999999999', 'Books & Media', 'books-media', '📚', 'Books, movies, music, magazines and digital media', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 📊 INSERT DEFAULT SYSTEM SETTINGS
-- =====================================================

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
-- ✅ SCHEMA COMPLETE!
-- =====================================================
-- Complete auction platform schema with:
-- ✅ User management system
-- ✅ Category system with Books & Media
-- ✅ Full auction functionality
-- ✅ Bidding system
-- ✅ Real-time chat and social features
-- ✅ Notification system
-- ✅ Analytics and settings
-- ✅ Payment processing
-- ✅ Security policies (RLS)
-- ✅ Performance indexes
-- ✅ Default data
-- =====================================================

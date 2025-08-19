-- Execute this in Supabase SQL Editor Dashboard
-- https://supabase.com/dashboard/project/rbsvkrlzxlqnvoxbvnvb/sql

-- Add missing tables for complete auction platform

-- 1. AUCTION WATCHERS
CREATE TABLE IF NOT EXISTS public.auction_watchers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, auction_id)
);

-- 2. COUNTER OFFERS
DO $$ BEGIN
    CREATE TYPE public.counter_offer_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

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

-- 3. TRANSACTIONS
DO $$ BEGIN
    CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

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
    payment_id text,
    invoice_url text,
    status public.transaction_status DEFAULT 'pending',
    notes text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. AUCTION BOOKMARKS
CREATE TABLE IF NOT EXISTS public.auction_bookmarks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, auction_id)
);

-- 5. AUCTION CHAT
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

-- 6. AUCTION LIKES
CREATE TABLE IF NOT EXISTS public.auction_likes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, auction_id)
);

-- 7. AUCTION REACTIONS
CREATE TABLE IF NOT EXISTS public.auction_reactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    reaction_type text NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, auction_id, reaction_type)
);

-- Enable RLS and create policies
ALTER TABLE public.auction_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_reactions ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Users manage own watchlist" ON public.auction_watchers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own bookmarks" ON public.auction_bookmarks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own likes" ON public.auction_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own reactions" ON public.auction_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can send chat messages" ON public.auction_chat FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Chat viewable by all" ON public.auction_chat FOR SELECT USING (true);
CREATE POLICY "Counter offers viewable by participants" ON public.counter_offers FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = bidder_id);
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_watchers_user_id ON public.auction_watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_watchers_auction_id ON public.auction_watchers(auction_id);
CREATE INDEX IF NOT EXISTS idx_counter_offers_auction_id ON public.counter_offers(auction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_auction_id ON public.transactions(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bookmarks_user_id ON public.auction_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_auction_id ON public.auction_chat(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_likes_auction_id ON public.auction_likes(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_reactions_auction_id ON public.auction_reactions(auction_id);

SELECT 'All missing tables created successfully!' as status;

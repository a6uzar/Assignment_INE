-- SUPABASE DASHBOARD SQL SCRIPT
-- Complete Database Analysis and Social Features Installation
-- Copy and paste this entire script into the Supabase SQL Editor

-- =================================================================
-- STEP 1: ANALYZE EXISTING DATABASE STRUCTURE
-- =================================================================

-- Check what tables currently exist
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check existing columns in key tables (if they exist)
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'auctions', 'bids', 'categories', 'notifications')
ORDER BY table_name, ordinal_position;

-- Check existing foreign key constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =================================================================
-- STEP 2: CREATE MISSING CORE TABLES (IF NEEDED)
-- =================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_status') THEN
    CREATE TYPE auction_status AS ENUM ('draft', 'scheduled', 'active', 'ended', 'completed', 'cancelled');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bid_status') THEN
    CREATE TYPE bid_status AS ENUM ('active', 'outbid', 'winning', 'lost');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('bid_placed', 'outbid', 'auction_won', 'auction_ended', 'counter_offer', 'offer_accepted', 'offer_rejected');
  END IF;
END $$;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  address TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auctions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  starting_price DECIMAL(12,2) NOT NULL CHECK (starting_price > 0),
  current_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  reserve_price DECIMAL(12,2),
  bid_increment DECIMAL(12,2) NOT NULL DEFAULT 1.00 CHECK (bid_increment > 0),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status auction_status DEFAULT 'draft',
  view_count INTEGER DEFAULT 0,
  bid_count INTEGER DEFAULT 0,
  winner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  final_price DECIMAL(12,2),
  auto_extend_minutes INTEGER DEFAULT 5,
  featured BOOLEAN DEFAULT FALSE,
  condition VARCHAR(50),
  location VARCHAR(255),
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_reserve_price CHECK (reserve_price IS NULL OR reserve_price >= starting_price)
);

-- Create bids table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  bidder_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  status bid_status DEFAULT 'active',
  auto_bid_max_amount DECIMAL(12,2),
  is_auto_bid BOOLEAN DEFAULT FALSE,
  bid_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- STEP 3: CREATE SOCIAL FEATURES TABLES
-- =================================================================

-- Auction Chat table for live messaging
CREATE TABLE IF NOT EXISTS public.auction_chat (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system', 'announcement')),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  reply_to_id UUID REFERENCES public.auction_chat(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auction Reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.auction_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  reaction_type VARCHAR(20) DEFAULT 'celebration' CHECK (reaction_type IN ('celebration', 'surprise', 'support', 'concern', 'excitement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auction Likes table for auction favoriting
CREATE TABLE IF NOT EXISTS public.auction_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Follows table for following other users
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (follower_id != following_id)
);

-- Auction Bookmarks table for saving auctions
CREATE TABLE IF NOT EXISTS public.auction_bookmarks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- STEP 4: ADD UNIQUE CONSTRAINTS (PREVENT DUPLICATES)
-- =================================================================

-- Add unique constraints if they don't exist
DO $$
BEGIN
  -- auction_reactions unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'auction_reactions_auction_id_user_id_emoji_key'
  ) THEN
    ALTER TABLE public.auction_reactions 
    ADD CONSTRAINT auction_reactions_auction_id_user_id_emoji_key 
    UNIQUE(auction_id, user_id, emoji);
  END IF;

  -- auction_likes unique constraint  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'auction_likes_auction_id_user_id_key'
  ) THEN
    ALTER TABLE public.auction_likes 
    ADD CONSTRAINT auction_likes_auction_id_user_id_key 
    UNIQUE(auction_id, user_id);
  END IF;

  -- user_follows unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_follows_follower_id_following_id_key'
  ) THEN
    ALTER TABLE public.user_follows 
    ADD CONSTRAINT user_follows_follower_id_following_id_key 
    UNIQUE(follower_id, following_id);
  END IF;

  -- auction_bookmarks unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'auction_bookmarks_auction_id_user_id_key'
  ) THEN
    ALTER TABLE public.auction_bookmarks 
    ADD CONSTRAINT auction_bookmarks_auction_id_user_id_key 
    UNIQUE(auction_id, user_id);
  END IF;
END $$;

-- =================================================================
-- STEP 5: CREATE PERFORMANCE INDEXES
-- =================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON public.auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_category_id ON public.auctions(category_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON public.bids(amount DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- Social features indexes
CREATE INDEX IF NOT EXISTS idx_auction_chat_auction_id ON public.auction_chat(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_user_id ON public.auction_chat(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_chat_created_at ON public.auction_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_auction_chat_pinned ON public.auction_chat(auction_id, is_pinned) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_auction_reactions_auction_id ON public.auction_reactions(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_reactions_user_id ON public.auction_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_reactions_emoji ON public.auction_reactions(emoji);

CREATE INDEX IF NOT EXISTS idx_auction_likes_auction_id ON public.auction_likes(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_likes_user_id ON public.auction_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);

CREATE INDEX IF NOT EXISTS idx_auction_bookmarks_auction_id ON public.auction_bookmarks(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bookmarks_user_id ON public.auction_bookmarks(user_id);

-- =================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- =================================================================

-- Enable RLS on all social tables
ALTER TABLE public.auction_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bookmarks ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 7: CREATE RLS POLICIES
-- =================================================================

-- Auction Chat policies
DROP POLICY IF EXISTS "Users can view chat messages for auctions they can see" ON public.auction_chat;
CREATE POLICY "Users can view chat messages for auctions they can see" 
  ON public.auction_chat 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.auctions a 
      WHERE a.id = auction_id 
      AND (a.status IN ('active', 'ended', 'completed') OR a.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can send chat messages" ON public.auction_chat;
CREATE POLICY "Authenticated users can send chat messages" 
  ON public.auction_chat 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.auctions a 
      WHERE a.id = auction_id 
      AND a.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can update their own chat messages" ON public.auction_chat;
CREATE POLICY "Users can update their own chat messages" 
  ON public.auction_chat 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.auction_chat;
CREATE POLICY "Users can delete their own chat messages" 
  ON public.auction_chat 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Auction Reactions policies
DROP POLICY IF EXISTS "Users can view all reactions" ON public.auction_reactions;
CREATE POLICY "Users can view all reactions" 
  ON public.auction_reactions 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can add reactions" ON public.auction_reactions;
CREATE POLICY "Authenticated users can add reactions" 
  ON public.auction_reactions 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.auctions a 
      WHERE a.id = auction_id 
      AND a.status IN ('active', 'ended', 'completed')
    )
  );

DROP POLICY IF EXISTS "Users can update their own reactions" ON public.auction_reactions;
CREATE POLICY "Users can update their own reactions" 
  ON public.auction_reactions 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.auction_reactions;
CREATE POLICY "Users can delete their own reactions" 
  ON public.auction_reactions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Auction Likes policies
DROP POLICY IF EXISTS "Users can view all likes" ON public.auction_likes;
CREATE POLICY "Users can view all likes" 
  ON public.auction_likes 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can like auctions" ON public.auction_likes;
CREATE POLICY "Authenticated users can like auctions" 
  ON public.auction_likes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own likes" ON public.auction_likes;
CREATE POLICY "Users can remove their own likes" 
  ON public.auction_likes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- User Follows policies
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;
CREATE POLICY "Users can view all follows" 
  ON public.user_follows 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.user_follows;
CREATE POLICY "Authenticated users can follow others" 
  ON public.user_follows 
  FOR INSERT 
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow others" ON public.user_follows;
CREATE POLICY "Users can unfollow others" 
  ON public.user_follows 
  FOR DELETE 
  USING (auth.uid() = follower_id);

-- Auction Bookmarks policies
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.auction_bookmarks;
CREATE POLICY "Users can view their own bookmarks" 
  ON public.auction_bookmarks 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can bookmark auctions" ON public.auction_bookmarks;
CREATE POLICY "Authenticated users can bookmark auctions" 
  ON public.auction_bookmarks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own bookmarks" ON public.auction_bookmarks;
CREATE POLICY "Users can remove their own bookmarks" 
  ON public.auction_bookmarks 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =================================================================
-- STEP 8: CREATE HELPER FUNCTIONS
-- =================================================================

-- Function to get auction chat messages with user details
CREATE OR REPLACE FUNCTION get_auction_chat_messages(auction_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  auction_id UUID,
  user_id UUID,
  message TEXT,
  message_type VARCHAR,
  is_pinned BOOLEAN,
  is_edited BOOLEAN,
  edited_at TIMESTAMP WITH TIME ZONE,
  reply_to_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  user_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.auction_id,
    c.user_id,
    c.message,
    c.message_type,
    c.is_pinned,
    c.is_edited,
    c.edited_at,
    c.reply_to_id,
    c.metadata,
    c.created_at,
    u.full_name as user_name,
    u.avatar_url as user_avatar
  FROM public.auction_chat c
  JOIN public.users u ON c.user_id = u.id
  WHERE c.auction_id = auction_id_param
  ORDER BY c.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get auction reaction summary
CREATE OR REPLACE FUNCTION get_auction_reaction_summary(auction_id_param UUID)
RETURNS TABLE (
  emoji VARCHAR,
  count BIGINT,
  reaction_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.emoji,
    COUNT(*) as count,
    r.reaction_type
  FROM public.auction_reactions r
  WHERE r.auction_id = auction_id_param
  GROUP BY r.emoji, r.reaction_type
  ORDER BY count DESC, r.emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- STEP 9: INSERT SAMPLE CATEGORIES (IF EMPTY)
-- =================================================================

INSERT INTO public.categories (id, name, description, icon) 
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Electronics', 'Electronic devices and gadgets', 'Smartphone'),
  ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Art & Collectibles', 'Artwork, antiques, and collectible items', 'Palette'),
  ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'Vehicles', 'Cars, motorcycles, and other vehicles', 'Car'),
  ('6ba7b812-9dad-11d1-80b4-00c04fd430c8', 'Fashion', 'Clothing, accessories, and fashion items', 'Shirt'),
  ('6ba7b813-9dad-11d1-80b4-00c04fd430c8', 'Home & Garden', 'Furniture, appliances, and garden items', 'Home'),
  ('6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'Sports & Recreation', 'Sports equipment and recreational items', 'Trophy'),
  ('6ba7b815-9dad-11d1-80b4-00c04fd430c8', 'Books & Media', 'Books, movies, music, and digital media', 'BookOpen'),
  ('6ba7b816-9dad-11d1-80b4-00c04fd430c8', 'Other', 'Miscellaneous items', 'Package')
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- STEP 10: EXTEND NOTIFICATION TYPES FOR SOCIAL FEATURES
-- =================================================================

-- Add new notification types for social features
DO $$
BEGIN
  -- Add new values to notification_type enum
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'chat_mention';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_follower';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'auction_liked';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reaction_added';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =================================================================
-- FINAL VERIFICATION QUERIES
-- =================================================================

-- Verify all social tables were created
SELECT 
  'auction_chat' as table_name,
  COUNT(*) as row_count
FROM public.auction_chat
UNION ALL
SELECT 
  'auction_reactions' as table_name,
  COUNT(*) as row_count  
FROM public.auction_reactions
UNION ALL
SELECT 
  'auction_likes' as table_name,
  COUNT(*) as row_count
FROM public.auction_likes
UNION ALL
SELECT 
  'user_follows' as table_name,
  COUNT(*) as row_count
FROM public.user_follows
UNION ALL
SELECT 
  'auction_bookmarks' as table_name,
  COUNT(*) as row_count
FROM public.auction_bookmarks;

-- Show successful completion message
SELECT 
  '✅ SOCIAL FEATURES INSTALLATION COMPLETE!' as status,
  'All tables, indexes, RLS policies, and functions have been created successfully.' as message,
  'Your live auction platform now has full social functionality enabled.' as details;

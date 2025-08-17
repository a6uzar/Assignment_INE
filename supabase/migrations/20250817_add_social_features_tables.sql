-- Add Social Features Tables for Phase 3
-- This migration adds all the missing tables for social functionality

-- Auction Chat table for live messaging
CREATE TABLE public.auction_chat (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system')),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  reply_to_id UUID REFERENCES public.auction_chat(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auction Reactions table for emoji reactions
CREATE TABLE public.auction_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  reaction_type VARCHAR(20) DEFAULT 'celebration' CHECK (reaction_type IN ('celebration', 'surprise', 'support', 'concern', 'excitement')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auction_id, user_id, emoji)
);

-- Auction Likes table for auction favoriting
CREATE TABLE public.auction_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auction_id, user_id)
);

-- User Follows table for following other users
CREATE TABLE public.user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Auction Bookmarks table for saving auctions
CREATE TABLE public.auction_bookmarks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auction_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_auction_chat_auction_id ON public.auction_chat(auction_id);
CREATE INDEX idx_auction_chat_user_id ON public.auction_chat(user_id);
CREATE INDEX idx_auction_chat_created_at ON public.auction_chat(created_at);
CREATE INDEX idx_auction_chat_pinned ON public.auction_chat(auction_id, is_pinned) WHERE is_pinned = true;

CREATE INDEX idx_auction_reactions_auction_id ON public.auction_reactions(auction_id);
CREATE INDEX idx_auction_reactions_user_id ON public.auction_reactions(user_id);
CREATE INDEX idx_auction_reactions_emoji ON public.auction_reactions(emoji);

CREATE INDEX idx_auction_likes_auction_id ON public.auction_likes(auction_id);
CREATE INDEX idx_auction_likes_user_id ON public.auction_likes(user_id);

CREATE INDEX idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON public.user_follows(following_id);

CREATE INDEX idx_auction_bookmarks_auction_id ON public.auction_bookmarks(auction_id);
CREATE INDEX idx_auction_bookmarks_user_id ON public.auction_bookmarks(user_id);

-- Add RLS (Row Level Security) policies for social features

-- Auction Chat policies
ALTER TABLE public.auction_chat ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can update their own chat messages" 
  ON public.auction_chat 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages" 
  ON public.auction_chat 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Auction Reactions policies
ALTER TABLE public.auction_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reactions" 
  ON public.auction_reactions 
  FOR SELECT 
  USING (true);

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

CREATE POLICY "Users can update their own reactions" 
  ON public.auction_reactions 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
  ON public.auction_reactions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Auction Likes policies
ALTER TABLE public.auction_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes" 
  ON public.auction_likes 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can like auctions" 
  ON public.auction_likes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
  ON public.auction_likes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- User Follows policies
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all follows" 
  ON public.user_follows 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can follow others" 
  ON public.user_follows 
  FOR INSERT 
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" 
  ON public.user_follows 
  FOR DELETE 
  USING (auth.uid() = follower_id);

-- Auction Bookmarks policies
ALTER TABLE public.auction_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks" 
  ON public.auction_bookmarks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can bookmark auctions" 
  ON public.auction_bookmarks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own bookmarks" 
  ON public.auction_bookmarks 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Functions for social features

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

-- Add notification types for social features
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'chat_mention';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_follower';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'auction_liked';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reaction_added';

-- Update the notifications table to include the new types if needed
-- (ALTER TYPE automatically handles this)

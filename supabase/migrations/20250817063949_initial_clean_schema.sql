-- Complete Clean Schema for Live Bid Dash
-- This migration creates all tables with proper foreign key constraints and CASCADE behavior

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE auction_status AS ENUM ('draft', 'scheduled', 'active', 'ended', 'completed', 'cancelled');
CREATE TYPE bid_status AS ENUM ('active', 'outbid', 'winning', 'lost');
CREATE TYPE notification_type AS ENUM ('bid_placed', 'outbid', 'auction_won', 'auction_ended', 'counter_offer', 'offer_accepted', 'offer_rejected');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
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

-- Categories table
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auctions table
CREATE TABLE public.auctions (
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

-- Bids table
CREATE TABLE public.bids (
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

-- Notifications table
CREATE TABLE public.notifications (
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

-- Auction watchers (users following auctions)
CREATE TABLE public.auction_watchers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auction_id, user_id)
);

-- Insert default categories
INSERT INTO public.categories (id, name, description, icon) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Electronics', 'Electronic devices and gadgets', 'Smartphone'),
  ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Art & Collectibles', 'Artwork, antiques, and collectible items', 'Palette'),
  ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'Vehicles', 'Cars, motorcycles, and other vehicles', 'Car'),
  ('6ba7b812-9dad-11d1-80b4-00c04fd430c8', 'Fashion', 'Clothing, accessories, and fashion items', 'Shirt'),
  ('6ba7b813-9dad-11d1-80b4-00c04fd430c8', 'Home & Garden', 'Furniture, appliances, and garden items', 'Home'),
  ('6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'Sports & Recreation', 'Sports equipment and recreational items', 'Trophy'),
  ('6ba7b815-9dad-11d1-80b4-00c04fd430c8', 'Books & Media', 'Books, movies, music, and digital media', 'BookOpen'),
  ('6ba7b816-9dad-11d1-80b4-00c04fd430c8', 'Other', 'Miscellaneous items', 'Package');

-- Create indexes for better performance
CREATE INDEX idx_auctions_seller_id ON public.auctions(seller_id);
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX idx_auctions_category_id ON public.auctions(category_id);
CREATE INDEX idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX idx_bids_amount ON public.bids(amount DESC);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update auction timestamps
CREATE OR REPLACE FUNCTION update_auction_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auction timestamp updates
CREATE TRIGGER update_auctions_timestamp
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION update_auction_timestamps();

-- Create notification function
CREATE OR REPLACE FUNCTION create_notification(
  user_id_param UUID,
  type_param TEXT,
  title_param TEXT,
  message_param TEXT,
  auction_id_param UUID DEFAULT NULL,
  bid_id_param UUID DEFAULT NULL,
  data_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, auction_id, bid_id, type, title, message, data
  ) VALUES (
    user_id_param, auction_id_param, bid_id_param, 
    type_param::notification_type, title_param, message_param, data_param
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create safe user deletion function
CREATE OR REPLACE FUNCTION safe_delete_user(user_id_to_delete UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  auction_count INTEGER;
  bid_count INTEGER;
  notification_count INTEGER;
  user_email TEXT;
BEGIN
  -- Get user info before deletion
  SELECT email INTO user_email FROM public.users WHERE id = user_id_to_delete;
  
  -- Check if user exists
  IF user_email IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'User not found',
      'user_id', user_id_to_delete
    );
  END IF;

  -- Count related data before deletion
  SELECT COUNT(*) INTO auction_count FROM public.auctions WHERE seller_id = user_id_to_delete;
  SELECT COUNT(*) INTO bid_count FROM public.bids WHERE bidder_id = user_id_to_delete;
  SELECT COUNT(*) INTO notification_count FROM public.notifications WHERE user_id = user_id_to_delete;

  -- Start transaction
  BEGIN
    -- 1. Cancel active auctions owned by the user
    UPDATE public.auctions 
    SET status = 'cancelled', updated_at = NOW()
    WHERE seller_id = user_id_to_delete AND status IN ('draft', 'scheduled', 'active');

    -- 2. Remove user as winner from any auctions (handled by FK constraint)
    UPDATE public.auctions 
    SET winner_id = NULL 
    WHERE winner_id = user_id_to_delete;

    -- 3. Delete the public user record (CASCADE will handle related data)
    DELETE FROM public.users WHERE id = user_id_to_delete;

    -- Build success response
    result := json_build_object(
      'success', true,
      'message', 'User successfully deleted',
      'user_id', user_id_to_delete,
      'user_email', user_email,
      'deleted_data', json_build_object(
        'auctions', auction_count,
        'bids', bid_count,
        'notifications', notification_count
      )
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    result := json_build_object(
      'success', false,
      'message', 'Error deleting user: ' || SQLERRM,
      'user_id', user_id_to_delete
    );
  END;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION safe_delete_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID, JSONB) TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_watchers ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view active auctions" ON public.auctions FOR SELECT USING (status IN ('active', 'scheduled') OR auth.uid() = seller_id);
CREATE POLICY "Users can create auctions" ON public.auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update own auctions" ON public.auctions FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Users can view bids on their auctions or their own bids" ON public.bids FOR SELECT USING (
  auth.uid() = bidder_id OR 
  auth.uid() IN (SELECT seller_id FROM public.auctions WHERE id = auction_id)
);
CREATE POLICY "Users can create bids" ON public.bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own auction watches" ON public.auction_watchers FOR ALL USING (auth.uid() = user_id);

-- Categories are public
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
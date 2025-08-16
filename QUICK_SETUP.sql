-- SIMPLE SUPABASE SETUP FOR AUCTION SYSTEM
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/rbsvkrlzxlqnvoxbvnvb/sql)

-- 1. Create categories table first
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
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

-- 3. Create auctions table
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.users(id) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  starting_price DECIMAL(12,2) NOT NULL CHECK (starting_price > 0),
  current_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  reserve_price DECIMAL(12,2),
  bid_increment DECIMAL(12,2) NOT NULL DEFAULT 1.00 CHECK (bid_increment > 0),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'ended', 'completed', 'cancelled')),
  view_count INTEGER DEFAULT 0,
  bid_count INTEGER DEFAULT 0,
  winner_id UUID REFERENCES public.users(id),
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

-- 4. Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  bidder_id UUID REFERENCES public.users(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'outbid', 'winning', 'lost')),
  auto_bid_max_amount DECIMAL(12,2),
  is_auto_bid BOOLEAN DEFAULT FALSE,
  bid_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('outbid', 'bid_placed', 'auction_won', 'auction_ended', 'counter_offer', 'offer_accepted', 'offer_rejected', 'bid_accepted', 'bid_rejected')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  auction_id UUID REFERENCES public.auctions(id),
  bid_id UUID REFERENCES public.bids(id),
  is_read BOOLEAN DEFAULT FALSE,
  is_email_sent BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create counter_offers table
CREATE TABLE IF NOT EXISTS public.counter_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) NOT NULL,
  seller_id UUID REFERENCES public.users(id) NOT NULL,
  bidder_id UUID REFERENCES public.users(id) NOT NULL,
  original_bid_amount DECIMAL(12,2) NOT NULL,
  counter_amount DECIMAL(12,2) NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) NOT NULL,
  seller_id UUID REFERENCES public.users(id) NOT NULL,
  buyer_id UUID REFERENCES public.users(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  transaction_type VARCHAR(20) DEFAULT 'sale' CHECK (transaction_type IN ('sale', 'refund', 'commission')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  invoice_url TEXT,
  counter_offer_id UUID REFERENCES public.counter_offers(id),
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Insert sample categories with specific UUIDs
INSERT INTO public.categories (id, name, description, icon) VALUES
('11111111-1111-1111-1111-111111111111', 'Electronics', 'Computers, phones, gadgets and electronic devices', '💻'),
('22222222-2222-2222-2222-222222222222', 'Art & Collectibles', 'Paintings, sculptures, vintage items and collectibles', '🎨'),
('33333333-3333-3333-3333-333333333333', 'Jewelry & Watches', 'Fine jewelry, luxury watches and accessories', '💎'),
('44444444-4444-4444-4444-444444444444', 'Vehicles', 'Cars, motorcycles, boats and other vehicles', '🚗'),
('55555555-5555-5555-5555-555555555555', 'Real Estate', 'Property, land and real estate investments', '🏠'),
('66666666-6666-6666-6666-666666666666', 'Sports & Recreation', 'Sports equipment, outdoor gear and recreation items', '🏀'),
('77777777-7777-7777-7777-777777777777', 'Fashion & Accessories', 'Clothing, shoes, bags and fashion accessories', '👕'),
('88888888-8888-8888-8888-888888888888', 'Home & Garden', 'Furniture, decor, appliances and garden items', '🏡')
ON CONFLICT (id) DO NOTHING;

-- 9. Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 10. Create basic RLS policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (is_active = true);

CREATE POLICY "Public auctions are viewable by everyone" ON public.auctions FOR SELECT USING (status IN ('scheduled', 'active', 'ended', 'completed'));
CREATE POLICY "Sellers can view own auctions" ON public.auctions FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "Sellers can create auctions" ON public.auctions FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Sellers can update own auctions" ON public.auctions FOR UPDATE USING (seller_id = auth.uid());

CREATE POLICY "Bidders can view auction bids" ON public.bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.auctions WHERE id = auction_id AND status IN ('active', 'ended', 'completed'))
);
CREATE POLICY "Users can place bids" ON public.bids FOR INSERT WITH CHECK (
  bidder_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM public.auctions WHERE id = auction_id AND status = 'active')
);
CREATE POLICY "Users can update own bids" ON public.bids FOR UPDATE USING (bidder_id = auth.uid());

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view counter offers" ON public.counter_offers FOR SELECT USING (
  seller_id = auth.uid() OR bidder_id = auth.uid()
);
CREATE POLICY "Sellers can create counter offers" ON public.counter_offers FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Users can update counter offers" ON public.counter_offers FOR UPDATE USING (
  seller_id = auth.uid() OR bidder_id = auth.uid()
);

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (
  seller_id = auth.uid() OR buyer_id = auth.uid()
);
CREATE POLICY "System can create transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (
  seller_id = auth.uid() OR buyer_id = auth.uid()
);

-- 11. Create function to automatically insert user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON public.auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_start_time ON public.auctions(start_time);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_bid_time ON public.bids(bid_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_counter_offers_auction_id ON public.counter_offers(auction_id);
CREATE INDEX IF NOT EXISTS idx_counter_offers_status ON public.counter_offers(status);
CREATE INDEX IF NOT EXISTS idx_transactions_auction_id ON public.transactions(auction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

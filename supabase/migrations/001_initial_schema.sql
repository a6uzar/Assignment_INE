-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE auction_status AS ENUM ('draft', 'scheduled', 'active', 'ended', 'completed', 'cancelled');
CREATE TYPE bid_status AS ENUM ('active', 'outbid', 'winning', 'lost');
CREATE TYPE notification_type AS ENUM ('bid_placed', 'outbid', 'auction_won', 'auction_ended', 'counter_offer', 'offer_accepted', 'offer_rejected');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE counter_offer_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
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
  status auction_status DEFAULT 'draft',
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

-- Bids table
CREATE TABLE public.bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  bidder_id UUID REFERENCES public.users(id) NOT NULL,
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

-- Counter offers table
CREATE TABLE public.counter_offers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.users(id) NOT NULL,
  bidder_id UUID REFERENCES public.users(id) NOT NULL,
  original_bid_amount DECIMAL(12,2) NOT NULL,
  counter_amount DECIMAL(12,2) NOT NULL CHECK (counter_amount > 0),
  message TEXT,
  status counter_offer_status DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) NOT NULL,
  buyer_id UUID REFERENCES public.users(id) NOT NULL,
  seller_id UUID REFERENCES public.users(id) NOT NULL,
  counter_offer_id UUID REFERENCES public.counter_offers(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  commission_amount DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status transaction_status DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Auction watchers (users following auctions)
CREATE TABLE public.auction_watchers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auction_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_auctions_seller_id ON public.auctions(seller_id);
CREATE INDEX idx_auctions_category_id ON public.auctions(category_id);
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_start_time ON public.auctions(start_time);
CREATE INDEX idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX idx_auctions_featured ON public.auctions(featured);
CREATE INDEX idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX idx_bids_bid_time ON public.bids(bid_time);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_counter_offers_auction_id ON public.counter_offers(auction_id);
CREATE INDEX idx_counter_offers_status ON public.counter_offers(status);
CREATE INDEX idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON public.transactions(seller_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_watchers ENABLE ROW LEVEL SECURITY;

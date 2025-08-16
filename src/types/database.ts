// Types for the auction platform
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  bio?: string;
  date_of_birth?: string;
  verification_status: 'unverified' | 'pending' | 'verified';
  seller_rating: number;
  buyer_rating: number;
  total_sales: number;
  total_purchases: number;
  member_since: string;
  is_admin: boolean;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  starting_price: number;
  current_price: number;
  reserve_price?: number;
  buy_now_price?: number;
  bid_increment: number;
  final_price?: number;
  start_time: string;
  end_time: string;
  auto_extend_minutes?: number;
  category_id?: string;
  category: string;
  condition?: string;
  location?: string;
  image_url: string;
  images?: string[];
  seller_id: string;
  seller_name?: string;
  seller_rating?: number;
  bid_count: number;
  view_count: number;
  watchers: number;
  tags: string[];
  is_featured: boolean;
  auction_type: 'standard' | 'buy_now' | 'reserve';
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'completed' | 'cancelled';
  winner_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  users?: User;
  bids?: Bid[];
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  bid_time: string;
  is_auto_bid: boolean;
  max_auto_bid?: number;
  status: 'active' | 'outbid' | 'winning' | 'lost';
  created_at: string;
  // Relations
  bidder?: User;
  auction?: Auction;
  users?: User;
}

export interface Transaction {
  id: string;
  auction_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  commission_amount: number;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  transaction_type?: string;
  payment_method?: string;
  payment_id?: string;
  shipping_address?: string;
  tracking_number?: string;
  notes?: string;
  completed_at?: string;
  invoice_url?: string;
  counter_offer_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  auction?: Auction;
  buyer?: User;
  seller?: User;
  auctions?: Auction;
  users?: User;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'auction_won' | 'outbid' | 'auction_ended' | 'payment_reminder' | 'custom';
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  template_id: string;
  recipients: string[];
  status: 'draft' | 'scheduled' | 'sent';
  scheduled_at?: string;
  sent_at?: string;
  open_rate: number;
  click_rate: number;
  created_at: string;
  updated_at: string;
}

export interface SearchFilters {
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  condition: string;
  location: string;
  timeRemaining: string;
  sortBy: string;
  auctionType: string;
  seller: string;
  tags: string[];
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// Database types (matching Supabase generated types)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      auctions: {
        Row: Auction;
        Insert: Omit<Auction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Auction, 'id' | 'created_at' | 'updated_at'>>;
      };
      bids: {
        Row: Bid;
        Insert: Omit<Bid, 'id' | 'created_at'>;
        Update: Partial<Omit<Bid, 'id' | 'created_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
};

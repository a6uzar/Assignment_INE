import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Bid = Database['public']['Tables']['bids']['Row'];
export type BidInsert = Database['public']['Tables']['bids']['Insert'];

export const bidService = {
  // Get bids for an auction
  async getAuctionBids(auctionId: string) {
    return supabase
      .from('bids')
      .select(`
        *,
        users!bids_bidder_id_fkey(full_name, avatar_url)
      `)
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false });
  },

  // Get user's bids
  async getUserBids(userId: string) {
    return supabase
      .from('bids')
      .select(`
        *,
        auctions(title, status, end_time, current_price, images)
      `)
      .eq('bidder_id', userId)
      .order('bid_time', { ascending: false });
  },

  // Place a new bid
  async placeBid(bid: BidInsert) {
    // First validate the auction status and bid amount
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', bid.auction_id)
      .single();

    if (auctionError || !auction) {
      throw new Error('Auction not found');
    }

    if (auction.status !== 'active') {
      throw new Error('Auction is not active');
    }

    if (auction.seller_id === bid.bidder_id) {
      throw new Error('You cannot bid on your own auction');
    }

    // Calculate minimum bid amount
    const minBidAmount = auction.current_price === 0 
      ? auction.starting_price 
      : auction.current_price + auction.bid_increment;

    if (bid.amount < minBidAmount) {
      throw new Error(`Minimum bid amount is $${minBidAmount}`);
    }

    // Place the bid
    return supabase
      .from('bids')
      .insert({
        ...bid,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
      })
      .select(`
        *,
        users!bids_bidder_id_fkey(full_name, avatar_url)
      `)
      .single();
  },

  // Get current highest bid for auction
  async getHighestBid(auctionId: string) {
    return supabase
      .from('bids')
      .select(`
        *,
        users!bids_bidder_id_fkey(full_name, avatar_url)
      `)
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(1)
      .single();
  },

  // Get bid history for auction (for graphs/charts)
  async getBidHistory(auctionId: string) {
    return supabase
      .from('bids')
      .select('amount, bid_time, users!bids_bidder_id_fkey(full_name)')
      .eq('auction_id', auctionId)
      .order('bid_time', { ascending: true });
  },

  // Get user's active bids (where they're currently winning)
  async getUserActiveBids(userId: string) {
    return supabase
      .from('bids')
      .select(`
        *,
        auctions(id, title, current_price, end_time, status)
      `)
      .eq('bidder_id', userId)
      .eq('status', 'active')
      .order('bid_time', { ascending: false });
  },

  // Auto-bid functionality
  async setAutoBid(auctionId: string, userId: string, maxAmount: number) {
    return supabase
      .from('bids')
      .update({ 
        auto_bid_max_amount: maxAmount,
        is_auto_bid: true 
      })
      .eq('auction_id', auctionId)
      .eq('bidder_id', userId)
      .eq('status', 'active');
  },

  // Remove auto-bid
  async removeAutoBid(auctionId: string, userId: string) {
    return supabase
      .from('bids')
      .update({ 
        auto_bid_max_amount: null,
        is_auto_bid: false 
      })
      .eq('auction_id', auctionId)
      .eq('bidder_id', userId)
      .eq('status', 'active');
  },

  // Helper function to get client IP (simplified)
  async getClientIP(): Promise<string | null> {
    try {
      // In a real app, you'd get this from your backend
      // For now, we'll return null and let the database handle it
      return null;
    } catch (error) {
      return null;
    }
  },

  // Validate bid amount before placing
  async validateBidAmount(auctionId: string, amount: number): Promise<{
    isValid: boolean;
    minAmount?: number;
    error?: string;
  }> {
    const { data: auction, error } = await supabase
      .from('auctions')
      .select('starting_price, current_price, bid_increment, status, seller_id')
      .eq('id', auctionId)
      .single();

    if (error || !auction) {
      return { isValid: false, error: 'Auction not found' };
    }

    if (auction.status !== 'active') {
      return { isValid: false, error: 'Auction is not active' };
    }

    const minAmount = auction.current_price === 0 
      ? auction.starting_price 
      : auction.current_price + auction.bid_increment;

    if (amount < minAmount) {
      return { 
        isValid: false, 
        minAmount,
        error: `Minimum bid amount is $${minAmount}` 
      };
    }

    return { isValid: true, minAmount };
  },
};

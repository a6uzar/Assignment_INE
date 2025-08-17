import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Bid, ApiResponse } from '@/types/database';
import { handleError } from '@/lib/performance-utils';

type DbBid = Database['public']['Tables']['bids']['Row'];

// Helper function to convert database bid to application bid
function mapDbBidToBid(dbBid: any): Bid {
  return {
    ...dbBid,
    max_auto_bid: dbBid.auto_bid_max_amount,
    is_auto_bid: dbBid.is_auto_bid || false,
    status: dbBid.status || 'active',
    bid_time: dbBid.bid_time || dbBid.created_at,
    // Map relations with defaults
    bidder: dbBid.users || undefined,
    auction: dbBid.auction || undefined,
    users: dbBid.users || undefined,
  } as Bid;
}

export interface PlaceBidParams {
  auctionId: string;
  amount: number;
  userId: string;
  isAutoBid?: boolean;
  maxAutoBid?: number;
}

export interface BidService {
  placeBid: (params: PlaceBidParams) => Promise<ApiResponse<Bid>>;
  getBids: (auctionId: string) => Promise<ApiResponse<Bid[]>>;
  getUserBids: (userId: string) => Promise<ApiResponse<Bid[]>>;
}

export const bidService: BidService = {
  async placeBid(params) {
    try {
      const { data, error } = await supabase
        .from('bids')
        .insert({
          auction_id: params.auctionId,
          bidder_id: params.userId,
          amount: params.amount,
          is_auto_bid: params.isAutoBid || false,
          max_auto_bid: params.maxAutoBid,
          status: 'active',
          bid_time: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: handleError(error),
          details: error,
        },
      };
    }
  },

  async getBids(auctionId) {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          users:bidder_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('auction_id', auctionId)
        .order('amount', { ascending: false });

      if (error) throw error;

      return { success: true, data: (data || []).map(mapDbBidToBid) };
    } catch (error) {
      return {
        success: false,
        error: {
          message: handleError(error),
          details: error,
        },
      };
    }
  },

  async getUserBids(userId) {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          auction:auction_id (
            id,
            title,
            current_price,
            status,
            end_time,
            winner_id
          )
        `)
        .eq('bidder_id', userId)
        .order('bid_time', { ascending: false });

      if (error) throw error;

      return { success: true, data: (data || []).map(mapDbBidToBid) };
    } catch (error) {
      return {
        success: false,
        error: {
          message: handleError(error),
          details: error,
        },
      };
    }
  },
};

export default bidService;

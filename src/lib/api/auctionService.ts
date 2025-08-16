import { supabase } from '@/integrations/supabase/client';
import { Auction, ApiResponse } from '@/types/database';
import { handleError } from '@/lib/performance-utils';

export interface CreateAuctionParams {
  title: string;
  description: string;
  starting_price: number;
  reserve_price?: number;
  start_time: string;
  end_time: string;
  category: string;
  condition: string;
  location: string;
  image_url: string;
  images?: string[];
  seller_id: string;
  tags: string[];
  auction_type: 'standard' | 'buy_now' | 'reserve';
}

export interface UpdateAuctionParams {
  id: string;
  title?: string;
  description?: string;
  reserve_price?: number;
  category?: string;
  condition?: string;
  location?: string;
  image_url?: string;
  images?: string[];
  tags?: string[];
}

export interface AuctionService {
  createAuction: (params: CreateAuctionParams) => Promise<ApiResponse<Auction>>;
  updateAuction: (params: UpdateAuctionParams) => Promise<ApiResponse<Auction>>;
  getAuction: (id: string) => Promise<ApiResponse<Auction>>;
  getAuctions: (params?: {
    category?: string;
    status?: string;
    seller_id?: string;
    limit?: number;
    offset?: number;
  }) => Promise<ApiResponse<Auction[]>>;
  deleteAuction: (id: string) => Promise<ApiResponse<void>>;
  endAuction: (id: string) => Promise<ApiResponse<Auction>>;
}

export const auctionService: AuctionService = {
  async createAuction(params) {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .insert({
          title: params.title,
          description: params.description,
          starting_price: params.starting_price,
          current_price: params.starting_price,
          reserve_price: params.reserve_price,
          start_time: params.start_time,
          end_time: params.end_time,
          category_id: params.category,
          category: params.category,
          condition: params.condition,
          location: params.location,
          image_url: params.image_url,
          images: params.images || [],
          seller_id: params.seller_id,
          seller_name: '',
          seller_rating: 0,
          bid_count: 0,
          view_count: 0,
          watchers: 0,
          tags: params.tags,
          is_featured: false,
          auction_type: params.auction_type,
          status: 'scheduled',
          bid_increment: 1.0,
          auto_extend_minutes: 5,
        })
        .select('*')
        .single();

      if (error) throw error;

      return { success: true, data: data as Auction };
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

  async updateAuction(params) {
    try {
      const { id, ...updateData } = params;
      const { data, error } = await supabase
        .from('auctions')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return { success: true, data: data as Auction };
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

  async getAuction(id) {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          *,
          users:seller_id (
            id,
            full_name,
            avatar_url,
            rating
          ),
          bids (
            id,
            amount,
            bid_time,
            bidder_id,
            users:bidder_id (
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data: data as Auction };
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

  async getAuctions(params = {}) {
    try {
      let query = supabase
        .from('auctions')
        .select(`
          *,
          users:seller_id (
            id,
            full_name,
            avatar_url,
            rating
          )
        `);

      if (params.category) {
        query = query.eq('category_id', params.category);
      }

      if (params.status) {
        query = query.eq('status', params.status as 'draft' | 'scheduled' | 'active' | 'ended' | 'completed' | 'cancelled');
      }

      if (params.seller_id) {
        query = query.eq('seller_id', params.seller_id);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: (data || []) as Auction[] };
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

  async deleteAuction(id) {
    try {
      const { error } = await supabase
        .from('auctions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: undefined };
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

  async endAuction(id) {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .update({ status: 'ended' })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return { success: true, data: data as Auction };
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

export default auctionService;

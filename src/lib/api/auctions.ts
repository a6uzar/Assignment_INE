import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Auction = Database['public']['Tables']['auctions']['Row'];
export type AuctionInsert = Database['public']['Tables']['auctions']['Insert'];
export type AuctionUpdate = Database['public']['Tables']['auctions']['Update'];

export type Bid = Database['public']['Tables']['bids']['Row'];
export type BidInsert = Database['public']['Tables']['bids']['Insert'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type CounterOffer = Database['public']['Tables']['counter_offers']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];

export const auctionService = {
  // Get all auctions with optional filters
  async getAuctions(filters?: {
    status?: string;
    category?: string;
    search?: string;
    sellerId?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('auctions')
      .select(`
        *,
        categories(name, icon),
        users!auctions_seller_id_fkey(full_name, avatar_url),
        bids(count)
      `);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status as Database['public']['Enums']['auction_status']);
    }

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    return query.order('created_at', { ascending: false });
  },

  // Get single auction with full details
  async getAuction(id: string) {
    return supabase
      .from('auctions')
      .select(`
        *,
        categories(name, icon, description),
        users!auctions_seller_id_fkey(full_name, avatar_url, email),
        bids(
          *,
          users!bids_bidder_id_fkey(full_name, avatar_url)
        ),
        auction_watchers(count)
      `)
      .eq('id', id)
      .single();
  },

  // Create new auction
  async createAuction(auction: AuctionInsert) {
    return supabase
      .from('auctions')
      .insert(auction)
      .select()
      .single();
  },

  // Update auction
  async updateAuction(id: string, updates: AuctionUpdate) {
    return supabase
      .from('auctions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  // Delete auction
  async deleteAuction(id: string) {
    return supabase
      .from('auctions')
      .delete()
      .eq('id', id);
  },

  // Get auction statistics
  async getAuctionStats() {
    const [totalResult, activeResult, endedResult] = await Promise.all([
      supabase.from('auctions').select('id', { count: 'exact', head: true }),
      supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'ended'),
    ]);

    return {
      total: totalResult.count || 0,
      active: activeResult.count || 0,
      ended: endedResult.count || 0,
    };
  },

  // Watch/unwatch auction
  async toggleWatchAuction(auctionId: string, userId: string) {
    const { data: existing } = await supabase
      .from('auction_watchers')
      .select('id')
      .eq('auction_id', auctionId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return supabase
        .from('auction_watchers')
        .delete()
        .eq('auction_id', auctionId)
        .eq('user_id', userId);
    } else {
      return supabase
        .from('auction_watchers')
        .upsert({
          auction_id: auctionId,
          user_id: userId
        }, {
          onConflict: 'user_id,auction_id',
          ignoreDuplicates: true
        });
    }
  },

  // Increment view count
  async incrementViewCount(id: string) {
    const { data: auction } = await supabase
      .from('auctions')
      .select('view_count')
      .eq('id', id)
      .single();

    if (auction) {
      return supabase
        .from('auctions')
        .update({ view_count: auction.view_count + 1 })
        .eq('id', id);
    }
  },
};

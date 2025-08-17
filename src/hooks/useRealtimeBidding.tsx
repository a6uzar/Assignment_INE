import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Database } from '@/integrations/supabase/types';

type Bid = Database['public']['Tables']['bids']['Row'];
type Auction = Database['public']['Tables']['auctions']['Row'];

interface RealtimeBiddingState {
  currentBid: Bid | null;
  bidHistory: Bid[];
  isLoading: boolean;
  error: string | null;
  auction: Auction | null;
  timeRemaining: number;
  isAuctionActive: boolean;
}

interface UseBiddingOptions {
  auctionId: string;
  autoRefresh?: boolean;
  enableNotifications?: boolean;
}

export function useRealtimeBidding({
  auctionId,
  autoRefresh = true,
  enableNotifications = true
}: UseBiddingOptions) {
  const [state, setState] = useState<RealtimeBiddingState>({
    currentBid: null,
    bidHistory: [],
    isLoading: true,
    error: null,
    auction: null,
    timeRemaining: 0,
    isAuctionActive: false,
  });

  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch initial auction and bid data
  const fetchAuctionData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch auction details
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select(`
          *,
          categories(name, icon),
          users!auctions_seller_id_fkey(full_name, avatar_url)
        `)
        .eq('id', auctionId)
        .single();

      if (auctionError) throw auctionError;

      // Fetch bid history
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select(`
          *,
          users(full_name, avatar_url)
        `)
        .eq('auction_id', auctionId)
        .eq('status', 'active')
        .order('amount', { ascending: false })
        .limit(50);

      if (bidsError) throw bidsError;

      const currentBid = bids?.[0] || null;
      const timeRemaining = auction ? new Date(auction.end_time).getTime() - Date.now() : 0;
      const isAuctionActive = auction?.status === 'active' && timeRemaining > 0;

      setState({
        currentBid,
        bidHistory: bids || [],
        isLoading: false,
        error: null,
        auction,
        timeRemaining: Math.max(0, timeRemaining),
        isAuctionActive,
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch auction data';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [auctionId]);

  // Place a new bid
  const placeBid = useCallback(async (amount: number, isAutoBid = false, maxAmount?: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to place a bid.",
        variant: "destructive",
      });
      return { success: false, error: "Not authenticated" };
    }

    if (!state.auction || !state.isAuctionActive) {
      toast({
        title: "Auction Unavailable",
        description: "This auction is no longer active.",
        variant: "destructive",
      });
      return { success: false, error: "Auction not active" };
    }

    if (amount <= (state.currentBid?.amount || state.auction.starting_price)) {
      toast({
        title: "Invalid Bid",
        description: "Your bid must be higher than the current bid.",
        variant: "destructive",
      });
      return { success: false, error: "Bid too low" };
    }

    if (state.auction.seller_id === user.id) {
      toast({
        title: "Invalid Action",
        description: "You cannot bid on your own auction.",
        variant: "destructive",
      });
      return { success: false, error: "Cannot bid on own auction" };
    }

    try {
      const { data: newBid, error } = await supabase
        .from('bids')
        .insert({
          auction_id: auctionId,
          bidder_id: user.id,
          amount,
          is_auto_bid: isAutoBid,
          auto_bid_max_amount: maxAmount,
          status: 'active',
        })
        .select(`
          *,
          users(full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update auction current price
      await supabase
        .from('auctions')
        .update({
          current_price: amount,
          bid_count: (state.auction.bid_count || 0) + 1
        })
        .eq('id', auctionId);

      // Mark previous bids as outbid
      if (state.currentBid) {
        await supabase
          .from('bids')
          .update({ status: 'outbid' })
          .eq('id', state.currentBid.id);
      }

      toast({
        title: "Bid Placed!",
        description: `Your bid of $${amount.toLocaleString()} has been placed successfully.`,
      });

      return { success: true, data: newBid };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place bid';
      toast({
        title: "Bid Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [user, state.auction, state.currentBid, state.isAuctionActive, auctionId, toast]);

  // Auto-extend auction if bid placed in last minutes
  const handleAutoExtend = useCallback(async () => {
    // Get current state values to avoid stale closures
    setState(currentState => {
      if (!currentState.auction || !currentState.isAuctionActive) return currentState;

      const timeLeft = currentState.timeRemaining;
      const autoExtendThreshold = (currentState.auction.auto_extend_minutes || 5) * 60 * 1000;

      if (timeLeft > 0 && timeLeft < autoExtendThreshold) {
        const newEndTime = new Date(Date.now() + autoExtendThreshold);

        // Update auction end time
        supabase
          .from('auctions')
          .update({ end_time: newEndTime.toISOString() })
          .eq('id', auctionId)
          .then(() => {
            if (enableNotifications) {
              toast({
                title: "Auction Extended",
                description: `Auction extended by ${currentState.auction!.auto_extend_minutes} minutes due to recent bidding activity.`,
              });
            }
          });
      }

      return currentState;
    });
  }, [auctionId, enableNotifications, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!auctionId) return;

    // Initial data fetch
    fetchAuctionData();

    // Subscribe to bid changes
    const bidsSubscription = supabase
      .channel(`auction-bids-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        async (payload) => {
          console.log('Real-time bid update:', payload);

          if (payload.eventType === 'INSERT') {
            // New bid placed
            const { data: newBid } = await supabase
              .from('bids')
              .select(`
                *,
                users(full_name, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (newBid) {
              setState(prev => ({
                ...prev,
                currentBid: newBid,
                bidHistory: [newBid, ...prev.bidHistory.slice(0, 49)],
              }));

              // Show notification for new bids (except own bids)
              if (enableNotifications && newBid.bidder_id !== user?.id) {
                toast({
                  title: "New Bid Placed",
                  description: `${newBid.users?.full_name || 'Someone'} bid $${newBid.amount.toLocaleString()}`,
                });
              }

              // Check for auto-extend
              handleAutoExtend();
            }
          }
        }
      )
      .subscribe();

    // Subscribe to auction changes
    const auctionSubscription = supabase
      .channel(`auction-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`,
        },
        (payload) => {
          console.log('Real-time auction update:', payload);
          setState(prev => ({
            ...prev,
            auction: { ...prev.auction, ...payload.new } as Auction,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bidsSubscription);
      supabase.removeChannel(auctionSubscription);
    };
  }, [auctionId, fetchAuctionData, handleAutoExtend, enableNotifications, user?.id, toast]);

  // Timer for countdown
  useEffect(() => {
    if (!autoRefresh || !state.auction || !state.isAuctionActive) return;

    const timer = setInterval(() => {
      const timeRemaining = new Date(state.auction!.end_time).getTime() - Date.now();
      const isActive = state.auction!.status === 'active' && timeRemaining > 0;

      setState(prev => ({
        ...prev,
        timeRemaining: Math.max(0, timeRemaining),
        isAuctionActive: isActive,
      }));

      // Auto-end auction when time expires
      if (timeRemaining <= 0 && state.isAuctionActive) {
        setState(prev => ({ ...prev, isAuctionActive: false }));

        if (enableNotifications) {
          toast({
            title: "Auction Ended",
            description: "This auction has ended.",
          });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, state.auction, state.isAuctionActive, enableNotifications, toast]);

  return {
    ...state,
    placeBid,
    refreshData: fetchAuctionData,
  };
}

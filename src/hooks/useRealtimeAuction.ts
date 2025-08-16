import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Auction, Bid } from '@/lib/api/auctions';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeAuction(auctionId: string) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch initial auction data
  const fetchAuction = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          *,
          categories(name, icon, description),
          users!auctions_seller_id_fkey(full_name, avatar_url, email)
        `)
        .eq('id', auctionId)
        .single();

      if (error) throw error;
      setAuction(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load auction';
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load auction details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [auctionId, toast]);

  // Fetch initial bids
  const fetchBids = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          users!bids_bidder_id_fkey(full_name, avatar_url)
        `)
        .eq('auction_id', auctionId)
        .order('bid_time', { ascending: false });

      if (error) throw error;
      setBids(data || []);
    } catch (err: unknown) {
      console.error('Error fetching bids:', err instanceof Error ? err.message : 'Unknown error');
    }
  }, [auctionId]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchAuction();
    fetchBids();

    // Subscribe to auction updates
    const auctionChannel = supabase
      .channel(`auction:${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`,
        },
        (payload) => {
          setAuction(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    // Subscribe to new bids
    const bidsChannel = supabase
      .channel(`bids:${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        async (payload) => {
          // Fetch the bid with user details
          const { data: newBid } = await supabase
            .from('bids')
            .select(`
              *,
              users!bids_bidder_id_fkey(full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newBid) {
            setBids(prev => [newBid, ...prev]);
            
            // Show toast notification for new bids
            toast({
              title: "New Bid!",
              description: `$${newBid.amount} bid placed by ${newBid.users?.full_name}`,
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [auctionId, fetchAuction, fetchBids, toast]);

  return {
    auction,
    bids,
    loading,
    error,
    refetch: useCallback(() => {
      fetchAuction();
      fetchBids();
    }, [fetchAuction, fetchBids]),
  };
}

export function useRealtimeAuctions() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial auctions
    const fetchAuctions = async () => {
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          *,
          categories(name, icon),
          users!auctions_seller_id_fkey(full_name, avatar_url)
        `)
        .in('status', ['active', 'scheduled', 'ended'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAuctions(data);
      }
      setLoading(false);
    };

    fetchAuctions();

    // Subscribe to auction changes
    const channel = supabase
      .channel('auctions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auctions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAuctions(prev => [payload.new as Auction, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAuctions(prev =>
              prev.map(auction =>
                auction.id === payload.new.id
                  ? { ...auction, ...payload.new }
                  : auction
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAuctions(prev =>
              prev.filter(auction => auction.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { auctions, loading };
}

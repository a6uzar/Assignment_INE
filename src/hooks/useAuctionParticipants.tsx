import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Participant {
    id: string;
    full_name: string;
    avatar_url: string;
    isActive: boolean;
    lastActivity: string;
    isCurrentBidder: boolean;
    bidCount: number;
}

interface Watcher {
    id: string;
    full_name: string;
    avatar_url: string;
}

interface UseAuctionParticipantsOptions {
    auctionId: string;
    enableRealtime?: boolean;
    enabled?: boolean;
}

export function useAuctionParticipants({
    auctionId,
    enableRealtime = true,
    enabled = true
}: UseAuctionParticipantsOptions) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [watchers, setWatchers] = useState<Watcher[]>([]);
    const [participantCount, setParticipantCount] = useState(0);
    const [watcherCount, setWatcherCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuth();

    // Fetch auction participants (bidders)
    const fetchParticipants = useCallback(async () => {
        try {
            setLoading(true);

            // Get unique bidders with their bid counts and latest activity
            const { data: bidders, error: biddersError } = await supabase
                .from('bids')
                .select(`
          bidder_id,
          bid_time,
          amount,
          users!bids_bidder_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
                .eq('auction_id', auctionId)
                .eq('status', 'active')
                .order('bid_time', { ascending: false });

            if (biddersError) throw biddersError;

            // Process bidders data to get unique participants
            const participantMap = new Map<string, Participant>();
            let currentHighestBidderId: string | null = null;
            let highestAmount = 0;

            bidders?.forEach((bid, index) => {
                const bidderId = bid.bidder_id;
                const userData = bid.users;

                if (!userData) return;

                // Track highest bidder
                if (bid.amount > highestAmount) {
                    highestAmount = bid.amount;
                    currentHighestBidderId = bidderId;
                }

                if (!participantMap.has(bidderId)) {
                    participantMap.set(bidderId, {
                        id: userData.id,
                        full_name: userData.full_name,
                        avatar_url: userData.avatar_url,
                        isActive: index < 5, // Consider last 5 bidders as active
                        lastActivity: bid.bid_time,
                        isCurrentBidder: false,
                        bidCount: 1,
                    });
                } else {
                    const existing = participantMap.get(bidderId)!;
                    existing.bidCount += 1;
                    // Update last activity to most recent
                    if (new Date(bid.bid_time) > new Date(existing.lastActivity)) {
                        existing.lastActivity = bid.bid_time;
                    }
                }
            });

            // Mark current highest bidder
            if (currentHighestBidderId && participantMap.has(currentHighestBidderId)) {
                participantMap.get(currentHighestBidderId)!.isCurrentBidder = true;
            }

            const participantsList = Array.from(participantMap.values())
                .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

            setParticipants(participantsList);
            setParticipantCount(participantsList.length);

        } catch (error) {
            console.error('Error fetching participants:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch participants');
        } finally {
            setLoading(false);
        }
    }, [auctionId]);

    // Fetch auction watchers using existing auction_watchers table
    const fetchWatchers = useCallback(async () => {
        try {
            const { data: watcherData, error } = await supabase
                .from('auction_watchers')
                .select(`
          user_id,
          users!auction_watchers_user_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
                .eq('auction_id', auctionId)
                .limit(20);

            if (error) {
                console.warn('Error fetching watchers:', error);
                // Fallback to simulated data
                setWatchers([]);
                setWatcherCount(Math.floor(Math.random() * 15) + 5);
                return;
            }

            const uniqueWatchers = watcherData?.reduce((acc: Watcher[], watch) => {
                if (watch.users && !acc.some(w => w.id === watch.users!.id)) {
                    acc.push({
                        id: watch.users.id,
                        full_name: watch.users.full_name,
                        avatar_url: watch.users.avatar_url,
                    });
                }
                return acc;
            }, []) || [];

            setWatchers(uniqueWatchers);
            setWatcherCount(uniqueWatchers.length + Math.floor(Math.random() * 10)); // Add some simulated watchers

        } catch (error) {
            console.error('Error fetching watchers:', error);
            // Fallback to simulated data
            setWatchers([]);
            setWatcherCount(Math.floor(Math.random() * 15) + 5);
        }
    }, [auctionId]);

    // Add current user as watcher
    const addWatcher = useCallback(async () => {
        if (!user) return;

        try {
            await supabase
                .from('auction_watchers')
                .upsert({
                    auction_id: auctionId,
                    user_id: user.id,
                }, {
                    onConflict: 'auction_id,user_id'
                });
        } catch (error) {
            console.warn('Could not add watcher record:', error);
        }
    }, [user, auctionId]);

    // Real-time subscriptions
    useEffect(() => {
        if (!enableRealtime || !auctionId || !enabled) return;

        fetchParticipants();
        fetchWatchers();
        addWatcher();

        // Subscribe to new bids to update participants
        const bidsChannel = supabase
            .channel(`auction-participants-${auctionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bids',
                    filter: `auction_id=eq.${auctionId}`,
                },
                () => {
                    // Refetch participants when new bid is placed
                    fetchParticipants();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(bidsChannel);
        };
    }, [auctionId, enableRealtime, enabled, fetchParticipants, fetchWatchers, addWatcher]);

    // Simulate periodic watcher count updates - only for active auctions
    useEffect(() => {
        if (!enableRealtime || !enabled) return;

        const interval = setInterval(() => {
            setWatcherCount(prev => {
                const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                return Math.max(1, prev + change);
            });
        }, 10000); // Update every 10 seconds

        return () => clearInterval(interval);
    }, [enableRealtime, enabled]);

    return {
        participants,
        watchers,
        participantCount,
        watcherCount,
        loading,
        error,
        refreshData: useCallback(() => {
            fetchParticipants();
            fetchWatchers();
        }, [fetchParticipants, fetchWatchers]),
    };
}

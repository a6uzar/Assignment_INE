import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityEvent {
    id: string;
    type: 'bid' | 'watch' | 'join' | 'milestone' | 'extension' | 'warning';
    timestamp: string;
    user?: {
        id: string;
        name: string;
        avatar: string;
    };
    data: {
        amount?: number;
        previousAmount?: number;
        milestone?: string;
        message?: string;
        isCurrentUser?: boolean;
    };
}

interface AuctionStats {
    totalBids: number;
    uniqueBidders: number;
    totalWatchers: number;
    averageBidTime: number;
    lastBidTime?: string;
    highestBid: number;
    bidsInLastMinute: number;
    recentBidders: string[];
}

export function useAuctionActivity(auctionId: string, currentUserId?: string) {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [stats, setStats] = useState<AuctionStats>({
        totalBids: 0,
        uniqueBidders: 0,
        totalWatchers: 0,
        averageBidTime: 0,
        highestBid: 0,
        bidsInLastMinute: 0,
        recentBidders: [],
    });
    const [loading, setLoading] = useState(true);

    // Generate milestone events based on bid amounts
    const generateMilestoneEvent = (amount: number, previousHigh: number): ActivityEvent | null => {
        const milestones = [1000, 5000, 10000, 25000, 50000, 100000];
        const crossedMilestone = milestones.find(
            milestone => amount >= milestone && previousHigh < milestone
        );

        if (crossedMilestone) {
            return {
                id: `milestone-${crossedMilestone}-${Date.now()}`,
                type: 'milestone',
                timestamp: new Date().toISOString(),
                data: {
                    milestone: `🎉 Milestone reached: $${crossedMilestone.toLocaleString()}!`,
                    amount: crossedMilestone,
                },
            };
        }

        return null;
    };

    // Generate time extension events
    const generateExtensionEvent = (reason: string): ActivityEvent => {
        return {
            id: `extension-${Date.now()}`,
            type: 'extension',
            timestamp: new Date().toISOString(),
            data: {
                message: `⏰ ${reason}`,
            },
        };
    };

    // Generate warning events for auction state
    const generateWarningEvent = (message: string): ActivityEvent => {
        return {
            id: `warning-${Date.now()}`,
            type: 'warning',
            timestamp: new Date().toISOString(),
            data: {
                message: `⚠️ ${message}`,
            },
        };
    };

    // Fetch initial activity data - simplified version for now
    const fetchActivityData = async () => {
        try {
            // For now, create some mock data until we can properly integrate with the database
            const mockEvents: ActivityEvent[] = [];

            // Add some sample events
            mockEvents.push({
                id: 'sample-1',
                type: 'milestone',
                timestamp: new Date(Date.now() - 60000).toISOString(),
                data: {
                    milestone: '🎉 Auction started!',
                },
            });

            setEvents(mockEvents);
            setStats({
                totalBids: 0,
                uniqueBidders: 0,
                totalWatchers: 0,
                averageBidTime: 0,
                highestBid: 0,
                bidsInLastMinute: 0,
                recentBidders: [],
            });

        } catch (error) {
            console.error('Error fetching activity data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Set up real-time subscriptions
    useEffect(() => {
        fetchActivityData();

        // Subscribe to new bids
        const bidsSubscription = supabase
            .channel(`auction-bids-${auctionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bids',
                    filter: `auction_id=eq.${auctionId}`,
                },
                async (payload) => {
                    // Fetch user data for the new bid
                    const { data: userData } = await supabase
                        .from('users')
                        .select('id, full_name, avatar_url')
                        .eq('id', payload.new.bidder_id)
                        .single();

                    const newBidEvent: ActivityEvent = {
                        id: `bid-${payload.new.id}`,
                        type: 'bid',
                        timestamp: payload.new.created_at,
                        user: {
                            id: userData?.id || payload.new.bidder_id,
                            name: userData?.full_name || 'Anonymous',
                            avatar: userData?.avatar_url || '',
                        },
                        data: {
                            amount: payload.new.amount,
                            isCurrentUser: payload.new.bidder_id === currentUserId,
                        },
                    };

                    setEvents(prev => {
                        const updated = [newBidEvent, ...prev];

                        // Check for milestone
                        const previousHigh = Math.max(...prev.filter(e => e.type === 'bid').map(e => e.data.amount || 0), 0);
                        const milestoneEvent = generateMilestoneEvent(payload.new.amount, previousHigh);

                        if (milestoneEvent) {
                            return [newBidEvent, milestoneEvent, ...prev];
                        }

                        return updated;
                    });

                    // Update stats
                    setStats(prev => ({
                        ...prev,
                        totalBids: prev.totalBids + 1,
                        highestBid: Math.max(prev.highestBid, payload.new.amount),
                        lastBidTime: payload.new.created_at,
                    }));
                }
            )
            .subscribe();

        // Subscribe to new watchers
        const watchersSubscription = supabase
            .channel(`auction-watchers-${auctionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'auction_watchers',
                    filter: `auction_id=eq.${auctionId}`,
                },
                async (payload) => {
                    // Fetch user data for the new watcher
                    const { data: userData } = await supabase
                        .from('users')
                        .select('id, full_name, avatar_url')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newWatchEvent: ActivityEvent = {
                        id: `watch-${payload.new.id}`,
                        type: 'watch',
                        timestamp: payload.new.created_at,
                        user: {
                            id: userData?.id || payload.new.user_id,
                            name: userData?.full_name || 'Anonymous',
                            avatar: userData?.avatar_url || '',
                        },
                        data: {
                            isCurrentUser: payload.new.user_id === currentUserId,
                        },
                    };

                    setEvents(prev => [newWatchEvent, ...prev]);
                    setStats(prev => ({
                        ...prev,
                        totalWatchers: prev.totalWatchers + 1,
                    }));
                }
            )
            .subscribe();

        return () => {
            bidsSubscription.unsubscribe();
            watchersSubscription.unsubscribe();
        };
    }, [auctionId, currentUserId]);

    // Public methods for adding events
    const addExtensionEvent = (reason: string) => {
        const event = generateExtensionEvent(reason);
        setEvents(prev => [event, ...prev]);
    };

    const addWarningEvent = (message: string) => {
        const event = generateWarningEvent(message);
        setEvents(prev => [event, ...prev]);
    };

    return {
        events,
        stats,
        loading,
        addExtensionEvent,
        addWarningEvent,
        refetch: fetchActivityData,
    };
}

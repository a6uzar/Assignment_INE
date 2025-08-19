import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BiddingActivity {
    timestamp: string;
    bidder_id: string;
    amount: number;
}

interface BiddingPressure {
    level: 'low' | 'medium' | 'high' | 'extreme';
    recentBids: number;
    lastBidTime: string | null;
    description: string;
    bidsInLastMinute: number;
    bidsInLast5Minutes: number;
    averageBidInterval: number;
    isHeating: boolean;
}

interface UseBiddingPressureOptions {
    auctionId: string;
    enabled?: boolean;
    updateInterval?: number;
}

export function useBiddingPressure({
    auctionId,
    enabled = true,
    updateInterval = 5000 // Update every 5 seconds
}: UseBiddingPressureOptions) {
    const [biddingPressure, setBiddingPressure] = useState<BiddingPressure>({
        level: 'low',
        recentBids: 0,
        lastBidTime: null,
        description: 'No recent bidding activity',
        bidsInLastMinute: 0,
        bidsInLast5Minutes: 0,
        averageBidInterval: 0,
        isHeating: false,
    });

    const [recentActivity, setRecentActivity] = useState<BiddingActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const calculatePressureMetrics = useCallback((activities: BiddingActivity[]) => {
        const now = new Date().getTime();
        const oneMinuteAgo = now - (1 * 60 * 1000);
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        const fifteenMinutesAgo = now - (15 * 60 * 1000);

        // Filter activities by time windows
        const bidsInLastMinute = activities.filter(
            activity => new Date(activity.timestamp).getTime() > oneMinuteAgo
        ).length;

        const bidsInLast5Minutes = activities.filter(
            activity => new Date(activity.timestamp).getTime() > fiveMinutesAgo
        ).length;

        const bidsInLast15Minutes = activities.filter(
            activity => new Date(activity.timestamp).getTime() > fifteenMinutesAgo
        ).length;

        // Calculate average bid interval
        let averageBidInterval = 0;
        if (activities.length > 1) {
            const intervals: number[] = [];
            for (let i = 0; i < activities.length - 1; i++) {
                const current = new Date(activities[i].timestamp).getTime();
                const next = new Date(activities[i + 1].timestamp).getTime();
                intervals.push(current - next);
            }
            averageBidInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        }

        // Determine pressure level
        let level: 'low' | 'medium' | 'high' | 'extreme';
        let description: string;
        let isHeating = false;

        if (bidsInLastMinute >= 5) {
            level = 'extreme';
            description = `🔥 EXTREME ACTIVITY: ${bidsInLastMinute} bids in last minute!`;
            isHeating = true;
        } else if (bidsInLastMinute >= 3 || bidsInLast5Minutes >= 8) {
            level = 'high';
            description = `⚡ HIGH ACTIVITY: ${bidsInLast5Minutes} bids in last 5 minutes`;
            isHeating = true;
        } else if (bidsInLast5Minutes >= 3 || bidsInLast15Minutes >= 6) {
            level = 'medium';
            description = `📈 MODERATE ACTIVITY: ${bidsInLast15Minutes} bids in last 15 minutes`;
            isHeating = bidsInLast5Minutes > bidsInLast15Minutes / 3;
        } else {
            level = 'low';
            description = bidsInLast15Minutes > 0
                ? `💭 CALM BIDDING: ${bidsInLast15Minutes} recent bids`
                : '😴 QUIET PERIOD: No recent bidding activity';
        }

        const lastBidTime = activities.length > 0 ? activities[0].timestamp : null;

        return {
            level,
            recentBids: bidsInLast15Minutes,
            lastBidTime,
            description,
            bidsInLastMinute,
            bidsInLast5Minutes,
            averageBidInterval: Math.round(averageBidInterval / 1000), // Convert to seconds
            isHeating,
        };
    }, []);

    const fetchBiddingActivity = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch recent bids (last 2 hours)
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

            const { data: recentBids, error: bidsError } = await supabase
                .from('bids')
                .select('bid_time, bidder_id, amount')
                .eq('auction_id', auctionId)
                .gte('bid_time', twoHoursAgo)
                .order('bid_time', { ascending: false })
                .limit(100);

            if (bidsError) throw bidsError;

            const activities: BiddingActivity[] = (recentBids || []).map(bid => ({
                timestamp: bid.bid_time,
                bidder_id: bid.bidder_id,
                amount: bid.amount,
            }));

            setRecentActivity(activities);

            // Calculate pressure metrics
            const pressureMetrics = calculatePressureMetrics(activities);
            setBiddingPressure(pressureMetrics);

        } catch (error) {
            console.error('Error fetching bidding activity:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch bidding activity');
        } finally {
            setLoading(false);
        }
    }, [auctionId, calculatePressureMetrics]);

    // Real-time subscription to new bids
    useEffect(() => {
        if (!enabled || !auctionId) return;

        // Initial fetch
        fetchBiddingActivity();

        // Subscribe to real-time bid updates
        const channel = supabase
            .channel(`bidding-pressure-${auctionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bids',
                    filter: `auction_id=eq.${auctionId}`,
                },
                (payload) => {
                    // Add new bid to activity
                    const newActivity: BiddingActivity = {
                        timestamp: payload.new.bid_time,
                        bidder_id: payload.new.bidder_id,
                        amount: payload.new.amount,
                    };

                    setRecentActivity(prev => {
                        const updatedActivities = [newActivity, ...prev.slice(0, 99)];

                        // Calculate pressure with updated activities to avoid stale closure
                        const newPressureMetrics = calculatePressureMetrics(updatedActivities);
                        setBiddingPressure(newPressureMetrics);

                        return updatedActivities;
                    });
                }
            )
            .subscribe();

        // Periodic updates - only if polling is needed
        let interval: NodeJS.Timeout | null = null;
        if (updateInterval > 0) {
            interval = setInterval(fetchBiddingActivity, updateInterval);
        }

        return () => {
            supabase.removeChannel(channel);
            if (interval) clearInterval(interval);
        };
    }, [auctionId, enabled, fetchBiddingActivity, updateInterval, calculatePressureMetrics]);

    // Get pressure trend (increasing, stable, decreasing)
    const getPressureTrend = useCallback(() => {
        const now = new Date().getTime();
        const currentWindow = recentActivity.filter(
            activity => new Date(activity.timestamp).getTime() > now - (5 * 60 * 1000)
        ).length;

        const previousWindow = recentActivity.filter(
            activity => {
                const timestamp = new Date(activity.timestamp).getTime();
                return timestamp > now - (10 * 60 * 1000) && timestamp <= now - (5 * 60 * 1000);
            }
        ).length;

        if (currentWindow > previousWindow * 1.5) return 'increasing';
        if (currentWindow < previousWindow * 0.7) return 'decreasing';
        return 'stable';
    }, [recentActivity]);

    // Get unique bidders in recent activity
    const getActiveBidders = useCallback(() => {
        const now = new Date().getTime();
        const recentBidders = new Set(
            recentActivity
                .filter(activity => new Date(activity.timestamp).getTime() > now - (15 * 60 * 1000))
                .map(activity => activity.bidder_id)
        );
        return recentBidders.size;
    }, [recentActivity]);

    // Get bidding intensity score (0-100)
    const getIntensityScore = useCallback(() => {
        const { bidsInLastMinute, bidsInLast5Minutes, averageBidInterval } = biddingPressure;

        let score = 0;

        // Points for recent bids
        score += bidsInLastMinute * 15; // 15 points per bid in last minute
        score += bidsInLast5Minutes * 5; // 5 points per bid in last 5 minutes

        // Points for frequency (lower interval = higher score)
        if (averageBidInterval > 0 && averageBidInterval < 300) { // Less than 5 minutes
            score += Math.max(0, 50 - averageBidInterval);
        }

        // Cap at 100
        return Math.min(100, score);
    }, [biddingPressure]);

    return {
        biddingPressure,
        recentActivity: recentActivity.slice(0, 20), // Return only most recent 20
        loading,
        error,
        pressureTrend: getPressureTrend(),
        activeBidders: getActiveBidders(),
        intensityScore: getIntensityScore(),
        refreshData: fetchBiddingActivity,
    };
}

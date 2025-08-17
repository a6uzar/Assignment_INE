import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAuctionParticipants } from '@/hooks/useAuctionParticipants';
import { useBiddingPressure } from '@/hooks/useBiddingPressure';
import { useAuctionActivity } from '@/hooks/useAuctionActivity';

// Enhanced Components
import { EnhancedCountdownTimer } from './EnhancedCountdownTimer';
import { EnhancedBiddingInterface } from './EnhancedBiddingInterface';
import { LiveParticipantsPanel } from './LiveParticipantsPanel';
import { LiveActivityStream } from './LiveActivityStream';

// Phase 3: Social & Engagement Components
import { LiveAuctionChat } from './LiveAuctionChat';
import { EmojiReactions } from './EmojiReactions';
import { SmartNotifications } from './SmartNotifications';
import { SocialSharing } from './SocialSharing';

// Icons
import {
    Eye,
    Users,
    Timer,
    TrendingUp,
    MapPin,
    Package,
    Info,
    AlertTriangle,
    Flame,
    Activity,
    ArrowLeft,
    MessageCircle,
    Heart,
    Share2,
    Bell,
    Settings,
    Maximize2,
    Minimize2,
} from 'lucide-react';

interface Auction {
    id: string;
    title: string;
    description: string;
    current_price: number;
    starting_price: number;
    start_price?: number; // For SocialSharing compatibility
    reserve_price?: number;
    end_time: string;
    images: string[];
    condition: string;
    location?: string;
    shipping_cost: number;
    seller_id: string; // For SocialSharing compatibility
    seller: {
        id: string;
        full_name: string;
        avatar_url?: string;
        is_verified: boolean;
    };
    bid_count: number;
    view_count: number;
    like_count?: number;
    follower_count?: number;
    status: 'upcoming' | 'active' | 'ended' | 'draft' | 'scheduled' | 'completed' | 'cancelled';
    winner_id?: string;
    auto_extend_minutes?: number;
}

export function AuctionRoom() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();

    const [auction, setAuction] = useState<Auction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isWatching, setIsWatching] = useState(false);
    const [showMobileActivity, setShowMobileActivity] = useState(false);

    // Phase 3: Social & Engagement State
    const [showChat, setShowChat] = useState(true);
    const [showReactions, setShowReactions] = useState(true);
    const [chatCompactMode, setChatCompactMode] = useState(false);
    const [activeTab, setActiveTab] = useState('activity');

    // Enhanced hooks
    const isAuctionActive = auction?.status === 'active' && new Date(auction.end_time).getTime() > Date.now();
    
    const { participants, watchers, participantCount, watcherCount } = useAuctionParticipants({
        auctionId: id || '',
        enabled: isAuctionActive, // Only enable when auction is active
    });

    const { biddingPressure, activeBidders, intensityScore } = useBiddingPressure({
        auctionId: id || '',
        updateInterval: 0, // Disable polling, rely on real-time subscriptions only
        enabled: isAuctionActive, // Only enable when auction is active
    });

    const { events, stats, addExtensionEvent, addWarningEvent } = useAuctionActivity(
        id || '',
        user?.id
    );

    // Fetch auction data
    useEffect(() => {
        if (!id) return;

        const fetchAuction = async () => {
            try {
                const { data, error } = await supabase
                    .from('auctions')
                    .select(`
            *,
            seller:users!auctions_seller_id_fkey(
              id,
              full_name,
              avatar_url,
              is_verified
            )
          `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('Auction not found');

                setAuction(data);

                // Check if user is watching
                if (user) {
                    const { data: watchData } = await supabase
                        .from('auction_watchers')
                        .select('id')
                        .eq('auction_id', id)
                        .eq('user_id', user.id)
                        .single();

                    setIsWatching(!!watchData);
                }

            } catch (err) {
                console.error('Error fetching auction:', err);
                setError(err instanceof Error ? err.message : 'Failed to load auction');
            } finally {
                setLoading(false);
            }
        };

        fetchAuction();
    }, [id, user]);

    // Auto-watch auction when user joins
    useEffect(() => {
        if (!user || !auction || isWatching) return;

        const autoWatch = async () => {
            try {
                await supabase
                    .from('auction_watchers')
                    .insert({
                        auction_id: auction.id,
                        user_id: user.id,
                    });
                setIsWatching(true);
            } catch (error) {
                console.error('Auto-watch failed:', error);
            }
        };

        autoWatch();
    }, [user, auction, isWatching]);

    // Handle auction time extensions
    const handleTimeExtension = (reason: string) => {
        addExtensionEvent(reason);
        toast({
            title: "Auction Extended",
            description: reason,
            duration: 5000,
        });
    };

    // Handle auction warnings
    const handleAuctionWarning = (message: string) => {
        addWarningEvent(message);
        toast({
            title: "Auction Alert",
            description: message,
            variant: "destructive",
            duration: 8000,
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="h-96 bg-gray-200 rounded-lg"></div>
                                <div className="h-64 bg-gray-200 rounded-lg"></div>
                            </div>
                            <div className="space-y-6">
                                <div className="h-80 bg-gray-200 rounded-lg"></div>
                                <div className="h-40 bg-gray-200 rounded-lg"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !auction) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <div className="max-w-4xl mx-auto text-center py-20">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Auction Not Found</h1>
                    <p className="text-gray-600 mb-6">{error || 'The auction you are looking for does not exist.'}</p>
                    <Button onClick={() => navigate('/auctions')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Auctions
                    </Button>
                </div>
            </div>
        );
    }

    const isActive = auction.status === 'active';
    const isUpcoming = auction.status === 'upcoming';
    const isEnded = auction.status === 'ended';
    const isSeller = user?.id === auction.seller.id;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/auctions')}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 truncate max-w-md">
                                    {auction.title}
                                </h1>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Eye className="h-4 w-4" />
                                        <span>{auction.view_count} views</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        <span>{participantCount + watcherCount} watching</span>
                                    </div>
                                    {biddingPressure.bidsInLastMinute > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Flame className="h-4 w-4 text-orange-500" />
                                            <span className="text-orange-600 font-medium">
                                                {biddingPressure.bidsInLastMinute} bids/min
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                            {/* Phase 3: Social Actions in Header */}
                            <div className="hidden md:flex items-center gap-2">
                                <SmartNotifications userId={user?.id} compact />
                                <SocialSharing
                                    auction={{
                                        ...auction,
                                        start_price: auction.starting_price,
                                        seller_id: auction.seller.id,
                                        seller: {
                                            ...auction.seller,
                                            name: auction.seller.full_name
                                        }
                                    }}
                                    compact
                                />

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowChat(!showChat)}
                                    className={showChat ? "text-blue-600" : "text-gray-600"}
                                >
                                    <MessageCircle className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowReactions(!showReactions)}
                                    className={showReactions ? "text-red-600" : "text-gray-600"}
                                >
                                    <Heart className="h-4 w-4" />
                                </Button>
                            </div>

                            <Badge
                                variant={
                                    isActive ? 'default' :
                                        isUpcoming ? 'secondary' :
                                            'outline'
                                }
                                className={
                                    isActive ? 'bg-green-100 text-green-800 border-green-200' :
                                        isUpcoming ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                            'bg-gray-100 text-gray-800 border-gray-200'
                                }
                            >
                                {isActive ? 'Live' : isUpcoming ? 'Upcoming' : 'Ended'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-4 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Auction Images */}
                        <Card>
                            <CardContent className="p-0">
                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                    {auction.images && auction.images.length > 0 ? (
                                        <img
                                            src={auction.images[0]}
                                            alt={auction.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <Package className="h-16 w-16" />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Phase 3: Emoji Reactions Overlay */}
                        {showReactions && auction.images && auction.images.length > 0 && (
                            <div className="relative -mt-6 z-10">
                                <EmojiReactions
                                    auctionId={auction.id}
                                    currentUserId={user?.id}
                                    compact
                                />
                            </div>
                        )}

                        {/* Enhanced Timer */}
                        <EnhancedCountdownTimer
                            endTime={auction.end_time}
                            autoExtendMinutes={auction.auto_extend_minutes}
                            biddingPressure={{
                                level: biddingPressure.level,
                                recentBids: biddingPressure.recentBids,
                                lastBidTime: biddingPressure.lastBidTime,
                                description: biddingPressure.description,
                            }}
                            onTimePhaseChange={(phase) => {
                                if (phase === 'critical') {
                                    handleAuctionWarning('Auction entering critical phase - less than 2 minutes remaining!');
                                } else if (phase === 'final') {
                                    handleAuctionWarning('Final moments - less than 30 seconds remaining!');
                                }
                            }}
                            onAutoExtend={() => {
                                handleTimeExtension('Auction automatically extended due to last-minute bidding activity');
                            }}
                        />

                        {/* Auction Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    Auction Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                                    <p className="text-gray-700 leading-relaxed">{auction.description}</p>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Condition</label>
                                        <p className="text-gray-900">{auction.condition}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Starting Price</label>
                                        <p className="text-gray-900">${auction.starting_price.toLocaleString()}</p>
                                    </div>
                                    {auction.reserve_price && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Reserve Price</label>
                                            <p className="text-gray-900">${auction.reserve_price.toLocaleString()}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Shipping</label>
                                        <p className="text-gray-900">
                                            {auction.shipping_cost === 0 ? 'Free' : `$${auction.shipping_cost}`}
                                        </p>
                                    </div>
                                </div>

                                {auction.location && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            <span className="text-gray-700">{auction.location}</span>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Mobile Social & Activity Toggle */}
                        <div className="lg:hidden space-y-4">
                            {/* Mobile Quick Actions */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <SmartNotifications userId={user?.id} compact />
                                    <SocialSharing
                                        auction={{
                                            ...auction,
                                            start_price: auction.starting_price,
                                            seller_id: auction.seller.id,
                                            seller: {
                                                ...auction.seller,
                                                name: auction.seller.full_name
                                            }
                                        }}
                                        compact
                                    />
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => setShowMobileActivity(!showMobileActivity)}
                                    className="flex items-center gap-2"
                                >
                                    <Activity className="h-4 w-4" />
                                    {showMobileActivity ? 'Hide' : 'Show'} Social
                                </Button>
                            </div>

                            <AnimatePresence>
                                {showMobileActivity && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4"
                                    >
                                        {/* Mobile Tabs */}
                                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                            <TabsList className="grid w-full grid-cols-4">
                                                <TabsTrigger value="activity">
                                                    <Activity className="h-4 w-4" />
                                                </TabsTrigger>
                                                <TabsTrigger value="participants">
                                                    <Users className="h-4 w-4" />
                                                </TabsTrigger>
                                                <TabsTrigger value="chat">
                                                    <MessageCircle className="h-4 w-4" />
                                                </TabsTrigger>
                                                <TabsTrigger value="social">
                                                    <Share2 className="h-4 w-4" />
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="activity" className="mt-4">
                                                <LiveActivityStream
                                                    auctionId={auction.id}
                                                    events={events}
                                                    biddingPressure={{
                                                        level: biddingPressure.level,
                                                        isHeating: biddingPressure.isHeating
                                                    }}
                                                    compact
                                                />
                                            </TabsContent>

                                            <TabsContent value="participants" className="mt-4">
                                                <LiveParticipantsPanel
                                                    auctionId={auction.id}
                                                    isActive={isAuctionActive}
                                                />
                                            </TabsContent>

                                            <TabsContent value="chat" className="mt-4">
                                                <LiveAuctionChat
                                                    auctionId={auction.id}
                                                    isAuctionActive={isActive}
                                                    currentUserId={user?.id}
                                                    compact={true}
                                                />
                                            </TabsContent>

                                            <TabsContent value="social" className="mt-4">
                                                <div className="space-y-4">
                                                    <SocialSharing
                                                        auction={{
                                                            ...auction,
                                                            start_price: auction.starting_price,
                                                            seller_id: auction.seller.id,
                                                            seller: {
                                                                ...auction.seller,
                                                                name: auction.seller.full_name
                                                            }
                                                        }}
                                                        showFollowing={false}
                                                    />

                                                    <EmojiReactions
                                                        auctionId={auction.id}
                                                        currentUserId={user?.id}
                                                        compact
                                                    />
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Column - Interactive Elements */}
                    <div className="space-y-6">
                        {/* Enhanced Bidding Interface */}
                        {isActive && !isSeller && (
                            <EnhancedBiddingInterface
                                auctionId={auction.id}
                                currentBid={auction.current_price}
                                minBidIncrement={50}
                                isAuctionActive={isActive}
                                isOwnAuction={isSeller}
                                userIsWinning={auction.winner_id === user?.id}
                                onBidPlaced={async (amount) => {
                                    // Handle bid placement
                                    try {
                                        const { error } = await supabase
                                            .from('bids')
                                            .insert({
                                                auction_id: auction.id,
                                                bidder_id: user?.id,
                                                amount,
                                            });

                                        if (error) throw error;

                                        toast({
                                            title: "Bid Placed!",
                                            description: `Your bid of $${amount.toLocaleString()} has been placed.`,
                                        });

                                        return { success: true };
                                    } catch (error) {
                                        return { success: false, error: error instanceof Error ? error.message : 'Failed to place bid' };
                                    }
                                }}
                            />
                        )}

                        {/* Phase 3: Tabbed Interface for Social Features */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="activity" className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    <span className="hidden sm:inline">Activity</span>
                                </TabsTrigger>
                                <TabsTrigger value="participants" className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span className="hidden sm:inline">People</span>
                                </TabsTrigger>
                                <TabsTrigger value="chat" className="flex items-center gap-1">
                                    <MessageCircle className="h-3 w-3" />
                                    <span className="hidden sm:inline">Chat</span>
                                </TabsTrigger>
                                <TabsTrigger value="social" className="flex items-center gap-1">
                                    <Share2 className="h-3 w-3" />
                                    <span className="hidden sm:inline">Share</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="activity" className="mt-4">
                                <LiveActivityStream
                                    auctionId={auction.id}
                                    events={events}
                                    biddingPressure={{
                                        level: biddingPressure.level,
                                        isHeating: biddingPressure.isHeating
                                    }}
                                />
                            </TabsContent>

                            <TabsContent value="participants" className="mt-4">
                                <LiveParticipantsPanel
                                    auctionId={auction.id}
                                    isActive={isAuctionActive}
                                />
                            </TabsContent>

                            <TabsContent value="chat" className="mt-4">
                                {showChat && (
                                    <LiveAuctionChat
                                        auctionId={auction.id}
                                        isAuctionActive={isActive}
                                        currentUserId={user?.id}
                                        compact={chatCompactMode}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="social" className="mt-4">
                                <div className="space-y-4">
                                    <SocialSharing
                                        auction={{
                                            ...auction,
                                            start_price: auction.starting_price,
                                            seller_id: auction.seller.id,
                                            seller: {
                                                ...auction.seller,
                                                name: auction.seller.full_name
                                            }
                                        }}
                                        showFollowing={true}
                                    />

                                    {showReactions && (
                                        <EmojiReactions
                                            auctionId={auction.id}
                                            currentUserId={user?.id}
                                        />
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Seller Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Seller Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                        {auction.seller.avatar_url ? (
                                            <img
                                                src={auction.seller.avatar_url}
                                                alt={auction.seller.full_name}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-gray-600">
                                                {auction.seller.full_name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{auction.seller.full_name}</p>
                                        {auction.seller.is_verified && (
                                            <Badge variant="secondary" className="text-xs mt-1">
                                                Verified Seller
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Phase 3: Smart Notifications Panel (Desktop) */}
                        <div className="hidden lg:block">
                            <SmartNotifications
                                userId={user?.id}
                                showSettings={true}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

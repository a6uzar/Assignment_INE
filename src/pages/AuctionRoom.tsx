import { useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeAuction } from '@/hooks/useRealtimeAuction';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { BiddingPanel } from '@/components/auction/BiddingPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  Heart, 
  Share2, 
  MapPin, 
  Truck, 
  Shield, 
  Clock,
  TrendingUp,
  Users,
  Activity,
  Gavel
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export default function AuctionRoom() {
  const { id } = useParams<{ id: string }>();
  const [isWatching, setIsWatching] = useState(false);
  const [participants, setParticipants] = useState(new Set());

  // Always call hooks at the top level
  const { auction, bids, loading, error } = useRealtimeAuction(id || '');

  // Track unique participants
  useEffect(() => {
    if (bids.length > 0) {
      const uniqueBidders = new Set(bids.map(bid => bid.bidder_id));
      setParticipants(uniqueBidders);
    }
  }, [bids]);

  if (!id) {
    return <Navigate to="/auctions" replace />;
  }

  // Prepare bid history data for chart
  const bidHistoryData = bids
    .slice()
    .reverse()
    .map((bid, index) => ({
      index: index + 1,
      amount: bid.amount,
      time: new Date(bid.bid_time).toLocaleTimeString(),
    }));

  if (loading) {
    return (
      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Loading skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Auction Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The auction you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <a href="/auctions">Browse All Auctions</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'ended': return 'bg-gray-500';
      case 'completed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container py-8">
        {/* Header Section */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Badge className={cn("text-white", getStatusColor(auction.status))}>
                {auction.status.toUpperCase()}
              </Badge>
              {auction.featured && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsWatching(!isWatching)}
              >
                <Heart className={cn(
                  "h-4 w-4 mr-2",
                  isWatching && "fill-current text-red-500"
                )} />
                {isWatching ? 'Watching' : 'Watch'}
              </Button>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-2">{auction.title}</h1>
          <p className="text-muted-foreground text-lg mb-4">{auction.description}</p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{auction.view_count}</div>
                <p className="text-sm text-muted-foreground">Views</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Gavel className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{auction.bid_count}</div>
                <p className="text-sm text-muted-foreground">Bids</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{participants.size}</div>
                <p className="text-sm text-muted-foreground">Bidders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold text-primary">
                  ${auction.current_price.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Current Bid</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Auction Details */}
          <motion.div 
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Image Gallery */}
            {auction.images && auction.images.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={auction.images[0]}
                      alt={auction.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Countdown Timer */}
            <CountdownTimer 
              endTime={auction.end_time}
              variant="default"
            />

            {/* Auction Details */}
            <Card>
              <CardHeader>
                <CardTitle>Auction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Starting Price</p>
                    <p className="text-lg font-semibold">${auction.starting_price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bid Increment</p>
                    <p className="text-lg font-semibold">${auction.bid_increment.toLocaleString()}</p>
                  </div>
                  {auction.reserve_price && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reserve Price</p>
                      <p className="text-lg font-semibold">${auction.reserve_price.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Shipping</p>
                    <p className="text-lg font-semibold">
                      {auction.shipping_cost === 0 ? 'Free' : `$${auction.shipping_cost}`}
                    </p>
                  </div>
                </div>
                
                {auction.location && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{auction.location}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bid History Chart */}
            {bidHistoryData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Bid History</CardTitle>
                  <CardDescription>Track bidding activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={bidHistoryData}>
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']}
                        labelFormatter={(label) => `Bid #${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Right Column - Bidding & Activity */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Bidding Panel */}
            <BiddingPanel auction={auction} bids={bids} />

            {/* Live Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Live Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <AnimatePresence initial={false}>
                    {bids.slice(0, 10).map((bid, index) => (
                      <motion.div
                        key={bid.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center space-x-3 py-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={(bid as any).users?.avatar_url} />
                          <AvatarFallback>
                            {(bid as any).users?.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {(bid as any).users?.full_name || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(bid.bid_time).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant={index === 0 ? "default" : "outline"}>
                          ${bid.amount.toLocaleString()}
                        </Badge>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Seller Information */}
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={(auction as any).users?.avatar_url} />
                    <AvatarFallback>
                      {(auction as any).users?.full_name?.[0] || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{(auction as any).users?.full_name || 'Seller'}</p>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>Verified Seller</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

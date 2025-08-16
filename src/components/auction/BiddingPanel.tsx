import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import bidService from '@/lib/api/bidService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Gavel,
  DollarSign,
  Clock,
  TrendingUp,
  Users,
  Activity,
  Zap,
  Target,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Loader2,
  Heart,
  AlertCircle,
} from 'lucide-react';
import { useRealtimeBidding } from '@/hooks/useRealtimeBidding';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CountdownTimer } from './CountdownTimer';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface BiddingPanelProps {
  auctionId: string;
  auction?: unknown;
  bids?: unknown[];
  className?: string;
}

export function BiddingPanel({ auctionId, className }: BiddingPanelProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isAutoBid, setIsAutoBid] = useState(false);
  const [maxAutoBid, setMaxAutoBid] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [isWatching, setIsWatching] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    currentBid,
    bidHistory,
    auction,
    timeRemaining,
    isAuctionActive,
    isLoading,
    error,
    placeBid,
  } = useRealtimeBidding({ auctionId });

  // Calculate next minimum bid
  const nextMinBid = currentBid 
    ? currentBid.amount + (auction?.bid_increment || 1)
    : auction?.starting_price || 0;

  // Quick bid amounts
  const quickBidAmounts = [
    nextMinBid,
    nextMinBid + (auction?.bid_increment || 1),
    nextMinBid + (auction?.bid_increment || 1) * 2,
    nextMinBid + (auction?.bid_increment || 1) * 5,
  ];

  // Update bid amount when minimum changes
  useEffect(() => {
    if (!bidAmount || parseFloat(bidAmount) < nextMinBid) {
      setBidAmount(nextMinBid.toString());
    }
  }, [nextMinBid, bidAmount]);

  const handleBidSubmit = async () => {
    const amount = parseFloat(bidAmount);
    const maxAmount = isAutoBid ? parseFloat(maxAutoBid) : undefined;

    if (isNaN(amount) || amount < nextMinBid) {
      toast({
        title: "Invalid Bid Amount",
        description: `Minimum bid is $${nextMinBid.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    if (isAutoBid && (!maxAmount || maxAmount < amount)) {
      toast({
        title: "Invalid Auto-Bid",
        description: "Maximum auto-bid must be greater than initial bid amount",
        variant: "destructive",
      });
      return;
    }

    setIsPlacingBid(true);
    setShowConfirmDialog(false);

    try {
      const result = await placeBid(amount, isAutoBid, maxAmount);
      
      if (result.success) {
        setBidAmount('');
        setMaxAutoBid('');
        setIsAutoBid(false);
        
        // Trigger confetti for successful bid
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } finally {
      setIsPlacingBid(false);
    }
  };

  const getBidStatus = (bid: { id: string; status?: string }) => {
    if (bid.id === currentBid?.id) return 'winning';
    return bid.status || 'outbid';
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading auction data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading auction: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!auction) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>Auction not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOwnAuction = auction.seller_id === user?.id;
  const userIsWinning = currentBid?.bidder_id === user?.id;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Auction Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Live Bidding
            </CardTitle>
            <Badge variant={isAuctionActive ? "default" : "secondary"}>
              {isAuctionActive ? "Active" : "Ended"}
            </Badge>
          </div>
          <CardDescription>
            Real-time auction bidding with instant updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Price */}
          <div className="text-center">
            <p className="text-sm text-gray-500">Current Bid</p>
            <p className="text-3xl font-bold text-green-600">
              ${(currentBid?.amount || auction.starting_price).toLocaleString()}
            </p>
            {currentBid && (
              <p className="text-sm text-gray-500">
                by {(((currentBid as Record<string, unknown>).users as Record<string, unknown>)?.full_name as string) || 'Anonymous'}
              </p>
            )}
          </div>

          {/* Timer */}
          <div className="text-center">
            <CountdownTimer 
              endTime={auction.end_time}
              onComplete={() => {
                toast({
                  title: "Auction Ended",
                  description: "This auction has ended.",
                });
              }}
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                <span className="text-lg font-semibold">{auction.bid_count || 0}</span>
              </div>
              <p className="text-sm text-gray-500">Bids</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Activity className="h-4 w-4" />
                <span className="text-lg font-semibold">{bidHistory.length}</span>
              </div>
              <p className="text-sm text-gray-500">Bidders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bidding Form */}
      {isAuctionActive && !isOwnAuction && user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Place Your Bid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Bid Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={nextMinBid.toString()}
                  className="pl-10"
                  min={nextMinBid}
                  step={auction.bid_increment}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Minimum bid: ${nextMinBid.toLocaleString()}
              </p>
            </div>

            {/* Quick Bid Buttons */}
            <div>
              <Label className="text-sm">Quick Bid Amounts</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {quickBidAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBidAmount(amount.toString())}
                    className="text-sm"
                  >
                    ${amount.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Auto-Bid Option */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-bid"
                  checked={isAutoBid}
                  onChange={(e) => setIsAutoBid(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="auto-bid" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Enable Auto-Bidding
                </Label>
              </div>
              
              {isAutoBid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label>Maximum Auto-Bid Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      value={maxAutoBid}
                      onChange={(e) => setMaxAutoBid(e.target.value)}
                      placeholder="Enter max amount"
                      className="pl-10"
                      min={parseFloat(bidAmount) || nextMinBid}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    We'll automatically bid up to this amount for you
                  </p>
                </motion.div>
              )}
            </div>

            <Button
              onClick={() => setShowConfirmDialog(true)}
              className="w-full"
              size="lg"
              disabled={isPlacingBid || !bidAmount || parseFloat(bidAmount) < nextMinBid}
            >
              {isPlacingBid ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Placing Bid...
                </>
              ) : (
                <>
                  <Gavel className="h-4 w-4 mr-2" />
                  Place Bid - ${parseFloat(bidAmount || '0').toLocaleString()}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* User Status */}
      {user && currentBid && (
        <Card>
          <CardContent className="p-4">
            {userIsWinning ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">You're winning this auction!</span>
              </div>
            ) : auction.seller_id === user.id ? (
              <div className="flex items-center gap-2 text-blue-600">
                <Gavel className="h-5 w-5" />
                <span className="font-medium">This is your auction</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">You've been outbid</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Watchlist Button */}
      <Card>
        <CardContent className="p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsWatching(!isWatching)}
          >
            <Heart className={cn(
              "h-4 w-4 mr-2",
              isWatching && "fill-current text-red-500"
            )} />
            {isWatching ? "Remove from Watchlist" : "Add to Watchlist"}
          </Button>
        </CardContent>
      </Card>

      {/* Bid History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Bid History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {bidHistory.map((bid, index) => (
                <motion.div
                  key={bid.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    getBidStatus(bid) === 'winning' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      getBidStatus(bid) === 'winning' ? 'bg-green-500' : 'bg-gray-400'
                    )} />
                    <div>
                      <p className="font-medium">${bid.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">
                        {(((bid as Record<string, unknown>).users as Record<string, unknown>)?.full_name as string) || 'Anonymous'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {index === 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-gray-400" />
                      )}
                      <Badge variant={getBidStatus(bid) === 'winning' ? 'default' : 'secondary'}>
                        {getBidStatus(bid) === 'winning' ? 'Winning' : 'Outbid'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(bid.bid_time).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {bidHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Gavel className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No bids yet. Be the first to bid!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bid Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Bid</AlertDialogTitle>
            <AlertDialogDescription>
              {isAutoBid ? (
                <>
                  You're about to place an auto-bid of <strong>${parseFloat(bidAmount || '0').toLocaleString()}</strong> with a maximum of <strong>${parseFloat(maxAutoBid || '0').toLocaleString()}</strong>.
                  <br /><br />
                  Our system will automatically bid on your behalf up to your maximum amount to keep you as the highest bidder.
                </>
              ) : (
                <>
                  You're about to place a bid of <strong>${parseFloat(bidAmount || '0').toLocaleString()}</strong> on this auction.
                  <br /><br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBidSubmit}>
              Confirm Bid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { Auction, Bid, User } from '@/types/database';

export function LegacyBiddingPanel({ auction, bids, onBidPlaced, className }: {
  auction: Auction;
  bids: Bid[];
  onBidPlaced?: (bid: Bid) => void;
  className?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [bidError, setBidError] = useState<string>('');
  const [isWatching, setIsWatching] = useState(false);

  const isActive = auction.status === 'active';
  const isSeller = user?.id === auction.seller_id;
  const currentHighestBid = bids[0];
  const userIsHighestBidder = currentHighestBid?.bidder_id === user?.id;
  
  const minBidAmount = auction.current_price === 0 
    ? auction.starting_price 
    : auction.current_price + auction.bid_increment;

  // Quick bid amounts
  const quickBidAmounts = [
    minBidAmount,
    minBidAmount + auction.bid_increment,
    minBidAmount + (auction.bid_increment * 2),
    minBidAmount + (auction.bid_increment * 5),
  ];

  useEffect(() => {
    setBidAmount(minBidAmount.toString());
  }, [minBidAmount]);

  const validateBidAmount = (amount: number) => {
    if (amount < minBidAmount) {
      return `Minimum bid is $${minBidAmount.toLocaleString()}`;
    }
    return '';
  };

  const handleBidAmountChange = (value: string) => {
    setBidAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setBidError(validateBidAmount(numValue));
    }
  };

  const placeBid = async (amount: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to place bids.",
        variant: "destructive",
      });
      return;
    }

    if (!isActive) {
      toast({
        title: "Auction Not Active",
        description: "This auction is not currently accepting bids.",
        variant: "destructive",
      });
      return;
    }

    if (isSeller) {
      toast({
        title: "Cannot Bid",
        description: "You cannot bid on your own auction.",
        variant: "destructive",
      });
      return;
    }

    const error = validateBidAmount(amount);
    if (error) {
      setBidError(error);
      return;
    }

    setIsPlacingBid(true);

    try {
      const { data: newBid, error } = await bidService.placeBid({
        auctionId: auction.id,
        bidder_id: user.id,
        amount,
      });

      if (error) throw error;

      // Success animations and notifications
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "Bid Placed Successfully!",
        description: `Your bid of $${amount.toLocaleString()} has been placed.`,
      });

      setBidAmount(minBidAmount.toString());
      setBidError('');
      onBidPlaced?.(newBid);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setBidError(errorMessage);
      toast({
        title: "Bid Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleQuickBid = (amount: number) => {
    setBidAmount(amount.toString());
    placeBid(amount);
  };

  if (!isActive && auction.status !== 'ended') {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Auction Not Active</h3>
          <p className="text-muted-foreground">
            This auction is {auction.status === 'scheduled' ? 'scheduled to start' : 'not active'}.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (auction.status === 'ended') {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6 text-center">
          <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Auction Ended</h3>
          {auction.winner_id ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Winning bid: ${auction.final_price?.toLocaleString()}
              </p>
              {auction.winner_id === user?.id && (
                <Badge variant="default" className="bg-green-500">
                  You Won! 🎉
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No winner</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Gavel className="h-5 w-5" />
              <span>Place Your Bid</span>
            </CardTitle>
            <CardDescription>
              {bids.length} bid{bids.length !== 1 ? 's' : ''} • Min: ${minBidAmount.toLocaleString()}
            </CardDescription>
          </div>
          {userIsHighestBidder && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center space-x-1"
            >
              <Badge variant="default" className="bg-green-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                Highest Bidder
              </Badge>
            </motion.div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Bid Display */}
        <motion.div 
          className="text-center p-4 bg-muted/50 rounded-lg"
          animate={{ 
            scale: currentHighestBid ? 1.02 : 1 
          }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm text-muted-foreground mb-1">Current Highest Bid</p>
          <motion.p 
            className="text-3xl font-bold text-primary"
            key={auction.current_price}
            initial={{ scale: 1.2, color: "rgb(var(--primary))" }}
            animate={{ scale: 1, color: "rgb(var(--foreground))" }}
            transition={{ duration: 0.5 }}
          >
            ${auction.current_price.toLocaleString()}
          </motion.p>
          {currentHighestBid && (
            <p className="text-xs text-muted-foreground">
              by {currentHighestBid.users?.full_name}
            </p>
          )}
        </motion.div>

        {!isSeller && (
          <>
            {/* Quick Bid Buttons */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Quick Bid</Label>
              <div className="grid grid-cols-2 gap-2">
                {quickBidAmounts.map((amount, index) => (
                  <motion.div
                    key={amount}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleQuickBid(amount)}
                      disabled={isPlacingBid}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      ${amount.toLocaleString()}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Bid Input */}
            <div className="space-y-3">
              <Label htmlFor="bid-amount">Custom Bid Amount</Label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="bid-amount"
                      type="number"
                      value={bidAmount}
                      onChange={(e) => handleBidAmountChange(e.target.value)}
                      className={cn(
                        "pl-8",
                        bidError && "border-destructive focus-visible:ring-destructive"
                      )}
                      min={minBidAmount}
                      step={auction.bid_increment}
                      disabled={isPlacingBid}
                    />
                  </div>
                  <AnimatePresence>
                    {bidError && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-destructive mt-1"
                      >
                        {bidError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => placeBid(parseFloat(bidAmount))}
                    disabled={isPlacingBid || !!bidError || !bidAmount}
                    className="min-w-[120px]"
                  >
                    {isPlacingBid ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Gavel className="h-4 w-4 mr-2" />
                        Place Bid
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Watch Auction */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setIsWatching(!isWatching)}
              >
                <Heart className={cn(
                  "h-4 w-4 mr-2",
                  isWatching && "fill-current text-red-500"
                )} />
                {isWatching ? 'Watching' : 'Watch Auction'}
              </Button>
            </motion.div>
          </>
        )}

        {isSeller && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              You are the seller of this auction
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

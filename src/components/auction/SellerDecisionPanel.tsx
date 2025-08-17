import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  CheckCircle,
  XCircle,
  MessageSquare,
  DollarSign,
  Clock,
  User,
  Star,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Send,
  Eye,
  Calendar,
  Award,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Bid = Database['public']['Tables']['bids']['Row'];
type Auction = Database['public']['Tables']['auctions']['Row'];
type CounterOffer = Database['public']['Tables']['counter_offers']['Row'];

interface SellerDecisionPanelProps {
  auctionId: string;
  auction: Auction;
  highestBid?: Bid & { users?: { full_name: string; avatar_url?: string } };
  onDecisionMade?: () => void;
  className?: string;
}

interface CounterOfferData {
  amount: number;
  message: string;
  expiry_hours: number;
}

export function SellerDecisionPanel({ 
  auctionId, 
  auction, 
  highestBid, 
  onDecisionMade,
  className 
}: SellerDecisionPanelProps) {
  const [decision, setDecision] = useState<'accept' | 'reject' | 'counter' | null>(null);
  const [counterOffer, setCounterOffer] = useState<CounterOfferData>({
    amount: 0,
    message: '',
    expiry_hours: 24,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeCounterOffers, setActiveCounterOffers] = useState<CounterOffer[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');

  const { user } = useAuth();
  const { toast } = useToast();

  const isSellerDecisionTime = auction.status === 'ended' && auction.seller_id === user?.id;
  const hasReservePrice = auction.reserve_price && auction.reserve_price > 0;
  const reserveMet = hasReservePrice ? 
    (highestBid?.amount || 0) >= auction.reserve_price! : true;

  // Fetch active counter offers
  useEffect(() => {
    if (!isSellerDecisionTime) return;

    const fetchCounterOffers = async () => {
      const { data, error } = await supabase
        .from('counter_offers')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching counter offers:', error);
      } else {
        setActiveCounterOffers(data || []);
      }
    };

    fetchCounterOffers();
  }, [auctionId, isSellerDecisionTime]);

  // Initialize counter offer amount
  useEffect(() => {
    if (highestBid && counterOffer.amount === 0) {
      setCounterOffer(prev => ({
        ...prev,
        amount: Math.round(highestBid.amount * 1.1), // 10% higher than current bid
      }));
    }
  }, [highestBid, counterOffer.amount]);

  const handleDecision = async () => {
    if (!decision || !highestBid) return;

    setIsSubmitting(true);

    try {
      if (decision === 'accept') {
        await handleAcceptBid();
      } else if (decision === 'reject') {
        await handleRejectBid();
      } else if (decision === 'counter') {
        await handleCounterOffer();
      }

      onDecisionMade?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process decision",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleAcceptBid = async () => {
    // Update auction status to completed
    const { error: auctionError } = await supabase
      .from('auctions')
      .update({
        status: 'completed',
        winner_id: highestBid!.bidder_id,
        final_price: highestBid!.amount,
      })
      .eq('id', auctionId);

    if (auctionError) throw auctionError;

    // Update winning bid status
    const { error: bidError } = await supabase
      .from('bids')
      .update({ status: 'winning' })
      .eq('id', highestBid!.id);

    if (bidError) throw bidError;

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        auction_id: auctionId,
        seller_id: auction.seller_id,
        buyer_id: highestBid!.bidder_id,
        amount: highestBid!.amount,
        commission_amount: 0,
        total_amount: highestBid!.amount,
        shipping_cost: 0,
        status: 'pending',
      });

    if (transactionError) throw transactionError;

    // Send notification to winner
    await supabase
      .from('notifications')
      .insert({
        user_id: highestBid!.bidder_id,
        type: 'bid_accepted',
        title: 'Congratulations! Your bid was accepted',
        message: `Your bid of $${highestBid!.amount.toLocaleString()} for "${auction.title}" has been accepted by the seller.`,
        auction_id: auctionId,
      });

    toast({
      title: "Bid Accepted!",
      description: `You have accepted the bid of $${highestBid!.amount.toLocaleString()}`,
    });
  };

  const handleRejectBid = async () => {
    // Update auction status
    const { error: auctionError } = await supabase
      .from('auctions')
      .update({
        status: 'cancelled',
      })
      .eq('id', auctionId);

    if (auctionError) throw auctionError;

    // Update all bids to lost status
    const { error: bidsError } = await supabase
      .from('bids')
      .update({ status: 'lost' })
      .eq('auction_id', auctionId);

    if (bidsError) throw bidsError;

    // Send notification to bidders
    if (highestBid) {
      await supabase
        .from('notifications')
        .insert({
          user_id: highestBid.bidder_id,
          type: 'bid_rejected',
          title: 'Bid Rejected',
          message: `Unfortunately, your bid for "${auction.title}" has been rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
          auction_id: auctionId,
        });
    }

    toast({
      title: "Bid Rejected",
      description: "The auction has been cancelled and all bidders have been notified.",
    });
  };

  const handleCounterOffer = async () => {
    if (!highestBid || counterOffer.amount <= highestBid.amount) {
      throw new Error("Counter offer must be higher than current bid");
    }

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + counterOffer.expiry_hours);

    // Create counter offer
    const { error: counterOfferError } = await supabase
      .from('counter_offers')
      .insert({
        auction_id: auctionId,
        seller_id: auction.seller_id,
        bidder_id: highestBid.bidder_id,
        original_bid_amount: highestBid.amount,
        counter_amount: counterOffer.amount,
        message: counterOffer.message,
        expires_at: expiryDate.toISOString(),
        status: 'pending',
      });

    if (counterOfferError) throw counterOfferError;

    // Send notification to bidder
    await supabase
      .from('notifications')
      .insert({
        user_id: highestBid.bidder_id,
        type: 'counter_offer',
        title: 'Counter Offer Received',
        message: `The seller has made a counter offer of $${counterOffer.amount.toLocaleString()} for "${auction.title}". ${counterOffer.message}`,
        auction_id: auctionId,
      });

    toast({
      title: "Counter Offer Sent!",
      description: `Counter offer of $${counterOffer.amount.toLocaleString()} has been sent to the bidder.`,
    });
  };

  const getDecisionButtonVariant = (type: 'accept' | 'reject' | 'counter') => {
    if (decision === type) return 'default';
    return 'outline';
  };

  if (!isSellerDecisionTime) {
    return null;
  }

  if (!highestBid) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            No Bids Received
          </CardTitle>
          <CardDescription>
            Your auction has ended without any bids.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">
              Consider adjusting your starting price or auction settings for better results next time.
            </p>
            <Button variant="outline">
              Relist Auction
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          Seller Decision Required
        </CardTitle>
        <CardDescription>
          Your auction has ended. Please review the highest bid and make your decision.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Highest Bid Summary */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Highest Bid</h3>
            {!reserveMet && (
              <Badge variant="destructive">Reserve Not Met</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-2xl font-bold text-green-600">
                ${highestBid.amount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                by {highestBid.users?.full_name || 'Anonymous Bidder'}
              </p>
              <p className="text-xs text-gray-500">
                Bid placed on {new Date(highestBid.bid_time).toLocaleDateString()}
              </p>
            </div>
            
            {hasReservePrice && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Reserve Price</p>
                <p className="font-semibold">${auction.reserve_price!.toLocaleString()}</p>
                <div className={`text-xs ${reserveMet ? 'text-green-600' : 'text-red-600'}`}>
                  {reserveMet ? '✓ Met' : '✗ Not Met'}
                </div>
              </div>
            )}
          </div>

          {!reserveMet && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                The reserve price has not been met. You may still accept this bid if you choose.
              </p>
            </div>
          )}
        </div>

        {/* Decision Buttons */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Make Your Decision</Label>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Accept Button */}
            <Button
              variant={getDecisionButtonVariant('accept')}
              onClick={() => setDecision('accept')}
              className="h-auto p-4 justify-start"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Accept Bid</div>
                  <div className="text-sm opacity-70">
                    Complete the sale at ${highestBid.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            </Button>

            {/* Counter Offer Button */}
            <Button
              variant={getDecisionButtonVariant('counter')}
              onClick={() => setDecision('counter')}
              className="h-auto p-4 justify-start"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Make Counter Offer</div>
                  <div className="text-sm opacity-70">
                    Propose a different price to the bidder
                  </div>
                </div>
              </div>
            </Button>

            {/* Reject Button */}
            <Button
              variant={getDecisionButtonVariant('reject')}
              onClick={() => setDecision('reject')}
              className="h-auto p-4 justify-start"
            >
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div className="text-left">
                  <div className="font-medium">Reject Bid</div>
                  <div className="text-sm opacity-70">
                    Decline the sale and cancel the auction
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        {/* Counter Offer Form */}
        <AnimatePresence>
          {decision === 'counter' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 border-t pt-4"
            >
              <h4 className="font-medium">Counter Offer Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Counter Offer Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      value={counterOffer.amount}
                      onChange={(e) => setCounterOffer(prev => ({ 
                        ...prev, 
                        amount: parseFloat(e.target.value) || 0 
                      }))}
                      className="pl-10"
                      min={highestBid.amount + 1}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Must be higher than ${highestBid.amount.toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label>Offer Expires In</Label>
                  <select
                    value={counterOffer.expiry_hours}
                    onChange={(e) => setCounterOffer(prev => ({ 
                      ...prev, 
                      expiry_hours: parseInt(e.target.value) 
                    }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Message to Bidder (Optional)</Label>
                <Textarea
                  value={counterOffer.message}
                  onChange={(e) => setCounterOffer(prev => ({ 
                    ...prev, 
                    message: e.target.value 
                  }))}
                  placeholder="Explain your counter offer or add any additional terms..."
                  rows={3}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rejection Reason */}
        <AnimatePresence>
          {decision === 'reject' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 border-t pt-4"
            >
              <h4 className="font-medium">Rejection Reason (Optional)</h4>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Let the bidder know why you're rejecting their offer..."
                rows={3}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Counter Offers */}
        {activeCounterOffers.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Active Counter Offers</h4>
            <div className="space-y-2">
              {activeCounterOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-3 border rounded-lg bg-blue-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">${offer.counter_amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">
                        Expires: {new Date(offer.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                  {offer.message && (
                    <p className="text-sm text-gray-700 mt-2">{offer.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {decision && (
          <Button
            onClick={() => setShowConfirmDialog(true)}
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Confirm {decision === 'accept' ? 'Acceptance' : 
                        decision === 'counter' ? 'Counter Offer' : 'Rejection'}
              </>
            )}
          </Button>
        )}
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Your Decision
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision === 'accept' && (
                <>
                  You are about to accept the bid of <strong>${highestBid.amount.toLocaleString()}</strong>.
                  This will complete the sale and cannot be undone.
                </>
              )}
              {decision === 'counter' && (
                <>
                  You are about to send a counter offer of <strong>${counterOffer.amount.toLocaleString()}</strong>.
                  The bidder will have {counterOffer.expiry_hours} hours to respond.
                </>
              )}
              {decision === 'reject' && (
                <>
                  You are about to reject the bid and cancel the auction.
                  All bidders will be notified and this action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDecision}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

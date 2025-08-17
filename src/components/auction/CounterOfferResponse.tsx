import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  DollarSign,
  User,
  Calendar,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CounterOfferResponseProps {
  auctionId: string;
  className?: string;
}

interface CounterOffer {
  id: string;
  auction_id: string;
  seller_id: string;
  bidder_id: string;
  original_bid_amount: number;
  counter_amount: number;
  message: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  seller?: {
    id: string;
    full_name: string;
    email: string;
  };
  auction?: {
    id: string;
    title: string;
    current_price: number;
  };
}

export function CounterOfferResponse({ auctionId, className }: CounterOfferResponseProps) {
  const [counterOffers, setCounterOffers] = useState<CounterOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCounterOffers();
    
    // Set up real-time subscription for counter offers
    const subscription = supabase
      .channel(`counter-offers-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'counter_offers',
          filter: `auction_id=eq.${auctionId}`,
        },
        () => {
          fetchCounterOffers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [auctionId]);

  const fetchCounterOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('counter_offers')
        .select(`
          *,
          seller:users!counter_offers_seller_id_fkey(
            id,
            full_name,
            email
          ),
          auction:auctions(
            id,
            title,
            current_price
          )
        `)
        .eq('auction_id', auctionId)
        .eq('bidder_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mark expired offers
      const now = new Date();
      const updatedOffers = data?.map(offer => ({
        ...offer,
        status: new Date(offer.expires_at) < now && offer.status === 'pending' 
          ? 'expired' as const
          : offer.status
      })) || [];

      setCounterOffers(updatedOffers);

    } catch (error) {
      console.error('Error fetching counter offers:', error);
      toast({
        title: "Error",
        description: "Failed to load counter offers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCounterOfferResponse = async (
    offerId: string, 
    response: 'accepted' | 'rejected'
  ) => {
    setProcessingId(offerId);

    try {
      const offer = counterOffers.find(o => o.id === offerId);
      if (!offer) throw new Error('Counter offer not found');

      // Check if offer is still valid
      if (new Date(offer.expires_at) < new Date()) {
        throw new Error('Counter offer has expired');
      }

      // Update counter offer status
      const { error: updateError } = await supabase
        .from('counter_offers')
        .update({ 
          status: response,
          response_message: responseMessage || undefined,
          responded_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (updateError) throw updateError;

      if (response === 'accepted') {
        // Create new bid with counter offer amount
        const { error: bidError } = await supabase
          .from('bids')
          .insert({
            auction_id: auctionId,
            bidder_id: user?.id,
            amount: offer.counter_amount,
            is_counter_offer_bid: true,
            counter_offer_id: offerId,
            status: 'active',
            bid_time: new Date().toISOString(),
          });

        if (bidError) throw bidError;

        // Update auction current price
        const { error: auctionError } = await supabase
          .from('auctions')
          .update({ 
            current_price: offer.counter_amount,
            highest_bid_id: null // Will be updated by triggers
          })
          .eq('id', auctionId);

        if (auctionError) throw auctionError;

        // Send notification to seller
        await supabase
          .from('notifications')
          .insert({
            user_id: offer.seller_id,
            auction_id: auctionId,
            type: 'offer_accepted',
            title: 'Counter Offer Accepted',
            message: `Your counter offer of $${offer.counter_amount.toLocaleString()} for "${offer.auction?.title}" has been accepted.`,
          });

        toast({
          title: "Counter Offer Accepted!",
          description: `You have accepted the counter offer of $${offer.counter_amount.toLocaleString()}`,
        });

      } else {
        // Send notification to seller about rejection
        await supabase
          .from('notifications')
          .insert({
            user_id: offer.seller_id,
            auction_id: auctionId,
            type: 'offer_rejected',
            title: 'Counter Offer Rejected',
            message: `Your counter offer of $${offer.counter_amount.toLocaleString()} for "${offer.auction?.title}" has been rejected. ${responseMessage ? `Reason: ${responseMessage}` : ''}`,
          });

        toast({
          title: "Counter Offer Rejected",
          description: "The seller has been notified of your decision.",
        });
      }

      // Clear response message and refresh data
      setResponseMessage('');
      await fetchCounterOffers();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process counter offer response",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: CounterOffer['status']) => {
    const badges = {
      pending: <Badge variant="default" className="bg-yellow-500">Pending</Badge>,
      accepted: <Badge variant="default" className="bg-green-500">Accepted</Badge>,
      rejected: <Badge variant="destructive">Rejected</Badge>,
      expired: <Badge variant="outline">Expired</Badge>,
    };
    return badges[status];
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    
    if (expiry < now) {
      return 'Expired';
    }
    
    return `Expires ${formatDistanceToNow(expiry, { addSuffix: true })}`;
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (counterOffers.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Counter Offers
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold">No Counter Offers</p>
          <p className="text-muted-foreground">
            You haven't received any counter offers for this auction yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6" />
          Counter Offers ({counterOffers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {counterOffers.map((offer) => {
          const isExpired = new Date(offer.expires_at) < new Date();
          const isPending = offer.status === 'pending' && !isExpired;
          const isProcessing = processingId === offer.id;

          return (
            <div
              key={offer.id}
              className={cn(
                "border rounded-lg p-6 space-y-4",
                isPending ? "border-yellow-300 bg-yellow-50" : "border-border"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">{offer.seller?.full_name}</span>
                    {getStatusBadge(offer.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    ${offer.counter_amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Counter Offer
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your Original Bid</p>
                  <p className="font-semibold">${offer.original_bid_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className={cn(
                    "font-semibold",
                    offer.counter_amount > offer.original_bid_amount ? "text-red-600" : "text-green-600"
                  )}>
                    {offer.counter_amount > offer.original_bid_amount ? '+' : ''}
                    ${(offer.counter_amount - offer.original_bid_amount).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Message */}
              {offer.message && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">Seller's Message:</p>
                  <p className="text-sm text-gray-700">{offer.message}</p>
                </div>
              )}

              {/* Expiry */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className={cn(
                  "text-sm font-medium",
                  isExpired ? "text-red-600" : "text-orange-600"
                )}>
                  {getTimeRemaining(offer.expires_at)}
                </span>
              </div>

              {/* Actions for pending offers */}
              {isPending && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Response Message (Optional)
                      </label>
                      <Textarea
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder="Add a message with your response..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleCounterOfferResponse(offer.id, 'accepted')}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Accept Counter Offer
                      </Button>
                      
                      <Button
                        onClick={() => handleCounterOfferResponse(offer.id, 'rejected')}
                        disabled={isProcessing}
                        variant="destructive"
                        className="flex-1"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject Counter Offer
                      </Button>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Important:</p>
                          <ul className="mt-1 space-y-1">
                            <li>• Accepting this counter offer will place a new bid at the counter amount</li>
                            <li>• This action cannot be undone once confirmed</li>
                            <li>• The offer will expire if not responded to in time</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

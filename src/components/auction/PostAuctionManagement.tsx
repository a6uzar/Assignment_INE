import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Send,
  AlertTriangle,
  User,
  DollarSign,
  Calendar,
  MessageSquare,
  Shield,
  Star,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentProcessor } from '@/components/payment/PaymentProcessor';

interface PostAuctionManagementProps {
  auctionId: string;
  className?: string;
}

interface AuctionDetails {
  id: string;
  title: string;
  description: string;
  final_price: number;
  status: string;
  winner_id: string;
  seller_id: string;
  created_at: string;
  end_time: string;
  transaction?: {
    id: string;
    status: string;
    amount: number;
    shipping_cost: number;
  };
  winner?: {
    id: string;
    full_name: string;
    email: string;
  };
  seller?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ShippingInfo {
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: string;
  shippingCost: number;
  notes: string;
}

const AUCTION_COMPLETION_STEPS = [
  { id: 1, title: 'Payment Processing', icon: DollarSign },
  { id: 2, title: 'Item Preparation', icon: Package },
  { id: 3, title: 'Shipping', icon: Truck },
  { id: 4, title: 'Delivery Confirmation', icon: CheckCircle },
  { id: 5, title: 'Feedback & Rating', icon: Star },
];

export function PostAuctionManagement({ auctionId, className }: PostAuctionManagementProps) {
  const [auction, setAuction] = useState<AuctionDetails | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    carrier: '',
    trackingNumber: '',
    estimatedDelivery: '',
    shippingCost: 0,
    notes: ''
  });
  const [showPaymentProcessor, setShowPaymentProcessor] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAuctionDetails();
  }, [auctionId]);

  const fetchAuctionDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          *,
          winner:users!auctions_winner_id_fkey(
            id,
            full_name,
            email,
            phone
          ),
          seller:users!auctions_seller_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('id', auctionId)
        .single();

      if (error) throw error;

      // Fetch transaction details separately
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('auction_id', auctionId)
        .single();

      const auctionWithTransaction = {
        ...data,
        transaction: transactionData
      };

      setAuction(auctionWithTransaction);

      // Determine current step based on auction/transaction status
      if (transactionData) {
        if (transactionData.status === 'completed') {
          setCurrentStep(4);
        } else {
          setCurrentStep(1);
        }
      } else {
        setCurrentStep(1);
      }

    } catch (error) {
      console.error('Error fetching auction details:', error);
      toast({
        title: "Error",
        description: "Failed to load auction details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isUserSeller = () => user?.id === auction?.seller_id;
  const isUserWinner = () => user?.id === auction?.winner_id;

  const handlePaymentComplete = async (paymentData: any) => {
    setShowPaymentProcessor(false);
    setCurrentStep(2);

    // Send notification to seller
    await supabase
      .from('notifications')
      .insert({
        user_id: auction?.seller_id,
        auction_id: auctionId,
        type: 'bid_accepted',
        title: 'Payment Received',
        message: `Payment has been received for "${auction?.title}". Please prepare the item for shipping.`,
      });

    await fetchAuctionDetails();
  };

  const handleShippingUpdate = async () => {
    if (!auction?.transaction?.id) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          tracking_number: shippingInfo.trackingNumber,
          carrier: shippingInfo.carrier,
          estimated_delivery: shippingInfo.estimatedDelivery,
          shipping_cost: shippingInfo.shippingCost,
          shipping_notes: shippingInfo.notes,
          status: 'completed'
        })
        .eq('id', auction.transaction.id);

      if (error) throw error;

      // Send notification to buyer
      await supabase
        .from('notifications')
        .insert({
          user_id: auction.winner_id,
          auction_id: auctionId,
          type: 'bid_accepted',
          title: 'Item Shipped',
          message: `Your item "${auction.title}" has been shipped. Tracking: ${shippingInfo.trackingNumber}`,
        });

      setCurrentStep(4);
      toast({
        title: "Shipping Updated",
        description: "Shipping information has been sent to the buyer.",
      });

      await fetchAuctionDetails();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipping information",
        variant: "destructive",
      });
    }
  };

  const generateInvoicePDF = async () => {
    if (!auction) return;

    try {
      // Simulate PDF generation - in real implementation, use jsPDF or server-side generation
      const invoiceData = {
        invoiceNumber: `INV-${auction.id.slice(0, 8).toUpperCase()}`,
        date: new Date().toLocaleDateString(),
        auction: auction.title,
        amount: auction.final_price,
        winner: auction.winner?.full_name,
        seller: auction.seller?.full_name,
      };

      // Create a simple text-based invoice for demo
      const invoiceContent = `
AUCTION INVOICE
===============

Invoice #: ${invoiceData.invoiceNumber}
Date: ${invoiceData.date}

ITEM DETAILS:
Auction: ${invoiceData.auction}
Final Price: $${auction.final_price.toLocaleString()}

BUYER:
${invoiceData.winner}

SELLER:
${invoiceData.seller}

TOTAL AMOUNT: $${auction.final_price.toLocaleString()}

Thank you for using Live Bid Dash!
      `;

      // Create and download the file
      const blob = new Blob([invoiceContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceData.invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Invoice Downloaded",
        description: "Invoice has been downloaded to your device.",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      });
    }
  };

  const submitFeedback = async () => {
    if (!auction || feedbackRating === 0) return;

    try {
      // Create notification instead of feedback record for now
      await supabase
        .from('notifications')
        .insert({
          user_id: isUserWinner() ? auction.seller_id : auction.winner_id,
          auction_id: auctionId,
          type: 'bid_accepted',
          title: 'Feedback Received',
          message: `You received a ${feedbackRating}-star rating for auction "${auction.title}". ${feedbackComment}`,
        });

      setCurrentStep(5);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading auction details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!auction) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Auction Not Found</p>
        </CardContent>
      </Card>
    );
  }

  if (showPaymentProcessor && auction.transaction) {
    return (
      <PaymentProcessor
        auctionId={auctionId}
        transactionId={auction.transaction.id}
        amount={auction.final_price}
        shippingCost={auction.transaction.shipping_cost}
        onPaymentComplete={handlePaymentComplete}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Auction Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Post-Auction Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Auction Details</h3>
              <p className="text-lg font-semibold">{auction.title}</p>
              <p className="text-2xl font-bold text-green-600">
                Final Price: ${auction.final_price.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Ended: {new Date(auction.end_time).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Participants</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Winner: {auction.winner?.full_name}</span>
                  {isUserWinner() && <Badge variant="secondary">You</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Seller: {auction.seller?.full_name}</span>
                  {isUserSeller() && <Badge variant="secondary">You</Badge>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {AUCTION_COMPLETION_STEPS.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const IconComponent = step.icon;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2",
                    isCompleted ? "bg-green-500 border-green-500 text-white" :
                      isActive ? "bg-primary border-primary text-white" :
                        "bg-gray-100 border-gray-300 text-gray-400"
                  )}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <p className={cn(
                    "text-xs text-center font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step-specific Content */}
      {currentStep === 1 && isUserWinner() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please complete your payment to proceed with the transaction.
            </p>
            <Button onClick={() => setShowPaymentProcessor(true)}>
              Proceed to Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && isUserSeller() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Prepare Item for Shipping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Payment has been received. Please prepare the item for shipping and update tracking information.
            </p>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="carrier">Shipping Carrier</Label>
                  <Input
                    id="carrier"
                    value={shippingInfo.carrier}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, carrier: e.target.value }))}
                    placeholder="e.g., FedEx, UPS, USPS"
                  />
                </div>
                <div>
                  <Label htmlFor="tracking">Tracking Number</Label>
                  <Input
                    id="tracking"
                    value={shippingInfo.trackingNumber}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery">Estimated Delivery</Label>
                  <Input
                    id="delivery"
                    type="date"
                    value={shippingInfo.estimatedDelivery}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="shippingCost">Shipping Cost</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    step="0.01"
                    value={shippingInfo.shippingCost}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Shipping Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={shippingInfo.notes}
                  onChange={(e) => setShippingInfo(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                />
              </div>
              <Button onClick={handleShippingUpdate} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Update Shipping Information
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Information - Simplified for current schema */}
      {currentStep >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Shipping details will be updated once the item is prepared for delivery.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep >= 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Leave Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Rate your experience (1-5 stars)</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFeedbackRating(rating)}
                      className={cn(
                        "w-8 h-8 rounded",
                        feedbackRating >= rating ? "text-yellow-500" : "text-gray-300"
                      )}
                    >
                      <Star className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="feedback">Comment (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={3}
                />
              </div>
              <Button
                onClick={submitFeedback}
                disabled={feedbackRating === 0}
                className="w-full"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Submit Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" onClick={generateInvoicePDF}>
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

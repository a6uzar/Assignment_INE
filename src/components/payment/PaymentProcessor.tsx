import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  CreditCard,
  Shield,
  CheckCircle,
  Clock,
  DollarSign,
  Truck,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentProcessorProps {
  auctionId: string;
  transactionId: string;
  amount: number;
  shippingCost?: number;
  className?: string;
  onPaymentComplete?: (paymentData: any) => void;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  name: string;
  icon: React.ReactNode;
  isAvailable: boolean;
  processingFee: number;
}

interface TransactionDetails {
  id: string;
  auction_id: string;
  seller_id: string;
  buyer_id: string;
  amount: number;
  commission_amount: number;
  total_amount: number;
  shipping_cost: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  auction?: {
    title: string;
    seller: {
      full_name: string;
      email: string;
    };
  };
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'card',
    type: 'card',
    name: 'Credit/Debit Card',
    icon: <CreditCard className="h-5 w-5" />,
    isAvailable: true,
    processingFee: 2.9, // 2.9% + $0.30
  },
  {
    id: 'paypal',
    type: 'paypal',
    name: 'PayPal',
    icon: <DollarSign className="h-5 w-5" />,
    isAvailable: true,
    processingFee: 3.5, // 3.5% + $0.49
  },
  {
    id: 'bank_transfer',
    type: 'bank_transfer',
    name: 'Bank Transfer',
    icon: <Shield className="h-5 w-5" />,
    isAvailable: true,
    processingFee: 0, // No fee for bank transfer
  },
];

export function PaymentProcessor({
  auctionId,
  transactionId,
  amount,
  shippingCost = 0,
  className,
  onPaymentComplete
}: PaymentProcessorProps) {
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactionDetails();
  }, [transactionId]);

  const fetchTransactionDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          auction:auctions(
            title,
            seller:users!auctions_seller_id_fkey(
              full_name,
              email
            )
          )
        `)
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      setTransaction(data);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast({
        title: "Error",
        description: "Failed to load payment details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalWithFees = (paymentMethod: PaymentMethod) => {
    const feeAmount = (amount * paymentMethod.processingFee) / 100;
    return amount + shippingCost + feeAmount;
  };

  const processPayment = async () => {
    if (!selectedMethod || !transaction) return;

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, you would:
      // 1. Create payment intent with Stripe/PayPal
      // 2. Handle 3D Secure authentication
      // 3. Confirm payment
      // 4. Update transaction status

      const totalAmount = calculateTotalWithFees(selectedMethod);

      // Update transaction status
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          payment_method: selectedMethod.type,
          processing_fee: (amount * selectedMethod.processingFee) / 100,
          total_amount: totalAmount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Send confirmation notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user?.id,
          auction_id: auctionId,
          type: 'bid_accepted',
          title: 'Payment Successful',
          message: `Your payment of $${totalAmount.toLocaleString()} has been processed successfully.`,
        });

      setPaymentStatus('success');

      toast({
        title: "Payment Successful!",
        description: `Payment of $${totalAmount.toLocaleString()} has been processed.`,
      });

      // Trigger callback
      onPaymentComplete?.({
        transactionId,
        amount: totalAmount,
        method: selectedMethod.type,
      });

    } catch (error: any) {
      console.error('Payment processing error:', error);
      setPaymentStatus('error');

      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!transaction) {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)}>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Payment Not Found</p>
          <p className="text-muted-foreground">The payment information could not be loaded.</p>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)}>
        <CardContent className="text-center py-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
          <p className="text-lg mb-4">
            Your payment of ${calculateTotalWithFees(selectedMethod!).toLocaleString()} has been processed.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              <strong>Next Steps:</strong>
            </p>
            <ul className="text-sm text-green-700 mt-2 space-y-1">
              <li>• You'll receive an email confirmation shortly</li>
              <li>• The seller will be notified to prepare the item</li>
              <li>• Shipping details will be provided once the item is ready</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Complete Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transaction Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Item: {transaction.auction?.title}</span>
              <span className="font-semibold">${amount.toLocaleString()}</span>
            </div>
            {shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Shipping
                </span>
                <span>${shippingCost.toLocaleString()}</span>
              </div>
            )}
            {selectedMethod && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing fee ({selectedMethod.processingFee}%)</span>
                <span>${((amount * selectedMethod.processingFee) / 100).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>
                ${selectedMethod ? calculateTotalWithFees(selectedMethod).toLocaleString() : amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <h3 className="font-semibold mb-3">Select Payment Method</h3>
          <div className="grid gap-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                disabled={!method.isAvailable}
                className={cn(
                  "flex items-center justify-between p-4 border rounded-lg transition-all",
                  "hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  selectedMethod?.id === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border",
                  !method.isAvailable && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  {method.icon}
                  <div className="text-left">
                    <p className="font-medium">{method.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {method.processingFee > 0
                        ? `${method.processingFee}% processing fee`
                        : "No processing fee"
                      }
                    </p>
                  </div>
                </div>
                {method.isAvailable ? (
                  <Badge variant="secondary">Available</Badge>
                ) : (
                  <Badge variant="outline">Coming Soon</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Secure Payment</p>
              <p>Your payment information is encrypted and secure. We never store your payment details.</p>
            </div>
          </div>
        </div>

        {/* Payment Deadline */}
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
          <Clock className="h-4 w-4" />
          <span>Payment must be completed within 48 hours of auction end</span>
        </div>

        {/* Process Payment Button */}
        <Button
          onClick={processPayment}
          disabled={!selectedMethod || isProcessing || paymentStatus === 'processing'}
          className="w-full h-12"
          size="lg"
        >
          {isProcessing || paymentStatus === 'processing' ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <CreditCard className="h-5 w-5 mr-2" />
          )}
          {isProcessing || paymentStatus === 'processing'
            ? 'Processing Payment...'
            : `Pay ${selectedMethod ? `$${calculateTotalWithFees(selectedMethod).toLocaleString()}` : `$${amount.toLocaleString()}`}`
          }
        </Button>
      </CardContent>
    </Card>
  );
}

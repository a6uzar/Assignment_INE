import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
    Gavel,
    DollarSign,
    Clock,
    Zap,
    Target,
    ArrowUp,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface EnhancedBiddingInterfaceProps {
    auctionId: string;
    currentBid: number;
    minBidIncrement: number;
    isAuctionActive: boolean;
    isOwnAuction: boolean;
    userIsWinning: boolean;
    onBidPlaced: (amount: number) => Promise<{ success: boolean; error?: string }>;
    className?: string;
}

export function EnhancedBiddingInterface({
    auctionId,
    currentBid,
    minBidIncrement,
    isAuctionActive,
    isOwnAuction,
    userIsWinning,
    onBidPlaced,
    className
}: EnhancedBiddingInterfaceProps) {
    const [customBidAmount, setCustomBidAmount] = useState('');
    const [selectedQuickBid, setSelectedQuickBid] = useState<number | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmationCountdown, setConfirmationCountdown] = useState(0);
    const [isProcessingBid, setIsProcessingBid] = useState(false);
    const [bidHistory, setBidHistory] = useState<number[]>([]);

    const { user } = useAuth();
    const { toast } = useToast();

    // Calculate next minimum bid and quick bid options
    const nextMinBid = currentBid + minBidIncrement;
    const quickBidOptions = [
        nextMinBid,
        nextMinBid + minBidIncrement,
        nextMinBid + minBidIncrement * 2,
        nextMinBid + minBidIncrement * 5,
    ];

    // Update custom bid when minimum changes
    useEffect(() => {
        if (!customBidAmount || parseFloat(customBidAmount) < nextMinBid) {
            setCustomBidAmount(nextMinBid.toString());
        }
    }, [nextMinBid, customBidAmount]);

    // Confirmation countdown timer
    useEffect(() => {
        if (confirmationCountdown > 0) {
            const timer = setTimeout(() => {
                setConfirmationCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (confirmationCountdown === 0 && showConfirmDialog) {
            // Auto-cancel if countdown reaches 0
            handleCancelBid();
        }
    }, [confirmationCountdown, showConfirmDialog]);

    const handleQuickBid = (amount: number) => {
        if (!isAuctionActive || isOwnAuction || !user) return;

        setSelectedQuickBid(amount);
        setConfirmationCountdown(10);
        setShowConfirmDialog(true);
    };

    const handleCustomBid = () => {
        const amount = parseFloat(customBidAmount);

        if (!isAuctionActive || isOwnAuction || !user) return;

        if (isNaN(amount) || amount < nextMinBid) {
            toast({
                title: "Invalid Bid Amount",
                description: `Minimum bid is $${nextMinBid.toLocaleString()}`,
                variant: "destructive",
            });
            return;
        }

        setSelectedQuickBid(amount);
        setConfirmationCountdown(10);
        setShowConfirmDialog(true);
    };

    const handleConfirmBid = async () => {
        if (!selectedQuickBid) return;

        setIsProcessingBid(true);
        setShowConfirmDialog(false);

        try {
            const result = await onBidPlaced(selectedQuickBid);

            if (result.success) {
                setBidHistory(prev => [selectedQuickBid!, ...prev.slice(0, 4)]);
                setCustomBidAmount('');

                // Celebration effect
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });

                toast({
                    title: "Bid Placed Successfully!",
                    description: `Your bid of $${selectedQuickBid.toLocaleString()} has been placed.`,
                });
            } else {
                toast({
                    title: "Bid Failed",
                    description: result.error || "Failed to place bid",
                    variant: "destructive",
                });
            }
        } finally {
            setIsProcessingBid(false);
            setSelectedQuickBid(null);
            setConfirmationCountdown(0);
        }
    };

    const handleCancelBid = () => {
        setShowConfirmDialog(false);
        setSelectedQuickBid(null);
        setConfirmationCountdown(0);
    };

    const getBidButtonVariant = (amount: number) => {
        if (amount === nextMinBid) return "default";
        if (amount === nextMinBid + minBidIncrement) return "secondary";
        return "outline";
    };

    const getBidButtonLabel = (amount: number, index: number) => {
        const labels = ["Min Bid", "Quick +", "Power +", "Max +"];
        return labels[index] || "Bid";
    };

    if (!user) {
        return (
            <Card className={cn("w-full", className)}>
                <CardContent className="p-6 text-center">
                    <Gavel className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">Please sign in to place bids</p>
                </CardContent>
            </Card>
        );
    }

    if (isOwnAuction) {
        return (
            <Card className={cn("w-full", className)}>
                <CardContent className="p-6 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">You cannot bid on your own auction</p>
                </CardContent>
            </Card>
        );
    }

    if (!isAuctionActive) {
        return (
            <Card className={cn("w-full", className)}>
                <CardContent className="p-6 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">This auction has ended</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className={cn("w-full", className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Gavel className="h-5 w-5" />
                            Place Your Bid
                        </div>
                        {userIsWinning && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Winning
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Current Bid Display */}
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Current Highest Bid</p>
                        <motion.p
                            className="text-2xl font-bold"
                            key={currentBid}
                            initial={{ scale: 1.1, color: "rgb(var(--primary))" }}
                            animate={{ scale: 1, color: "rgb(var(--foreground))" }}
                            transition={{ duration: 0.3 }}
                        >
                            ${currentBid.toLocaleString()}
                        </motion.p>
                        <p className="text-xs text-muted-foreground">
                            Minimum next bid: ${nextMinBid.toLocaleString()}
                        </p>
                    </div>

                    {/* Quick Bid Buttons */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">Quick Bid Options</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {quickBidOptions.map((amount, index) => (
                                <motion.div
                                    key={amount}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        variant={getBidButtonVariant(amount)}
                                        size="lg"
                                        onClick={() => handleQuickBid(amount)}
                                        disabled={isProcessingBid}
                                        className="w-full h-12 flex flex-col items-center justify-center gap-1"
                                    >
                                        <span className="text-xs opacity-75">
                                            {getBidButtonLabel(amount, index)}
                                        </span>
                                        <span className="font-bold">
                                            ${amount.toLocaleString()}
                                        </span>
                                    </Button>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Custom Bid Input */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Custom Bid Amount</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    value={customBidAmount}
                                    onChange={(e) => setCustomBidAmount(e.target.value)}
                                    placeholder={nextMinBid.toString()}
                                    min={nextMinBid}
                                    step={minBidIncrement}
                                    className="pl-9"
                                    disabled={isProcessingBid}
                                />
                            </div>
                            <Button
                                onClick={handleCustomBid}
                                disabled={isProcessingBid || !customBidAmount || parseFloat(customBidAmount) < nextMinBid}
                                className="px-6"
                            >
                                <Target className="h-4 w-4 mr-2" />
                                Bid
                            </Button>
                        </div>
                    </div>

                    {/* Recent Bid History */}
                    {bidHistory.length > 0 && (
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Your Recent Bids</Label>
                            <div className="flex gap-2 flex-wrap">
                                {bidHistory.map((bid, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                        ${bid.toLocaleString()}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bidding Tips */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div className="text-xs text-blue-800">
                                <p className="font-medium mb-1">Bidding Tips:</p>
                                <ul className="space-y-1">
                                    <li>• You'll have 10 seconds to confirm your bid</li>
                                    <li>• Higher bids have better chances of winning</li>
                                    <li>• Watch for last-minute bidding activity</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bid Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Gavel className="h-5 w-5" />
                            Confirm Your Bid
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Are you sure you want to place a bid of{' '}
                                <strong>${selectedQuickBid?.toLocaleString()}</strong>?
                            </p>

                            {/* Countdown Timer */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Auto-cancel in:</span>
                                    <span className="font-bold text-red-600">{confirmationCountdown}s</span>
                                </div>
                                <Progress
                                    value={(confirmationCountdown / 10) * 100}
                                    className="h-2"
                                />
                            </div>

                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-yellow-800 text-sm">
                                    <strong>Note:</strong> This bid is binding and cannot be retracted once placed.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelBid} disabled={isProcessingBid}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmBid}
                            disabled={isProcessingBid || confirmationCountdown === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isProcessingBid ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <ArrowUp className="h-4 w-4 mr-2" />
                            )}
                            {isProcessingBid ? 'Placing Bid...' : 'Confirm Bid'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

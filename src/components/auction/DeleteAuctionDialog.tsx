import { useState } from 'react';
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
import { auctionService } from '@/lib/api/auctionService';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteAuctionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    auction: {
        id: string;
        title: string;
        status: string;
        bid_count?: number;
        current_price?: number;
    };
    onDeleted: () => void;
}

export function DeleteAuctionDialog({
    isOpen,
    onClose,
    auction,
    onDeleted
}: DeleteAuctionDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    // Reset states when dialog closes
    const handleClose = () => {
        setIsDeleting(false);
        onClose();
    };

    const canDelete = () => {
        // Can delete draft, scheduled, or active auctions without bids
        if (auction.status === 'draft' || auction.status === 'scheduled') {
            return true;
        }
        if (auction.status === 'active' && (!auction.bid_count || auction.bid_count === 0)) {
            return true;
        }
        return false;
    };

    const getWarningMessage = () => {
        if (!canDelete()) {
            if (auction.status === 'active' && auction.bid_count && auction.bid_count > 0) {
                return `This auction has ${auction.bid_count} bid${auction.bid_count > 1 ? 's' : ''} and cannot be deleted. You can cancel it instead.`;
            }
            if (auction.status === 'ended' || auction.status === 'completed') {
                return 'Completed auctions cannot be deleted for record-keeping purposes.';
            }
            return 'This auction cannot be deleted in its current state.';
        }
        return null;
    };

    const handleDelete = async () => {
        if (!canDelete()) return;

        setIsDeleting(true);
        try {
            console.log('Attempting to delete auction:', auction.id);
            const result = await auctionService.deleteAuction(auction.id);
            console.log('Delete result:', result);

            if (result.success) {
                toast({
                    title: "Auction Deleted",
                    description: "Your auction has been permanently deleted.",
                });
                onDeleted();
                // Don't call onClose() here - let the parent component handle it
            } else {
                console.error('Delete failed:', result.error);
                throw new Error(result.error?.message || 'Failed to delete auction');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete auction",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const warningMessage = getWarningMessage();

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Delete Auction
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            Are you sure you want to delete "<strong>{auction.title}</strong>"?
                        </p>

                        {warningMessage ? (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                <p className="text-destructive font-medium">{warningMessage}</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <p className="text-yellow-800">
                                        <strong>Warning:</strong> This action cannot be undone. The auction and all associated data will be permanently deleted.
                                    </p>
                                </div>

                                {auction.bid_count && auction.bid_count > 0 && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                        <p className="text-blue-800">
                                            <strong>Note:</strong> This auction has {auction.bid_count} bid{auction.bid_count > 1 ? 's' : ''}
                                            {auction.current_price && ` with a current price of $${auction.current_price}`}.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting || !canDelete()}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Auction'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

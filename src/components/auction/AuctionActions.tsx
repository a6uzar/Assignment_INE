import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    Pause,
    Play,
    Share,
    Copy
} from 'lucide-react';
import { EditAuctionDialog } from './EditAuctionDialog';
import { DeleteAuctionDialog } from './DeleteAuctionDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface AuctionActionsProps {
    auction: {
        id: string;
        title: string;
        description: string;
        reserve_price?: number;
        condition: string;
        location?: string;
        category_id: string;
        start_time: string;
        end_time: string;
        status: string;
        bid_count?: number;
        current_price?: number;
        seller_id: string;
    };
    onAuctionUpdated?: () => void;
    onAuctionDeleted?: () => void;
    variant?: 'dropdown' | 'buttons';
    size?: 'sm' | 'default' | 'lg';
}

export function AuctionActions({
    auction,
    onAuctionUpdated,
    onAuctionDeleted,
    variant = 'dropdown',
    size = 'default'
}: AuctionActionsProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    // Check if current user is the owner
    const isOwner = user?.id === auction.seller_id;

    // Permission checks
    const canEdit = () => {
        return isOwner && (
            auction.status === 'draft' ||
            auction.status === 'scheduled' ||
            (auction.status === 'active' && (!auction.bid_count || auction.bid_count === 0))
        );
    };

    const canDelete = () => {
        return isOwner && (
            auction.status === 'draft' ||
            auction.status === 'scheduled' ||
            (auction.status === 'active' && (!auction.bid_count || auction.bid_count === 0))
        );
    };

    const canPause = () => {
        return isOwner && auction.status === 'active';
    };

    const canResume = () => {
        return isOwner && auction.status === 'paused';
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/auction/${auction.id}`;
        navigator.clipboard.writeText(url);
        toast({
            title: "Link Copied",
            description: "Auction link has been copied to clipboard.",
        });
    };

    const handleViewAuction = () => {
        window.open(`/auction/${auction.id}`, '_blank');
    };

    // If not owner, show limited actions
    if (!isOwner) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size={size} className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleViewAuction}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Auction
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // Button variant for direct actions
    if (variant === 'buttons') {
        return (
            <div className="flex gap-2">
                {canEdit() && (
                    <Button
                        variant="outline"
                        size={size}
                        onClick={() => setEditDialogOpen(true)}
                        disabled={isProcessing}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                )}
                {canDelete() && (
                    <Button
                        variant="outline"
                        size={size}
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={isProcessing}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                )}

                {/* Dialogs */}
                <EditAuctionDialog
                    isOpen={editDialogOpen}
                    onClose={() => {
                        setEditDialogOpen(false);
                    }}
                    auction={auction}
                    onUpdated={() => {
                        setIsProcessing(true);
                        onAuctionUpdated?.();
                        setEditDialogOpen(false);
                        // Reset processing state after a brief delay
                        setTimeout(() => setIsProcessing(false), 500);
                    }}
                />

                <DeleteAuctionDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                    }}
                    auction={auction}
                    onDeleted={() => {
                        setIsProcessing(true);
                        onAuctionDeleted?.();
                        setDeleteDialogOpen(false);
                        // Reset processing state after a brief delay
                        setTimeout(() => setIsProcessing(false), 500);
                    }}
                />
            </div>
        );
    }

    // Dropdown variant (default)
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size={size} className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleViewAuction}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Auction
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {canEdit() && (
                        <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Auction
                        </DropdownMenuItem>
                    )}

                    {canPause() && (
                        <DropdownMenuItem>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause Auction
                        </DropdownMenuItem>
                    )}

                    {canResume() && (
                        <DropdownMenuItem>
                            <Play className="mr-2 h-4 w-4" />
                            Resume Auction
                        </DropdownMenuItem>
                    )}

                    {canDelete() && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setDeleteDialogOpen(true)}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Auction
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialogs */}
            <EditAuctionDialog
                isOpen={editDialogOpen}
                onClose={() => {
                    setEditDialogOpen(false);
                }}
                auction={auction}
                onUpdated={() => {
                    setIsProcessing(true);
                    onAuctionUpdated?.();
                    setEditDialogOpen(false);
                    // Reset processing state after a brief delay
                    setTimeout(() => setIsProcessing(false), 500);
                }}
            />

            <DeleteAuctionDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                }}
                auction={auction}
                onDeleted={() => {
                    setIsProcessing(true);
                    onAuctionDeleted?.();
                    setDeleteDialogOpen(false);
                    // Reset processing state after a brief delay
                    setTimeout(() => setIsProcessing(false), 500);
                }}
            />
        </>
    );
}

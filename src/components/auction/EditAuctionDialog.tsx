import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { auctionService } from '@/lib/api/auctionService';
import { getCategoriesWithFallback } from '@/lib/categoryUtils';
import { Loader2, Info } from 'lucide-react';

const editAuctionSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    reserve_price: z.string().optional(),
    condition: z.string().min(1, 'Please select a condition'),
    location: z.string().optional(),
    category_id: z.string().min(1, 'Please select a category'),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
});

type EditAuctionFormData = z.infer<typeof editAuctionSchema>;

interface EditAuctionDialogProps {
    isOpen: boolean;
    onClose: () => void;
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
    };
    onUpdated: () => void;
}

export function EditAuctionDialog({
    isOpen,
    onClose,
    auction,
    onUpdated
}: EditAuctionDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<Array<{ id: string, name: string, icon: string }>>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const { toast } = useToast();

    const canEditTiming = () => {
        // Can edit timing for draft and scheduled auctions without bids
        return (auction.status === 'draft' || auction.status === 'scheduled') &&
            (!auction.bid_count || auction.bid_count === 0);
    };

    const canEdit = () => {
        // Can edit draft and scheduled auctions, limited edits for active without bids
        return auction.status === 'draft' ||
            auction.status === 'scheduled' ||
            (auction.status === 'active' && (!auction.bid_count || auction.bid_count === 0));
    };

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
        reset,
    } = useForm<EditAuctionFormData>({
        resolver: zodResolver(editAuctionSchema),
    });

    // Reset form and states when dialog closes
    const handleClose = () => {
        setIsSubmitting(false);
        reset();
        onClose();
    };

    // Load categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoriesData = await getCategoriesWithFallback();
                setCategories(categoriesData);
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };

        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    // Populate form with auction data when dialog opens
    useEffect(() => {
        if (isOpen && auction) {
            reset({
                title: auction.title,
                description: auction.description,
                reserve_price: auction.reserve_price?.toString() || '',
                condition: auction.condition,
                location: auction.location || '',
                category_id: auction.category_id,
                start_time: canEditTiming() ? auction.start_time.slice(0, 16) : undefined, // Format for datetime-local
                end_time: canEditTiming() ? auction.end_time.slice(0, 16) : undefined,
            });
        }
    }, [isOpen, auction, reset]);

    const onSubmit = async (data: EditAuctionFormData) => {
        if (!canEdit()) {
            toast({
                title: "Cannot Edit",
                description: "This auction cannot be edited in its current state.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const updateData: any = {
                id: auction.id,
                title: data.title,
                description: data.description,
                condition: data.condition,
                location: data.location,
                category_id: data.category_id,
            };

            // Only include reserve_price if provided
            if (data.reserve_price && data.reserve_price.trim()) {
                updateData.reserve_price = Number(data.reserve_price);
            }

            // Only include timing if allowed to edit
            if (canEditTiming() && data.start_time && data.end_time) {
                updateData.start_time = data.start_time;
                updateData.end_time = data.end_time;
            }

            const result = await auctionService.updateAuction(updateData);

            if (result.success) {
                toast({
                    title: "Auction Updated",
                    description: "Your auction has been successfully updated.",
                });
                onUpdated();
                // Don't call onClose() here - let the parent component handle it
            } else {
                throw new Error(result.error?.message || 'Failed to update auction');
            }
        } catch (error) {
            console.error('Update error:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update auction",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!canEdit()) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cannot Edit Auction</DialogTitle>
                        <DialogDescription>
                            This auction cannot be edited because it is {auction.status}
                            {auction.bid_count && auction.bid_count > 0 && ` and has ${auction.bid_count} bid${auction.bid_count > 1 ? 's' : ''}`}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={onClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Auction</DialogTitle>
                    <DialogDescription>
                        Update your auction details.
                        {!canEditTiming() && (
                            <span className="block mt-2 text-amber-600">
                                <Info className="inline h-4 w-4 mr-1" />
                                Timing cannot be changed for active auctions or auctions with bids.
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            {...register('title')}
                            placeholder="Enter auction title"
                        />
                        {errors.title && (
                            <p className="text-sm text-destructive">{errors.title.message}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            {...register('description')}
                            placeholder="Describe your item"
                            rows={4}
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">{errors.description.message}</p>
                        )}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category_id">Category *</Label>
                        <Select
                            value={watch('category_id')}
                            onValueChange={(value) => setValue('category_id', value)}
                            disabled={loadingCategories}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        <span className="emoji">{category.icon}</span> {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.category_id && (
                            <p className="text-sm text-destructive">{errors.category_id.message}</p>
                        )}
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                        <Label htmlFor="condition">Condition *</Label>
                        <Select
                            value={watch('condition')}
                            onValueChange={(value) => setValue('condition', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="like-new">Like New</SelectItem>
                                <SelectItem value="excellent">Excellent</SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="fair">Fair</SelectItem>
                                <SelectItem value="poor">Poor</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.condition && (
                            <p className="text-sm text-destructive">{errors.condition.message}</p>
                        )}
                    </div>

                    {/* Reserve Price */}
                    <div className="space-y-2">
                        <Label htmlFor="reserve_price">Reserve Price (Optional)</Label>
                        <Input
                            id="reserve_price"
                            type="number"
                            step="0.01"
                            {...register('reserve_price')}
                            placeholder="Minimum price to sell"
                        />
                        {errors.reserve_price && (
                            <p className="text-sm text-destructive">{errors.reserve_price.message}</p>
                        )}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            {...register('location')}
                            placeholder="Item location"
                        />
                    </div>

                    {/* Timing (only if allowed) */}
                    {canEditTiming() && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Start Time</Label>
                                <Input
                                    id="start_time"
                                    type="datetime-local"
                                    {...register('start_time')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end_time">End Time</Label>
                                <Input
                                    id="end_time"
                                    type="datetime-local"
                                    {...register('end_time')}
                                />
                            </div>
                        </>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Auction'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

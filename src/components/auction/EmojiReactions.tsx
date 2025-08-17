import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
    Smile,
    Heart,
    ThumbsUp,
    Zap,
    Flame,
    Gem,
    Star,
    Trophy,
    Target,
    TrendingUp,
} from 'lucide-react';

interface EmojiReaction {
    id: string;
    auction_id: string;
    user_id: string;
    emoji: string;
    target_type: 'auction' | 'bid' | 'milestone';
    target_id?: string;
    created_at: string;
    user: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

interface ReactionSummary {
    emoji: string;
    count: number;
    users: Array<{
        id: string;
        name: string;
        avatar?: string;
    }>;
    hasUserReacted: boolean;
}

interface EmojiReactionsProps {
    auctionId: string;
    targetType?: 'auction' | 'bid' | 'milestone';
    targetId?: string;
    currentUserId?: string;
    compact?: boolean;
    showQuickReactions?: boolean;
    className?: string;
}

const QUICK_REACTIONS = [
    { emoji: '🔥', icon: Flame, label: 'Hot!', color: 'text-orange-500' },
    { emoji: '⚡', icon: Zap, label: 'Fast!', color: 'text-yellow-500' },
    { emoji: '💎', icon: Gem, label: 'Valuable!', color: 'text-blue-500' },
    { emoji: '🎯', icon: Target, label: 'Nice!', color: 'text-green-500' },
    { emoji: '👍', icon: ThumbsUp, label: 'Good!', color: 'text-gray-600' },
    { emoji: '❤️', icon: Heart, label: 'Love!', color: 'text-red-500' },
    { emoji: '⭐', icon: Star, label: 'Amazing!', color: 'text-yellow-600' },
    { emoji: '🏆', icon: Trophy, label: 'Winner!', color: 'text-yellow-700' },
];

const MILESTONE_REACTIONS = [
    { emoji: '🎉', label: 'Celebrate!', color: 'text-purple-500' },
    { emoji: '🚀', label: 'To the moon!', color: 'text-blue-600' },
    { emoji: '💰', label: 'Big money!', color: 'text-green-600' },
    { emoji: '📈', label: 'Rising!', color: 'text-emerald-500' },
];

export function EmojiReactions({
    auctionId,
    targetType = 'auction',
    targetId,
    currentUserId,
    compact = false,
    showQuickReactions = true,
    className
}: EmojiReactionsProps) {
    const [reactions, setReactions] = useState<EmojiReaction[]>([]);
    const [reactionSummary, setReactionSummary] = useState<ReactionSummary[]>([]);
    const [showAllReactions, setShowAllReactions] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [floatingReactions, setFloatingReactions] = useState<Array<{
        id: string;
        emoji: string;
        x: number;
        y: number;
    }>>([]);

    const { user } = useAuth();
    const { toast } = useToast();

    // Fetch reactions
    const fetchReactions = async () => {
        try {
            // Try to fetch from database first
            try {
                const query = supabase
                    .from('auction_reactions')
                    .select(`
                        *,
                        user:users(
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('auction_id', auctionId);

                // Add additional filters based on target type
                if (targetType !== 'auction' && targetId) {
                    // For future implementation when we have target_type and target_id columns
                    // query = query.eq('target_type', targetType).eq('target_id', targetId);
                }

                const { data: reactionsData, error } = await query.order('created_at', { ascending: false });

                if (error && error.code !== 'PGRST116') { // Not a "table not found" error
                    throw error;
                }

                if (reactionsData && reactionsData.length >= 0) {
                    // Transform data to match our interface
                    const transformedReactions: EmojiReaction[] = reactionsData.map(reaction => ({
                        id: reaction.id,
                        auction_id: reaction.auction_id,
                        user_id: reaction.user_id,
                        emoji: reaction.emoji,
                        target_type: 'auction', // Default for now
                        target_id: targetId,
                        created_at: reaction.created_at,
                        user: {
                            id: reaction.user.id,
                            full_name: reaction.user.full_name || 'Anonymous',
                            avatar_url: reaction.user.avatar_url
                        }
                    }));

                    setReactions(transformedReactions);
                    calculateReactionSummary(transformedReactions);
                    return;
                }
            } catch (dbError) {
                console.log('Database table not available, using mock data');
            }

            // Fallback to mock data if database tables don't exist
            const mockReactions: EmojiReaction[] = [
                {
                    id: '1',
                    auction_id: auctionId,
                    user_id: 'user1',
                    emoji: '🔥',
                    target_type: targetType,
                    target_id: targetId || null,
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    user: {
                        id: 'user1',
                        full_name: 'John Doe',
                        avatar_url: null
                    }
                },
                {
                    id: '2',
                    auction_id: auctionId,
                    user_id: 'user2',
                    emoji: '💎',
                    target_type: targetType,
                    target_id: targetId || null,
                    created_at: new Date(Date.now() - 1800000).toISOString(),
                    user: {
                        id: 'user2',
                        full_name: 'Jane Smith',
                        avatar_url: null
                    }
                },
                {
                    id: '3',
                    auction_id: auctionId,
                    user_id: 'user3',
                    emoji: '🔥',
                    target_type: targetType,
                    target_id: targetId || null,
                    created_at: new Date(Date.now() - 900000).toISOString(),
                    user: {
                        id: 'user3',
                        full_name: 'Bob Wilson',
                        avatar_url: null
                    }
                }
            ];

            setReactions(mockReactions);
            calculateReactionSummary(mockReactions);

        } catch (error) {
            console.error('Error fetching reactions:', error);
            toast({
                title: "Error",
                description: "Failed to load reactions",
                variant: "destructive",
            });
        }
    };

    // Calculate reaction summary
    const calculateReactionSummary = (reactionsData: EmojiReaction[]) => {
        const summary: { [emoji: string]: ReactionSummary } = {};

        reactionsData.forEach(reaction => {
            if (!summary[reaction.emoji]) {
                summary[reaction.emoji] = {
                    emoji: reaction.emoji,
                    count: 0,
                    users: [],
                    hasUserReacted: false,
                };
            }

            summary[reaction.emoji].count++;
            summary[reaction.emoji].users.push({
                id: reaction.user.id,
                name: reaction.user.full_name,
                avatar: reaction.user.avatar_url,
            });

            if (reaction.user_id === currentUserId) {
                summary[reaction.emoji].hasUserReacted = true;
            }
        });

        setReactionSummary(Object.values(summary).sort((a, b) => b.count - a.count));
    };

    // Add reaction
    const addReaction = async (emoji: string) => {
        if (!user) {
            toast({
                title: "Please sign in",
                description: "You need to be signed in to react",
                variant: "destructive",
            });
            return;
        }

        // Check if user already reacted with this emoji
        const existingReaction = reactions.find(
            r => r.user_id === user.id && r.emoji === emoji
        );

        if (existingReaction) {
            // Remove existing reaction
            try {
                // Try database delete first
                try {
                    const { error } = await supabase
                        .from('auction_reactions')
                        .delete()
                        .eq('id', existingReaction.id);

                    if (error && error.code !== 'PGRST116') { // Not a "table not found" error
                        throw error;
                    }

                    if (!error) {
                        setReactions(prev => prev.filter(r => r.id !== existingReaction.id));
                        toast({
                            title: "Reaction removed",
                            description: `Removed your ${emoji} reaction`,
                            duration: 2000,
                        });
                        return;
                    }
                } catch (dbError) {
                    console.log('Database table not available, using local removal');
                }

                // Fallback to local removal
                setReactions(prev => prev.filter(r => r.id !== existingReaction.id));
                toast({
                    title: "Reaction removed",
                    description: `Removed your ${emoji} reaction (local only)`,
                    duration: 2000,
                });

            } catch (error) {
                console.error('Error removing reaction:', error);
                toast({
                    title: "Error",
                    description: "Failed to remove reaction",
                    variant: "destructive",
                });
            }
            return;
        }

        // Add new reaction
        try {
            // Try database insert first
            try {
                const { data: insertedReaction, error } = await supabase
                    .from('auction_reactions')
                    .insert({
                        auction_id: auctionId,
                        user_id: user.id,
                        emoji: emoji,
                        reaction_type: 'celebration' // Default reaction type
                    })
                    .select(`
                        *,
                        user:users(
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .single();

                if (error && error.code !== 'PGRST116') { // Not a "table not found" error
                    throw error;
                }

                if (insertedReaction) {
                    const newDbReaction: EmojiReaction = {
                        id: insertedReaction.id,
                        auction_id: insertedReaction.auction_id,
                        user_id: insertedReaction.user_id,
                        emoji: insertedReaction.emoji,
                        target_type: 'auction',
                        target_id: targetId || null,
                        created_at: insertedReaction.created_at,
                        user: {
                            id: insertedReaction.user.id,
                            full_name: insertedReaction.user.full_name || 'Anonymous',
                            avatar_url: insertedReaction.user.avatar_url
                        }
                    };

                    setReactions(prev => [newDbReaction, ...prev]);
                    triggerFloatingReaction(emoji);

                    toast({
                        title: "Reaction added!",
                        description: `You reacted with ${emoji}`,
                        duration: 2000,
                    });
                    return;
                }
            } catch (dbError) {
                console.log('Database table not available, using mock reaction');
            }

            // Fallback to mock reaction
            const newReaction: EmojiReaction = {
                id: Date.now().toString(),
                auction_id: auctionId,
                user_id: user.id,
                emoji,
                target_type: targetType,
                target_id: targetId || null,
                created_at: new Date().toISOString(),
                user: {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || 'Anonymous',
                    avatar_url: user.user_metadata?.avatar_url || null
                }
            };

            setReactions(prev => [newReaction, ...prev]);
            triggerFloatingReaction(emoji);

            toast({
                title: "Reaction added!",
                description: `You reacted with ${emoji} (local only)`,
                duration: 2000,
            });

        } catch (error) {
            console.error('Error adding reaction:', error);
            toast({
                title: "Error",
                description: "Failed to add reaction",
                variant: "destructive",
            });
        }
    };

    // Trigger floating reaction animation
    const triggerFloatingReaction = (emoji: string) => {
        const id = Date.now().toString();
        const x = Math.random() * 100;
        const y = Math.random() * 100;

        setFloatingReactions(prev => [...prev, { id, emoji, x, y }]);

        // Remove after animation
        setTimeout(() => {
            setFloatingReactions(prev => prev.filter(r => r.id !== id));
        }, 2000);
    };

    // Setup real-time subscriptions
    useEffect(() => {
        fetchReactions();

        const channel = supabase
            .channel(`reactions-${auctionId}-${targetType}-${targetId || 'null'}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'auction_reactions',
                    filter: `auction_id=eq.${auctionId}`,
                },
                () => {
                    fetchReactions();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [auctionId, targetType, targetId]);

    if (compact) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                {/* Top reactions */}
                {reactionSummary.slice(0, 3).map((reaction) => (
                    <Button
                        key={reaction.emoji}
                        variant={reaction.hasUserReacted ? "default" : "outline"}
                        size="sm"
                        onClick={() => addReaction(reaction.emoji)}
                        className="h-7 px-2 text-xs"
                    >
                        <span className="mr-1">{reaction.emoji}</span>
                        <span>{reaction.count}</span>
                    </Button>
                ))}

                {/* Quick reaction button */}
                {showQuickReactions && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllReactions(!showAllReactions)}
                        className="h-7 w-7 p-0"
                    >
                        <Smile className="h-3 w-3" />
                    </Button>
                )}

                {/* Quick reactions popup */}
                <AnimatePresence>
                    {showAllReactions && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute top-full left-0 z-50 mt-2 p-2 bg-white border rounded-lg shadow-lg"
                        >
                            <div className="grid grid-cols-4 gap-1">
                                {QUICK_REACTIONS.slice(0, 8).map((reaction) => (
                                    <Button
                                        key={reaction.emoji}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            addReaction(reaction.emoji);
                                            setShowAllReactions(false);
                                        }}
                                        className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                                        title={reaction.label}
                                    >
                                        {reaction.emoji}
                                    </Button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <CardContent className="p-4">
                <div className="space-y-4">
                    {/* Current Reactions */}
                    {reactionSummary.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Reactions</h4>
                            <div className="flex flex-wrap gap-2">
                                {reactionSummary.map((reaction) => (
                                    <motion.button
                                        key={reaction.emoji}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => addReaction(reaction.emoji)}
                                        className={cn(
                                            "flex items-center gap-1 px-2 py-1 rounded-full border transition-all",
                                            reaction.hasUserReacted
                                                ? "bg-blue-100 border-blue-300 text-blue-700"
                                                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                        )}
                                    >
                                        <span className="text-sm">{reaction.emoji}</span>
                                        <span className="text-xs font-medium">{reaction.count}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Reactions */}
                    {showQuickReactions && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Quick Reactions</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {(targetType === 'milestone' ? MILESTONE_REACTIONS : QUICK_REACTIONS)
                                    .slice(0, 8)
                                    .map((reaction) => {
                                        const IconComponent = 'icon' in reaction ? reaction.icon : Smile;
                                        return (
                                            <motion.button
                                                key={reaction.emoji}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => addReaction(reaction.emoji)}
                                                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                                                title={reaction.label}
                                            >
                                                <span className="text-lg">{reaction.emoji}</span>
                                                <span className="text-xs text-gray-600">{reaction.label}</span>
                                            </motion.button>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Recent Reactions */}
                    {reactions.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Recent</h4>
                            <div className="space-y-1">
                                {reactions.slice(0, 5).map((reaction) => (
                                    <motion.div
                                        key={reaction.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2 text-xs text-gray-600"
                                    >
                                        <span className="text-sm">{reaction.emoji}</span>
                                        <span className="font-medium">
                                            {reaction.user_id === currentUserId ? 'You' : reaction.user.full_name}
                                        </span>
                                        <span className="text-gray-400">
                                            {new Date(reaction.created_at).toLocaleTimeString()}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating Reactions */}
                <AnimatePresence>
                    {floatingReactions.map((reaction) => (
                        <motion.div
                            key={reaction.id}
                            initial={{
                                opacity: 1,
                                scale: 1,
                                x: `${reaction.x}%`,
                                y: '100%'
                            }}
                            animate={{
                                opacity: 0,
                                scale: 1.5,
                                y: '-100%'
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 2,
                                ease: "easeOut"
                            }}
                            className="absolute pointer-events-none text-2xl"
                            style={{
                                left: `${reaction.x}%`,
                                bottom: '20px'
                            }}
                        >
                            {reaction.emoji}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

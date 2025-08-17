import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuctionParticipants } from '@/hooks/useAuctionParticipants';
import { cn } from '@/lib/utils';
import {
    Users,
    Eye,
    Crown,
    Activity,
    Clock,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveParticipantsPanelProps {
    auctionId: string;
    className?: string;
    compact?: boolean;
    isActive?: boolean;
}

export function LiveParticipantsPanel({
    auctionId,
    className,
    compact = false,
    isActive = true
}: LiveParticipantsPanelProps) {
    const {
        participants,
        watchers,
        participantCount,
        watcherCount,
        loading,
        error
    } = useAuctionParticipants({ 
        auctionId,
        enabled: isActive 
    });

    if (loading) {
        return (
            <Card className={cn("w-full", className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Live Participants
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-8 h-8 bg-muted rounded-full" />
                                <div className="flex-1">
                                    <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={cn("w-full", className)}>
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Unable to load participants</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (compact) {
        return (
            <div className={cn("flex items-center gap-4", className)}>
                {/* Participant Avatars */}
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        <AnimatePresence>
                            {participants.slice(0, 4).map((participant, index) => (
                                <motion.div
                                    key={participant.id}
                                    initial={{ scale: 0, x: 20 }}
                                    animate={{ scale: 1, x: 0 }}
                                    exit={{ scale: 0, x: -20 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative"
                                >
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Avatar
                                                    className={cn(
                                                        "w-8 h-8 border-2 border-background transition-all duration-300",
                                                        participant.isCurrentBidder && "ring-2 ring-yellow-400 border-yellow-400",
                                                        participant.isActive && "ring-1 ring-green-400"
                                                    )}
                                                >
                                                    <AvatarImage src={participant.avatar_url} />
                                                    <AvatarFallback className="text-xs">
                                                        {participant.full_name.split(' ').map(n => n[0]).join('')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {participant.isCurrentBidder && (
                                                    <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
                                                )}
                                                {participant.isActive && (
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-background" />
                                                )}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="text-center">
                                                    <p className="font-medium">{participant.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {participant.bidCount} bid{participant.bidCount !== 1 ? 's' : ''}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(participant.lastActivity), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {participantCount > 4 && (
                            <div className="w-8 h-8 bg-muted rounded-full border-2 border-background flex items-center justify-center">
                                <span className="text-xs font-medium">+{participantCount - 4}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        <span>{participantCount} bidding</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{watcherCount} watching</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Live Participants
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                            <Activity className="h-3 w-3 mr-1" />
                            {participantCount}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            {watcherCount}
                        </Badge>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Active Bidders */}
                {participants.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">Active Bidders</span>
                        </div>
                        <ScrollArea className="h-48">
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {participants.map((participant, index) => (
                                        <motion.div
                                            key={participant.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
                                                participant.isCurrentBidder && "bg-yellow-50 border border-yellow-200",
                                                participant.isActive && !participant.isCurrentBidder && "bg-green-50 border border-green-200"
                                            )}
                                        >
                                            <div className="relative">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={participant.avatar_url} />
                                                    <AvatarFallback className="text-xs">
                                                        {participant.full_name.split(' ').map(n => n[0]).join('')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {participant.isCurrentBidder && (
                                                    <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
                                                )}
                                                {participant.isActive && (
                                                    <motion.div
                                                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-background"
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium truncate">
                                                        {participant.full_name}
                                                    </p>
                                                    {participant.isCurrentBidder && (
                                                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                                            <Crown className="h-3 w-3 mr-1" />
                                                            Leading
                                                        </Badge>
                                                    )}
                                                    {participant.isActive && !participant.isCurrentBidder && (
                                                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                                            <TrendingUp className="h-3 w-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span>{participant.bidCount} bid{participant.bidCount !== 1 ? 's' : ''}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDistanceToNow(new Date(participant.lastActivity), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {participants.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No active bidders yet</p>
                        <p className="text-xs">Be the first to place a bid!</p>
                    </div>
                )}

                {/* Watchers Summary */}
                {watchers.length > 0 && (
                    <>
                        <Separator />
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Eye className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">
                                    {watcherCount} People Watching
                                </span>
                            </div>
                            <div className="flex -space-x-2">
                                {watchers.slice(0, 8).map((watcher, index) => (
                                    <motion.div
                                        key={watcher.id}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Avatar className="w-6 h-6 border-2 border-background">
                                                        <AvatarImage src={watcher.avatar_url} />
                                                        <AvatarFallback className="text-xs">
                                                            {watcher.full_name.split(' ').map(n => n[0]).join('')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{watcher.full_name}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </motion.div>
                                ))}
                                {watcherCount > 8 && (
                                    <div className="w-6 h-6 bg-muted rounded-full border-2 border-background flex items-center justify-center">
                                        <span className="text-xs font-medium">+{watcherCount - 8}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

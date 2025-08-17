import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    Activity,
    TrendingUp,
    Zap,
    Crown,
    Eye,
    UserPlus,
    Target,
    Clock,
    DollarSign,
    Users,
    Flame,
    Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityEvent {
    id: string;
    type: 'bid' | 'watch' | 'join' | 'milestone' | 'extension' | 'warning';
    timestamp: string;
    user?: {
        id: string;
        name: string;
        avatar: string;
    };
    data: {
        amount?: number;
        previousAmount?: number;
        milestone?: string;
        message?: string;
        isCurrentUser?: boolean;
    };
}

interface LiveActivityStreamProps {
    auctionId: string;
    events: ActivityEvent[];
    biddingPressure?: {
        level: 'low' | 'medium' | 'high' | 'extreme';
        isHeating: boolean;
    };
    className?: string;
    compact?: boolean;
}

export function LiveActivityStream({
    auctionId,
    events,
    biddingPressure,
    className,
    compact = false
}: LiveActivityStreamProps) {
    const getEventIcon = (event: ActivityEvent) => {
        switch (event.type) {
            case 'bid':
                return event.data.isCurrentUser ? Crown : DollarSign;
            case 'watch':
                return Eye;
            case 'join':
                return UserPlus;
            case 'milestone':
                return Target;
            case 'extension':
                return Clock;
            case 'warning':
                return Bell;
            default:
                return Activity;
        }
    };

    const getEventColor = (event: ActivityEvent) => {
        switch (event.type) {
            case 'bid':
                return event.data.isCurrentUser
                    ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                    : 'text-green-600 bg-green-50 border-green-200';
            case 'watch':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'join':
                return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'milestone':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'extension':
                return 'text-indigo-600 bg-indigo-50 border-indigo-200';
            case 'warning':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getEventDescription = (event: ActivityEvent) => {
        switch (event.type) {
            case 'bid':
                const increase = event.data.amount && event.data.previousAmount
                    ? event.data.amount - event.data.previousAmount
                    : 0;
                return (
                    <div className="space-y-1">
                        <p className="font-medium">
                            {event.data.isCurrentUser ? 'You placed a bid' : `${event.user?.name} placed a bid`}
                        </p>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                                ${event.data.amount?.toLocaleString()}
                            </Badge>
                            {increase > 0 && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                    +${increase.toLocaleString()}
                                </Badge>
                            )}
                        </div>
                    </div>
                );
            case 'watch':
                return `${event.user?.name} started watching this auction`;
            case 'join':
                return `${event.user?.name} joined the auction`;
            case 'milestone':
                return event.data.milestone;
            case 'extension':
                return event.data.message || 'Auction time extended';
            case 'warning':
                return event.data.message;
            default:
                return event.data.message || 'Unknown activity';
        }
    };

    const getPriorityEvents = () => {
        // Show most recent and important events first
        return events
            .sort((a, b) => {
                const timeSort = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

                // Boost priority for current user events and high-value bids
                const aPriority = (a.data.isCurrentUser ? 1000 : 0) + (a.data.amount || 0);
                const bPriority = (b.data.isCurrentUser ? 1000 : 0) + (b.data.amount || 0);

                return (bPriority - aPriority) + timeSort;
            })
            .slice(0, compact ? 5 : 15);
    };

    if (compact) {
        return (
            <div className={cn("space-y-2", className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm font-medium">Live Activity</span>
                    </div>
                    {biddingPressure && (
                        <Badge
                            variant={biddingPressure.level === 'high' || biddingPressure.level === 'extreme' ? 'destructive' : 'secondary'}
                            className="text-xs"
                        >
                            {biddingPressure.isHeating && <Flame className="h-3 w-3 mr-1" />}
                            {biddingPressure.level.toUpperCase()}
                        </Badge>
                    )}
                </div>

                <div className="space-y-1">
                    {getPriorityEvents().slice(0, 3).map((event, index) => {
                        const EventIcon = getEventIcon(event);
                        return (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-2 text-xs"
                            >
                                <EventIcon className="h-3 w-3 text-muted-foreground" />
                                <span className="flex-1 truncate">
                                    {typeof getEventDescription(event) === 'string'
                                        ? getEventDescription(event)
                                        : event.user?.name + ' placed a bid'
                                    }
                                </span>
                                <span className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        <span>Live Activity Stream</span>
                        <div className="flex items-center gap-1">
                            <motion.div
                                className="w-2 h-2 bg-green-400 rounded-full"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <span className="text-xs text-muted-foreground">Live</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {events.length} events
                        </Badge>
                        {biddingPressure && (
                            <Badge
                                variant={biddingPressure.level === 'high' || biddingPressure.level === 'extreme' ? 'destructive' : 'secondary'}
                                className="text-xs"
                            >
                                {biddingPressure.isHeating && <Flame className="h-3 w-3 mr-1" />}
                                {biddingPressure.level.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-80">
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {getPriorityEvents().map((event, index) => {
                                const EventIcon = getEventIcon(event);
                                const eventColors = getEventColor(event);

                                return (
                                    <motion.div
                                        key={event.id}
                                        layout
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                        transition={{
                                            duration: 0.3,
                                            delay: index * 0.05,
                                            layout: { duration: 0.2 }
                                        }}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg border transition-all duration-300",
                                            eventColors,
                                            event.data.isCurrentUser && "ring-2 ring-yellow-200"
                                        )}
                                    >
                                        {/* Icon */}
                                        <motion.div
                                            className="flex-shrink-0 mt-0.5"
                                            animate={event.type === 'bid' ? { scale: [1, 1.2, 1] } : {}}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <EventIcon className="h-4 w-4" />
                                        </motion.div>

                                        {/* Avatar (for user events) */}
                                        {event.user && (
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={event.user.avatar} />
                                                <AvatarFallback className="text-xs">
                                                    {event.user.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="space-y-1">
                                                {typeof getEventDescription(event) === 'string' ? (
                                                    <p className="text-sm">{getEventDescription(event)}</p>
                                                ) : (
                                                    getEventDescription(event)
                                                )}

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    <span>
                                                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                                    </span>
                                                    {event.data.isCurrentUser && (
                                                        <Badge variant="outline" className="text-xs px-1">
                                                            You
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trend indicator for bids */}
                                        {event.type === 'bid' && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex-shrink-0"
                                            >
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {events.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No activity yet</p>
                                <p className="text-xs">Events will appear here as they happen</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Activity Summary */}
                {events.length > 0 && (
                    <>
                        <Separator className="my-4" />
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="space-y-1">
                                <div className="text-lg font-bold text-blue-600">
                                    {events.filter(e => e.type === 'bid').length}
                                </div>
                                <p className="text-xs text-muted-foreground">Total Bids</p>
                            </div>
                            <div className="space-y-1">
                                <div className="text-lg font-bold text-purple-600">
                                    {new Set(events.filter(e => e.user).map(e => e.user!.id)).size}
                                </div>
                                <p className="text-xs text-muted-foreground">Participants</p>
                            </div>
                            <div className="space-y-1">
                                <div className="text-lg font-bold text-orange-600">
                                    {events.filter(e => e.type === 'watch').length}
                                </div>
                                <p className="text-xs text-muted-foreground">Watchers</p>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
    Clock,
    AlertTriangle,
    Zap,
    TrendingUp,
    Timer,
    Bell,
    Activity,
    Target,
    Flame,
} from 'lucide-react';

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
}

interface BiddingPressure {
    level: 'low' | 'medium' | 'high' | 'extreme';
    recentBids: number;
    lastBidTime: string | null;
    description: string;
}

interface EnhancedCountdownTimerProps {
    endTime: string;
    biddingPressure?: BiddingPressure;
    autoExtendMinutes?: number;
    lastExtensionTime?: string;
    onTimePhaseChange?: (phase: 'safe' | 'warning' | 'critical' | 'final') => void;
    onAutoExtend?: () => void;
    className?: string;
}

export function EnhancedCountdownTimer({
    endTime,
    biddingPressure,
    autoExtendMinutes = 5,
    lastExtensionTime,
    onTimePhaseChange,
    onAutoExtend,
    className
}: EnhancedCountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeRemaining>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
    });
    const [currentPhase, setCurrentPhase] = useState<'safe' | 'warning' | 'critical' | 'final'>('safe');
    const [showExtensionAlert, setShowExtensionAlert] = useState(false);
    const [pulseIntensity, setPulseIntensity] = useState(0);

    const calculateTimeLeft = useCallback(() => {
        const now = new Date().getTime();
        const targetTime = new Date(endTime).getTime();
        const difference = targetTime - now;

        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds, total: difference });

            // Determine time phase
            let newPhase: 'safe' | 'warning' | 'critical' | 'final';
            if (difference < 60 * 1000) { // Less than 1 minute
                newPhase = 'final';
                setPulseIntensity(1.5);
            } else if (difference < 5 * 60 * 1000) { // Less than 5 minutes
                newPhase = 'critical';
                setPulseIntensity(1.2);
            } else if (difference < 15 * 60 * 1000) { // Less than 15 minutes
                newPhase = 'warning';
                setPulseIntensity(1.1);
            } else {
                newPhase = 'safe';
                setPulseIntensity(1);
            }

            if (newPhase !== currentPhase) {
                setCurrentPhase(newPhase);
                onTimePhaseChange?.(newPhase);
            }

            // Check for auto-extend conditions
            if (difference < autoExtendMinutes * 60 * 1000 && biddingPressure?.level === 'high') {
                setShowExtensionAlert(true);
            }
        } else {
            setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        }
    }, [endTime, currentPhase, autoExtendMinutes, biddingPressure, onTimePhaseChange]);

    useEffect(() => {
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    const formatNumber = (num: number) => num.toString().padStart(2, '0');

    const getPhaseConfig = () => {
        switch (currentPhase) {
            case 'final':
                return {
                    color: 'bg-red-600 text-white',
                    borderColor: 'border-red-600',
                    textColor: 'text-red-600',
                    bgColor: 'bg-red-50',
                    icon: AlertTriangle,
                    message: 'Final Moments!',
                    description: 'Auction ending very soon'
                };
            case 'critical':
                return {
                    color: 'bg-orange-500 text-white',
                    borderColor: 'border-orange-500',
                    textColor: 'text-orange-600',
                    bgColor: 'bg-orange-50',
                    icon: Flame,
                    message: 'Critical Time',
                    description: 'Less than 5 minutes remaining'
                };
            case 'warning':
                return {
                    color: 'bg-yellow-500 text-white',
                    borderColor: 'border-yellow-500',
                    textColor: 'text-yellow-600',
                    bgColor: 'bg-yellow-50',
                    icon: Timer,
                    message: 'Time Running Low',
                    description: 'Less than 15 minutes remaining'
                };
            default:
                return {
                    color: 'bg-green-600 text-white',
                    borderColor: 'border-green-600',
                    textColor: 'text-green-600',
                    bgColor: 'bg-green-50',
                    icon: Clock,
                    message: 'Time Remaining',
                    description: 'Auction in progress'
                };
        }
    };

    const getPressureConfig = () => {
        if (!biddingPressure) return null;

        switch (biddingPressure.level) {
            case 'extreme':
                return {
                    color: 'bg-red-600 text-white',
                    icon: Zap,
                    pulse: true,
                    description: `🔥 EXTREME ACTIVITY: ${biddingPressure.recentBids} bids in last minute!`
                };
            case 'high':
                return {
                    color: 'bg-orange-500 text-white',
                    icon: TrendingUp,
                    pulse: true,
                    description: `⚡ HIGH ACTIVITY: ${biddingPressure.recentBids} recent bids`
                };
            case 'medium':
                return {
                    color: 'bg-yellow-500 text-white',
                    icon: Activity,
                    pulse: false,
                    description: `📈 MODERATE ACTIVITY: ${biddingPressure.recentBids} recent bids`
                };
            default:
                return {
                    color: 'bg-blue-500 text-white',
                    icon: Target,
                    pulse: false,
                    description: `💭 CALM BIDDING: ${biddingPressure.recentBids} recent bids`
                };
        }
    };

    const phaseConfig = getPhaseConfig();
    const pressureConfig = getPressureConfig();
    const PhaseIcon = phaseConfig.icon;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Main Timer Display */}
            <Card className={cn("relative overflow-hidden transition-all duration-300", phaseConfig.borderColor)}>
                <div className={cn("absolute inset-0 opacity-10", phaseConfig.bgColor)} />

                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ scale: pulseIntensity }}
                                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                            >
                                <PhaseIcon className={cn("h-5 w-5", phaseConfig.textColor)} />
                            </motion.div>
                            <span>{phaseConfig.message}</span>
                        </div>
                        <Badge className={phaseConfig.color}>
                            {phaseConfig.description}
                        </Badge>
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        {/* Days */}
                        <div className="space-y-1">
                            <motion.div
                                className={cn("text-3xl font-bold", phaseConfig.textColor)}
                                animate={{ scale: timeLeft.days > 0 ? [1, 1.05, 1] : 1 }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                {formatNumber(timeLeft.days)}
                            </motion.div>
                            <div className="text-sm text-muted-foreground">Days</div>
                        </div>

                        {/* Hours */}
                        <div className="space-y-1">
                            <motion.div
                                className={cn("text-3xl font-bold", phaseConfig.textColor)}
                                animate={{ scale: timeLeft.hours > 0 ? [1, 1.05, 1] : 1 }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            >
                                {formatNumber(timeLeft.hours)}
                            </motion.div>
                            <div className="text-sm text-muted-foreground">Hours</div>
                        </div>

                        {/* Minutes */}
                        <div className="space-y-1">
                            <motion.div
                                className={cn("text-3xl font-bold", phaseConfig.textColor)}
                                animate={{
                                    scale: currentPhase === 'critical' || currentPhase === 'final' ? [1, 1.1, 1] : [1, 1.05, 1]
                                }}
                                transition={{ duration: 1, repeat: Infinity, delay: 1 }}
                            >
                                {formatNumber(timeLeft.minutes)}
                            </motion.div>
                            <div className="text-sm text-muted-foreground">Minutes</div>
                        </div>

                        {/* Seconds */}
                        <div className="space-y-1">
                            <motion.div
                                className={cn("text-3xl font-bold", phaseConfig.textColor)}
                                animate={{
                                    scale: currentPhase === 'final' ? [1, 1.2, 1] : [1, 1.05, 1]
                                }}
                                transition={{ duration: 0.5, repeat: Infinity, delay: 1.5 }}
                            >
                                {formatNumber(timeLeft.seconds)}
                            </motion.div>
                            <div className="text-sm text-muted-foreground">Seconds</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Time Progress</span>
                            <span>{Math.round((timeLeft.total / (24 * 60 * 60 * 1000)) * 100)}% remaining</span>
                        </div>
                        <Progress
                            value={Math.max(0, (timeLeft.total / (24 * 60 * 60 * 1000)) * 100)}
                            className="h-2"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Bidding Pressure Indicator */}
            {pressureConfig && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <Card className={cn(
                        "transition-all duration-300",
                        pressureConfig.pulse && "animate-pulse"
                    )}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={pressureConfig.pulse ? { rotate: [0, 5, -5, 0] } : {}}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                >
                                    <pressureConfig.icon className="h-5 w-5 text-orange-500" />
                                </motion.div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Bidding Activity</p>
                                    <p className="text-xs text-muted-foreground">
                                        {pressureConfig.description}
                                    </p>
                                </div>
                                <Badge className={pressureConfig.color}>
                                    {biddingPressure.level.toUpperCase()}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Auto-Extension Alert */}
            <AnimatePresence>
                {showExtensionAlert && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <Alert className="border-blue-200 bg-blue-50">
                            <Bell className="h-4 w-4" />
                            <AlertDescription className="flex items-center justify-between">
                                <div>
                                    <strong>Auto-Extension Available:</strong> High bidding activity detected.
                                    Auction may be extended by {autoExtendMinutes} minutes.
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setShowExtensionAlert(false);
                                        onAutoExtend?.();
                                    }}
                                >
                                    Extend Now
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Last Extension Info */}
            {lastExtensionTime && (
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        Last extended: {new Date(lastExtensionTime).toLocaleTimeString()}
                    </p>
                </div>
            )}
        </div>
    );
}

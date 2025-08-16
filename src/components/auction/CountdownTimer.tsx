import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: string;
  onTimeUp?: () => void;
  onComplete?: () => void;
  className?: string;
  variant?: 'default' | 'circular' | 'compact';
  showIcon?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function CountdownTimer({ 
  endTime, 
  onTimeUp,
  onComplete, 
  className,
  variant = 'default',
  showIcon = true 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const targetTime = new Date(endTime).getTime();
      const difference = targetTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, total: difference });
        
        // Change color when less than 5 minutes remaining
        if (difference < 5 * 60 * 1000) {
          setIsActive(false);
        }
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        onTimeUp?.();
        onComplete?.();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime, onTimeUp, onComplete]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  if (variant === 'circular') {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              className="text-muted-foreground/20"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              strokeDasharray={283}
              strokeDashoffset={283 - (283 * (timeLeft.total / (24 * 60 * 60 * 1000)))}
              className={cn(
                "transition-colors duration-300",
                isActive ? "text-primary" : "text-destructive"
              )}
              strokeLinecap="round"
              initial={{ strokeDashoffset: 283 }}
              animate={{ 
                strokeDashoffset: 283 - (283 * (timeLeft.total / (24 * 60 * 60 * 1000))) 
              }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <motion.div 
              className="text-lg font-bold"
              animate={{ 
                color: isActive ? "rgb(var(--primary))" : "rgb(var(--destructive))" 
              }}
            >
              {timeLeft.days > 0 ? `${timeLeft.days}d` : `${formatNumber(timeLeft.hours)}:${formatNumber(timeLeft.minutes)}`}
            </motion.div>
            <div className="text-xs text-muted-foreground">
              {timeLeft.days > 0 ? `${formatNumber(timeLeft.hours)}:${formatNumber(timeLeft.minutes)}` : `${formatNumber(timeLeft.seconds)}s`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div 
        className={cn(
          "flex items-center space-x-1 text-sm font-medium",
          isActive ? "text-primary" : "text-destructive",
          className
        )}
        animate={{ 
          scale: !isActive && timeLeft.seconds % 2 === 0 ? 1.05 : 1 
        }}
        transition={{ duration: 0.2 }}
      >
        {showIcon && <Clock className="h-4 w-4" />}
        <span>
          {timeLeft.days > 0 
            ? `${timeLeft.days}d ${formatNumber(timeLeft.hours)}:${formatNumber(timeLeft.minutes)}`
            : `${formatNumber(timeLeft.hours)}:${formatNumber(timeLeft.minutes)}:${formatNumber(timeLeft.seconds)}`
          }
        </span>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div 
      className={cn(
        "bg-card border rounded-lg p-4",
        !isActive && "border-destructive/50 bg-destructive/5",
        className
      )}
      animate={{ 
        borderColor: !isActive && timeLeft.seconds % 2 === 0 
          ? "rgb(var(--destructive))" 
          : "rgb(var(--border))" 
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-center space-x-2 mb-2">
        <Timer className={cn(
          "h-5 w-5",
          isActive ? "text-primary" : "text-destructive"
        )} />
        <span className="font-semibold text-lg">
          {timeLeft.total > 0 ? 'Time Remaining' : 'Auction Ended'}
        </span>
      </div>
      
      {timeLeft.total > 0 ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Minutes', value: timeLeft.minutes },
            { label: 'Seconds', value: timeLeft.seconds },
          ].map((unit, index) => (
            <motion.div 
              key={unit.label}
              className="bg-muted rounded p-2"
              animate={{ 
                scale: unit.label === 'Seconds' && timeLeft.seconds % 2 === 0 ? 1.05 : 1,
                backgroundColor: !isActive && unit.label === 'Seconds' && timeLeft.seconds % 2 === 0 
                  ? "rgb(var(--destructive) / 0.1)" 
                  : "rgb(var(--muted))"
              }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="text-2xl font-bold"
                animate={{ 
                  color: !isActive ? "rgb(var(--destructive))" : "rgb(var(--foreground))"
                }}
              >
                {formatNumber(unit.value)}
              </motion.div>
              <div className="text-xs text-muted-foreground">
                {unit.label}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div 
          className="text-center text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          This auction has ended
        </motion.div>
      )}
    </motion.div>
  );
}

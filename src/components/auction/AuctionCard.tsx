import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Eye, Gavel, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Auction {
  id: string;
  title: string;
  description: string;
  starting_price: number;
  current_price: number;
  reserve_price?: number;
  start_time: string;
  end_time: string;
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'completed';
  category?: string;
  images?: string[];
  view_count: number;
  bid_count: number;
}

interface AuctionCardProps {
  auction: Auction;
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const targetTime = auction.status === 'scheduled' 
        ? new Date(auction.start_time).getTime()
        : new Date(auction.end_time).getTime();
      
      const difference = targetTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${minutes}m ${seconds}s`);
        }
      } else {
        setTimeLeft(auction.status === 'scheduled' ? 'Starting...' : 'Ended');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [auction.start_time, auction.end_time, auction.status]);

  const getStatusBadge = () => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft' },
      scheduled: { variant: 'outline' as const, label: 'Scheduled' },
      active: { variant: 'default' as const, label: 'Live' },
      ended: { variant: 'destructive' as const, label: 'Ended' },
      completed: { variant: 'secondary' as const, label: 'Completed' },
    };

    const config = statusConfig[auction.status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="group hover:shadow-elevation-2 transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
              {auction.title}
            </h3>
            {auction.category && (
              <Badge variant="outline" className="mt-2">
                {auction.category}
              </Badge>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {auction.images && auction.images.length > 0 && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img
              src={auction.images[0]}
              alt={auction.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <p className="text-sm text-muted-foreground line-clamp-2">
          {auction.description}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Starting Price:</span>
            <p className="font-semibold">${auction.starting_price.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Current Bid:</span>
            <p className="font-semibold text-primary">${auction.current_price.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{timeLeft}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{auction.view_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Gavel className="h-4 w-4" />
              <span>{auction.bid_count}</span>
            </div>
          </div>
        </div>

        <Button asChild className="w-full">
          <Link to={`/auction/${auction.id}`}>
            {auction.status === 'active' ? 'Place Bid' : 'View Details'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
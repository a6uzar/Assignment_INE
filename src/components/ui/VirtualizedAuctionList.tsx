import { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, User, Eye } from 'lucide-react';

interface VirtualizedAuction {
  id: string;
  title: string;
  current_price: number;
  time_remaining: string;
  bid_count: number;
  image_url: string;
  seller_name: string;
  watchers: number;
  is_featured: boolean;
}

interface VirtualizedAuctionListProps {
  auctions: VirtualizedAuction[];
  height: number;
  onAuctionClick: (auctionId: string) => void;
  onWatchToggle: (auctionId: string) => void;
}

interface AuctionRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    auctions: VirtualizedAuction[];
    onAuctionClick: (auctionId: string) => void;
    onWatchToggle: (auctionId: string) => void;
  };
}

const AuctionRow = memo(({ index, style, data }: AuctionRowProps) => {
  const { auctions, onAuctionClick, onWatchToggle } = data;
  const auction = auctions[index];

  const handleClick = useCallback(() => {
    onAuctionClick(auction.id);
  }, [auction.id, onAuctionClick]);

  const handleWatchToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onWatchToggle(auction.id);
  }, [auction.id, onWatchToggle]);

  const timeRemainingColor = useMemo(() => {
    const hours = parseInt(auction.time_remaining.split(' ')[0]);
    if (hours < 1) return 'text-red-600';
    if (hours < 6) return 'text-orange-600';
    return 'text-green-600';
  }, [auction.time_remaining]);

  return (
    <div style={style} className="px-2">
      <Card 
        className={`cursor-pointer hover:shadow-md transition-shadow ${auction.is_featured ? 'ring-2 ring-blue-200' : ''}`}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Image */}
            <div className="relative flex-shrink-0">
              <img
                src={auction.image_url}
                alt={auction.title}
                className="w-16 h-16 object-cover rounded-lg"
                loading="lazy"
              />
              {auction.is_featured && (
                <Badge className="absolute -top-2 -right-2 text-xs px-1">
                  Featured
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{auction.title}</h3>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <User className="h-3 w-3" />
                {auction.seller_name}
              </p>
            </div>

            {/* Price */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-lg font-bold">
                <DollarSign className="h-4 w-4" />
                {auction.current_price.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">{auction.bid_count} bids</p>
            </div>

            {/* Time */}
            <div className="text-right">
              <div className={`flex items-center gap-1 font-medium ${timeRemainingColor}`}>
                <Clock className="h-4 w-4" />
                {auction.time_remaining}
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {auction.watchers} watching
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button size="sm">
                Bid Now
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleWatchToggle}
              >
                Watch
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

AuctionRow.displayName = 'AuctionRow';

export const VirtualizedAuctionList = memo(({ 
  auctions, 
  height, 
  onAuctionClick, 
  onWatchToggle 
}: VirtualizedAuctionListProps) => {
  const itemData = useMemo(() => ({
    auctions,
    onAuctionClick,
    onWatchToggle,
  }), [auctions, onAuctionClick, onWatchToggle]);

  return (
    <List
      height={height}
      width="100%"
      itemCount={auctions.length}
      itemSize={120} // Height of each auction row
      itemData={itemData}
      overscanCount={5} // Render 5 extra items outside viewport
    >
      {AuctionRow}
    </List>
  );
});

VirtualizedAuctionList.displayName = 'VirtualizedAuctionList';

// Usage Example Component
export function OptimizedAuctionsList() {
  const auctions: VirtualizedAuction[] = [
    // Sample data - in production this would come from your API
    {
      id: '1',
      title: 'Vintage Rolex Submariner',
      current_price: 2500,
      time_remaining: '2 hours',
      bid_count: 15,
      image_url: '/placeholder.svg',
      seller_name: 'WatchCollector',
      watchers: 42,
      is_featured: true,
    },
    // ... more auctions
  ];

  const handleAuctionClick = useCallback((auctionId: string) => {
    console.log('Auction clicked:', auctionId);
    // Navigate to auction detail page
  }, []);

  const handleWatchToggle = useCallback((auctionId: string) => {
    console.log('Watch toggled:', auctionId);
    // Toggle watch status
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Active Auctions</h2>
        <p className="text-gray-600">{auctions.length} items</p>
      </div>
      
      <VirtualizedAuctionList
        auctions={auctions}
        height={600} // Viewport height
        onAuctionClick={handleAuctionClick}
        onWatchToggle={handleWatchToggle}
      />
    </div>
  );
}

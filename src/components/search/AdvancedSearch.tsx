import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Calendar,
  Filter,
  Search,
  X,
  SlidersHorizontal,
  Grid,
  List,
  Clock,
  DollarSign,
  Tag,
  MapPin,
  Star,
  TrendingUp,
  Heart,
  Eye,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AuctionCard } from '@/components/auction/AuctionCard';

interface SearchFilters {
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  condition: string;
  location: string;
  timeRemaining: string;
  sortBy: string;
  auctionType: string;
  seller: string;
  tags: string[];
}

interface Auction {
  id: string;
  title: string;
  description: string;
  current_bid: number;
  starting_bid: number;
  buy_now_price?: number;
  end_time: string;
  category: string;
  condition: string;
  location: string;
  image_url: string;
  seller_name: string;
  seller_rating: number;
  bid_count: number;
  watchers: number;
  tags: string[];
  is_featured: boolean;
  auction_type: 'standard' | 'buy_now' | 'reserve';
  status: 'active' | 'ended' | 'scheduled';
}

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Art', 'Collectibles',
  'Automotive', 'Jewelry', 'Toys', 'Music', 'Health & Beauty', 'Business & Industrial'
];

const CONDITIONS = ['New', 'Like New', 'Very Good', 'Good', 'Fair', 'Poor'];

const SORT_OPTIONS = [
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'newest', label: 'Newly Listed' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'most_bids', label: 'Most Bids' },
  { value: 'most_watched', label: 'Most Watched' },
  { value: 'featured', label: 'Featured First' },
];

const TIME_REMAINING_OPTIONS = [
  { value: 'all', label: 'All Auctions' },
  { value: '1h', label: 'Less than 1 hour' },
  { value: '6h', label: 'Less than 6 hours' },
  { value: '1d', label: 'Less than 1 day' },
  { value: '3d', label: 'Less than 3 days' },
  { value: '7d', label: 'Less than 7 days' },
];

export function AdvancedSearch() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    minPrice: 0,
    maxPrice: 10000,
    condition: '',
    location: '',
    timeRemaining: 'all',
    sortBy: 'ending_soon',
    auctionType: '',
    seller: '',
    tags: [],
  });

  const { user } = useAuth();

  // Load auctions
  useEffect(() => {
    loadAuctions();
  }, []);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      
      // In production, this would be a real database query
      const mockAuctions: Auction[] = [
        {
          id: '1',
          title: 'Vintage Rolex Submariner',
          description: 'Authentic 1970s Rolex Submariner in excellent condition',
          current_bid: 2500,
          starting_bid: 1000,
          buy_now_price: 4000,
          end_time: '2024-12-20T18:00:00Z',
          category: 'Jewelry',
          condition: 'Very Good',
          location: 'New York, NY',
          image_url: '/placeholder.svg',
          seller_name: 'WatchCollector',
          seller_rating: 4.8,
          bid_count: 15,
          watchers: 42,
          tags: ['vintage', 'luxury', 'rolex', 'watch'],
          is_featured: true,
          auction_type: 'standard',
          status: 'active',
        },
        {
          id: '2',
          title: 'MacBook Pro M2 16-inch',
          description: 'Brand new MacBook Pro with M2 chip, 16GB RAM, 512GB SSD',
          current_bid: 1800,
          starting_bid: 1500,
          buy_now_price: 2200,
          end_time: '2024-12-18T20:00:00Z',
          category: 'Electronics',
          condition: 'New',
          location: 'San Francisco, CA',
          image_url: '/placeholder.svg',
          seller_name: 'TechDeals',
          seller_rating: 4.9,
          bid_count: 23,
          watchers: 89,
          tags: ['apple', 'macbook', 'laptop', 'new'],
          is_featured: false,
          auction_type: 'buy_now',
          status: 'active',
        },
        // Add more mock auctions...
      ];

      setAuctions(mockAuctions);
    } catch (error) {
      console.error('Failed to load auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort auctions
  const filteredAuctions = useMemo(() => {
    const filtered = auctions.filter(auction => {
      // Text search
      if (filters.query && !auction.title.toLowerCase().includes(filters.query.toLowerCase()) &&
          !auction.description.toLowerCase().includes(filters.query.toLowerCase()) &&
          !auction.tags.some(tag => tag.toLowerCase().includes(filters.query.toLowerCase()))) {
        return false;
      }

      // Category filter
      if (filters.category && auction.category !== filters.category) {
        return false;
      }

      // Price range
      if (auction.current_bid < filters.minPrice || auction.current_bid > filters.maxPrice) {
        return false;
      }

      // Condition filter
      if (filters.condition && auction.condition !== filters.condition) {
        return false;
      }

      // Location filter
      if (filters.location && !auction.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      // Time remaining filter
      if (filters.timeRemaining !== 'all') {
        const now = new Date();
        const endTime = new Date(auction.end_time);
        const hoursRemaining = (endTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        switch (filters.timeRemaining) {
          case '1h':
            if (hoursRemaining >= 1) return false;
            break;
          case '6h':
            if (hoursRemaining >= 6) return false;
            break;
          case '1d':
            if (hoursRemaining >= 24) return false;
            break;
          case '3d':
            if (hoursRemaining >= 72) return false;
            break;
          case '7d':
            if (hoursRemaining >= 168) return false;
            break;
        }
      }

      // Auction type filter
      if (filters.auctionType && auction.auction_type !== filters.auctionType) {
        return false;
      }

      // Seller filter
      if (filters.seller && !auction.seller_name.toLowerCase().includes(filters.seller.toLowerCase())) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0 && !filters.tags.some(tag => auction.tags.includes(tag))) {
        return false;
      }

      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'ending_soon':
          return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
        case 'newest':
          return new Date(b.end_time).getTime() - new Date(a.end_time).getTime();
        case 'price_low':
          return a.current_bid - b.current_bid;
        case 'price_high':
          return b.current_bid - a.current_bid;
        case 'most_bids':
          return b.bid_count - a.bid_count;
        case 'most_watched':
          return b.watchers - a.watchers;
        case 'featured':
          return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [auctions, filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      minPrice: 0,
      maxPrice: 10000,
      condition: '',
      location: '',
      timeRemaining: 'all',
      sortBy: 'ending_soon',
      auctionType: '',
      seller: '',
      tags: [],
    });
  };

  const saveSearch = async () => {
    if (!user) return;

    const searchName = prompt('Enter a name for this search:');
    if (!searchName) return;

    const savedSearch = {
      id: Date.now().toString(),
      name: searchName,
      filters: { ...filters },
      created_at: new Date().toISOString(),
    };

    setSavedSearches(prev => [...prev, savedSearch]);
  };

  const loadSavedSearch = (search: any) => {
    setFilters(search.filters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category) count++;
    if (filters.minPrice > 0 || filters.maxPrice < 10000) count++;
    if (filters.condition) count++;
    if (filters.location) count++;
    if (filters.timeRemaining !== 'all') count++;
    if (filters.auctionType) count++;
    if (filters.seller) count++;
    if (filters.tags.length > 0) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search auctions, categories, or sellers..."
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>

          <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Advanced Filters</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={saveSearch}>
                      Save Search
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Category */}
                  <div>
                    <Label>Category</Label>
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <Label>Price Range</Label>
                    <div className="px-3 py-2">
                      <Slider
                        value={[filters.minPrice, filters.maxPrice]}
                        onValueChange={([min, max]) => {
                          handleFilterChange('minPrice', min);
                          handleFilterChange('maxPrice', max);
                        }}
                        max={10000}
                        step={50}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <span>${filters.minPrice}</span>
                        <span>${filters.maxPrice}</span>
                      </div>
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <Label>Condition</Label>
                    <Select value={filters.condition} onValueChange={(value) => handleFilterChange('condition', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any Condition</SelectItem>
                        {CONDITIONS.map(condition => (
                          <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Remaining */}
                  <div>
                    <Label>Time Remaining</Label>
                    <Select value={filters.timeRemaining} onValueChange={(value) => handleFilterChange('timeRemaining', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_REMAINING_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div>
                    <Label>Location</Label>
                    <Input
                      placeholder="Enter city or region"
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                    />
                  </div>

                  {/* Auction Type */}
                  <div>
                    <Label>Auction Type</Label>
                    <Select value={filters.auctionType} onValueChange={(value) => handleFilterChange('auctionType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="standard">Standard Auction</SelectItem>
                        <SelectItem value="buy_now">Buy It Now</SelectItem>
                        <SelectItem value="reserve">Reserve Auction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Seller */}
                  <div>
                    <Label>Seller</Label>
                    <Input
                      placeholder="Enter seller name"
                      value={filters.seller}
                      onChange={(e) => handleFilterChange('seller', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map(search => (
                <Button
                  key={search.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSavedSearch(search)}
                  className="flex items-center gap-2"
                >
                  <Star className="h-3 w-3" />
                  {search.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {filteredAuctions.length} auction{filteredAuctions.length !== 1 ? 's' : ''} found
          </h2>
          {getActiveFiltersCount() > 0 && (
            <p className="text-sm text-gray-600">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
            </p>
          )}
        </div>
      </div>

      {/* Results Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-2"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredAuctions.map(auction => (
            <motion.div
              key={auction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AuctionCard
                auction={{
                  ...auction,
                  starting_price: auction.starting_bid,
                  current_price: auction.current_bid,
                  start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                  view_count: auction.watchers,
                }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {filteredAuctions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No auctions found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search criteria or removing some filters.
          </p>
          <Button onClick={clearFilters} variant="outline">
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}

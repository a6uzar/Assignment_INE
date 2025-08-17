import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuctionCard } from '@/components/auction/AuctionCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function Auctions() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuctions();
  }, []);

  useEffect(() => {
    filterAuctions();
  }, [auctions, searchTerm, statusFilter, categoryFilter]);

  const fetchAuctions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('auctions')
        .select('*')
        .in('status', ['draft', 'active', 'ended', 'scheduled'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAuctions(data || []);

      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map((auction: any) => auction.category).filter(Boolean) || [])] as string[];
      setCategories(uniqueCategories);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load auctions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAuctions = () => {
    let filtered = auctions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(auction =>
        auction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auction.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(auction => auction.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(auction => auction.category === categoryFilter);
    }

    setFilteredAuctions(filtered);
  };

  const getStatusCounts = () => {
    return {
      all: auctions.length,
      draft: auctions.filter(a => a.status === 'draft').length,
      active: auctions.filter(a => a.status === 'active').length,
      scheduled: auctions.filter(a => a.status === 'scheduled').length,
      ended: auctions.filter(a => a.status === 'ended').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Auctions</h1>
        <p className="text-muted-foreground">Discover and bid on amazing items</p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search auctions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
              <SelectItem value="draft">Draft ({statusCounts.draft})</SelectItem>
              <SelectItem value="active">Live ({statusCounts.active})</SelectItem>
              <SelectItem value="scheduled">Scheduled ({statusCounts.scheduled})</SelectItem>
              <SelectItem value="ended">Ended ({statusCounts.ended})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            All ({statusCounts.all})
          </Badge>
          <Badge
            variant={statusFilter === 'draft' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('draft')}
          >
            Draft ({statusCounts.draft})
          </Badge>
          <Badge
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('active')}
          >
            Live ({statusCounts.active})
          </Badge>
          <Badge
            variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('scheduled')}
          >
            Scheduled ({statusCounts.scheduled})
          </Badge>
          <Badge
            variant={statusFilter === 'ended' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('ended')}
          >
            Ended ({statusCounts.ended})
          </Badge>
        </div>
      </div>

      {/* Results */}
      {filteredAuctions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No auctions found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
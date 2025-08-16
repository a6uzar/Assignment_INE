import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AuctionCard } from '@/components/auction/AuctionCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Gavel, Plus, Eye, Clock, DollarSign } from 'lucide-react';
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
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'completed' | 'cancelled';
  images?: string[];
  view_count: number;
  bid_count: number;
  featured?: boolean;
}

const MyAuctions = () => {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    draft: 0,
  });

  useEffect(() => {
    if (user) {
      fetchMyAuctions();
    }
  }, [user]);

  const fetchMyAuctions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching auctions:', error);
        return;
      }

      const auctionData = data || [];
      setAuctions(auctionData);

      // Calculate stats
      setStats({
        total: auctionData.length,
        active: auctionData.filter(a => a.status === 'active').length,
        completed: auctionData.filter(a => ['ended', 'completed'].includes(a.status)).length,
        draft: auctionData.filter(a => a.status === 'draft').length,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAuctions = (status?: string) => {
    if (!status) return auctions;
    return auctions.filter(auction => auction.status === status);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Please Sign In</h3>
            <p className="text-muted-foreground mb-4">You need to be logged in to view your auctions.</p>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Auctions</h1>
          <p className="text-muted-foreground">Manage your auction listings</p>
        </div>
        <Button asChild>
          <Link to="/create-auction">
            <Plus className="h-4 w-4 mr-2" />
            Create Auction
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <Gavel className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Auctions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Eye className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.draft}</div>
            <div className="text-sm text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
      </div>

      {auctions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Auctions Yet</h3>
            <p className="text-muted-foreground mb-4">Start by creating your first auction listing.</p>
            <Button asChild>
              <Link to="/create-auction">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Auction
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
            <TabsTrigger value="ended">Ended ({stats.completed})</TabsTrigger>
            <TabsTrigger value="draft">Drafts ({stats.draft})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.map((auction) => (
                <div key={auction.id} className="relative">
                  <AuctionCard auction={auction} />
                  <Badge 
                    variant={auction.status === 'active' ? 'default' : 'secondary'}
                    className="absolute top-2 right-2"
                  >
                    {auction.status}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterAuctions('active').map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ended" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterAuctions('ended').concat(filterAuctions('completed')).map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="draft" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterAuctions('draft').map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterAuctions('scheduled').map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MyAuctions;

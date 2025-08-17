import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AuctionCard } from '@/components/auction/AuctionCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel, TrendingUp, Users, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createSimpleAuctions } from '@/utils/simpleSampleData';
import { fixUserProfiles, getUserStatus } from '@/utils/userProfileFix';

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
  category?: string;
  images?: string[];
  view_count: number;
  bid_count: number;
}

const Index = () => {
  const { user } = useAuth();
  const [featuredAuctions, setFeaturedAuctions] = useState<Auction[]>([]);
  const [stats, setStats] = useState({
    totalAuctions: 0,
    activeAuctions: 0,
    totalUsers: 0,
    totalBids: 0,
  });
  const [userStatus, setUserStatus] = useState<any>(null);

  const checkUserStatus = async () => {
    if (user) {
      const status = await getUserStatus();
      setUserStatus(status);
      console.log('User status:', status);
    }
  };

  const handleFixUserProfile = async () => {
    const result = await fixUserProfiles();
    console.log('Fix result:', result);
    if (result.success) {
      await checkUserStatus();
      alert('User profile fixed successfully!');
    } else {
      alert(`Failed to fix user profile: ${result.message}`);
    }
  };

  useEffect(() => {
    initializeData();
    if (user) {
      checkUserStatus();
    }
  }, [user]);

  const initializeData = async () => {
    // Only create sample data if user is logged in
    if (user) {
      await createSimpleAuctions();
    }

    // Always fetch the data
    await fetchFeaturedAuctions();
    await fetchStats();
  };

  const fetchFeaturedAuctions = async () => {
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .in('status', ['active', 'scheduled'])
      .eq('featured', true)
      .order('bid_count', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Error fetching auctions:', error);
      return;
    }

    setFeaturedAuctions(data || []);
  };

  const fetchStats = async () => {
    const [auctionsResult, usersResult, bidsResult] = await Promise.all([
      supabase.from('auctions').select('id, status', { count: 'exact' }),
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('bids').select('id', { count: 'exact' }),
    ]);

    const activeAuctions = auctionsResult.data?.filter((a: any) => a.status === 'active').length || 0;

    setStats({
      totalAuctions: auctionsResult.count || 0,
      activeAuctions,
      totalUsers: usersResult.count || 0,
      totalBids: bidsResult.count || 0,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        {/* Development User Status Check */}
        {user && userStatus && (
          <div className="mb-8">
            <Card className={`border-2 ${userStatus.hasProfile ? 'border-green-500' : 'border-red-500'}`}>
              <CardHeader>
                <CardTitle className="text-lg">
                  User Status {userStatus.hasProfile ? '✅' : '❌'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>Authenticated: {userStatus.authenticated ? '✅' : '❌'}</div>
                  <div>Has Profile: {userStatus.hasProfile ? '✅' : '❌'}</div>
                  <div>User ID: {userStatus.authUser?.id}</div>
                  <div>Email: {userStatus.authUser?.email}</div>
                  {userStatus.error && (
                    <div className="text-red-600">Error: {userStatus.error}</div>
                  )}
                  {!userStatus.hasProfile && (
                    <Button onClick={handleFixUserProfile} className="mt-2">
                      Fix User Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hero Section */}
        <section className="bg-gradient-hero py-20">
          <div className="container text-center">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              Welcome to Live Bid Dash
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover amazing items, place bids, and experience the thrill of online auctions.
              Join our community of buyers and sellers today.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/auth">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/auctions">Browse Auctions</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-card">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats.totalAuctions}</div>
                <div className="text-sm text-muted-foreground">Total Auctions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats.activeAuctions}</div>
                <div className="text-sm text-muted-foreground">Live Auctions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats.totalUsers}</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats.totalBids}</div>
                <div className="text-sm text-muted-foreground">Total Bids</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Platform?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Gavel className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Real-Time Bidding</CardTitle>
                  <CardDescription>
                    Experience live bidding with real-time updates and instant notifications
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Trusted Community</CardTitle>
                  <CardDescription>
                    Join a verified community of buyers and sellers with secure transactions
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Clock className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>24/7 Access</CardTitle>
                  <CardDescription>
                    Bid anytime, anywhere with our responsive platform and mobile support
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Welcome Section */}
      <section className="mb-12">
        <div className="bg-gradient-hero rounded-lg p-8 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Ready to discover your next treasure or sell something amazing?
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link to="/create-auction">Create Auction</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auctions">Browse Auctions</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.activeAuctions}</div>
              <div className="text-sm text-muted-foreground">Live Auctions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Gavel className="h-8 w-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalBids}</div>
              <div className="text-sm text-muted-foreground">Total Bids</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-warning mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalAuctions}</div>
              <div className="text-sm text-muted-foreground">Total Auctions</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Auctions */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Hot Auctions</h2>
          <Button asChild variant="outline">
            <Link to="/auctions">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {featuredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
              <p className="text-muted-foreground mb-4">Be the first to create an auction!</p>
              <Button asChild>
                <Link to="/create-auction">Create Your First Auction</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
};

export default Index;

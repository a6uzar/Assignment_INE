// Data seeder for live auction platform
import { supabase } from '@/integrations/supabase/client';

const SAMPLE_DATA = {
  // Sample users
  users: [
    {
      id: 'user-1',
      email: 'alice@example.com',
      full_name: 'Alice Johnson',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop&crop=face',
      is_verified: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'user-2',
      email: 'bob@example.com',
      full_name: 'Bob Smith',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      is_verified: false,
      created_at: new Date().toISOString()
    }
  ],

  // Sample categories
  categories: [
    {
      id: 'cat-1',
      name: 'Electronics',
      icon: '📱',
      description: 'Gadgets and electronic devices'
    },
    {
      id: 'cat-2',
      name: 'Art & Collectibles',
      icon: '🎨',
      description: 'Fine art, collectibles, and rare items'
    }
  ],

  // Sample auctions - some active, some ended
  auctions: [
    {
      id: 'auction-active-1',
      title: 'Vintage iPhone 12 Pro Max - Mint Condition',
      description: 'A pristine vintage iPhone 12 Pro Max in original packaging. Never used!',
      starting_price: 500,
      current_price: 750,
      bid_increment: 25,
      start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Started 2 hours ago
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      status: 'active' as const,
      seller_id: 'user-1',
      category_id: 'cat-1',
      auto_extend_minutes: 5,
      bid_count: 3,
      view_count: 45,
      images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'],
      created_at: new Date().toISOString()
    },
    {
      id: 'auction-active-2',
      title: 'Original Oil Painting - Mountain Landscape',
      description: 'Beautiful hand-painted oil painting of mountain landscape by local artist.',
      starting_price: 200,
      current_price: 350,
      bid_increment: 50,
      start_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Started 1 hour ago
      end_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
      status: 'active' as const,
      seller_id: 'user-2',
      category_id: 'cat-2',
      auto_extend_minutes: 10,
      bid_count: 5,
      view_count: 67,
      images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400'],
      created_at: new Date().toISOString()
    },
    {
      id: 'auction-ended-1',
      title: 'Vintage Watch - Collector\'s Item',
      description: 'Rare vintage watch from the 1960s. Perfect for collectors.',
      starting_price: 100,
      current_price: 450,
      bid_increment: 25,
      start_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // Started 4 hours ago
      end_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      status: 'ended' as const,
      seller_id: 'user-1',
      category_id: 'cat-2',
      auto_extend_minutes: 5,
      bid_count: 8,
      view_count: 123,
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'],
      created_at: new Date().toISOString()
    }
  ],

  // Sample bids
  bids: [
    // Bids for active auction 1
    {
      id: 'bid-1',
      auction_id: 'auction-active-1',
      bidder_id: 'user-2',
      amount: 525,
      status: 'outbid' as const,
      is_auto_bid: false,
      bid_time: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
    },
    {
      id: 'bid-2',
      auction_id: 'auction-active-1',
      bidder_id: 'user-1',
      amount: 650,
      status: 'outbid' as const,
      is_auto_bid: false,
      bid_time: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min ago
    },
    {
      id: 'bid-3',
      auction_id: 'auction-active-1',
      bidder_id: 'user-2',
      amount: 750,
      status: 'active' as const,
      is_auto_bid: false,
      bid_time: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 min ago
    },

    // Bids for active auction 2
    {
      id: 'bid-4',
      auction_id: 'auction-active-2',
      bidder_id: 'user-1',
      amount: 250,
      status: 'outbid' as const,
      is_auto_bid: false,
      bid_time: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      id: 'bid-5',
      auction_id: 'auction-active-2',
      bidder_id: 'user-2',
      amount: 350,
      status: 'active' as const,
      is_auto_bid: false,
      bid_time: new Date(Date.now() - 20 * 60 * 1000).toISOString()
    }
  ],

  // Sample chat messages
  auction_chat: [
    {
      id: 'msg-1',
      auction_id: 'auction-active-1',
      user_id: 'user-1',
      message: 'This iPhone looks amazing! Is it unlocked?',
      message_type: 'text',
      is_pinned: false,
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-2',
      auction_id: 'auction-active-1',
      user_id: 'user-2',
      message: 'Yes, completely unlocked and never used!',
      message_type: 'text',
      is_pinned: false,
      created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-3',
      auction_id: 'auction-active-1',
      user_id: 'user-1',
      message: '🔥',
      message_type: 'emoji',
      is_pinned: false,
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
    }
  ]
};

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log('🧹 Clearing existing data...');
    await supabase.from('auction_chat').delete().neq('id', '');
    await supabase.from('bids').delete().neq('id', '');
    await supabase.from('auctions').delete().neq('id', '');
    await supabase.from('categories').delete().neq('id', '');
    // Note: Don't delete users as they might be auth-managed

    // Insert sample data
    console.log('📝 Inserting categories...');
    const { error: categoriesError } = await supabase
      .from('categories')
      .insert(SAMPLE_DATA.categories);
    if (categoriesError) console.warn('Categories insert warning:', categoriesError);

    console.log('🏠 Inserting auctions...');
    const { error: auctionsError } = await supabase
      .from('auctions')
      .insert(SAMPLE_DATA.auctions);
    if (auctionsError) console.warn('Auctions insert warning:', auctionsError);

    console.log('💰 Inserting bids...');
    const { error: bidsError } = await supabase
      .from('bids')
      .insert(SAMPLE_DATA.bids);
    if (bidsError) console.warn('Bids insert warning:', bidsError);

    console.log('💬 Inserting chat messages...');
    const { error: chatError } = await supabase
      .from('auction_chat')
      .insert(SAMPLE_DATA.auction_chat);
    if (chatError) console.warn('Chat insert warning:', chatError);

    console.log('✅ Database seeding completed successfully!');
    return { success: true };

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    return { success: false, error };
  }
}

export { SAMPLE_DATA };

import { supabase } from '@/integrations/supabase/client';

export const createSampleAuctions = async () => {
  try {
    // Check if sample data already exists
    const { data: existing } = await supabase
      .from('auctions')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Sample data already exists');
      return true;
    }

    // First, try to create a system user for the auctions
    const { data: authResult, error: authError } = await supabase.auth.signUp({
      email: 'system@livebiddash.com',
      password: 'systempassword123!',
      options: {
        data: {
          full_name: 'Live Bid Dash System'
        }
      }
    });

    let sellerId = authResult?.user?.id;

    // If system user creation fails, try to get current user
    if (!sellerId) {
      const { data: { user } } = await supabase.auth.getUser();
      sellerId = user?.id;
    }

    // If still no seller, we can't create auctions due to database constraints
    if (!sellerId) {
      console.log('No valid seller ID available. Please sign in to create sample auctions.');
      return false;
    }

    // Simplified sample auction data
    const sampleAuctions = [
      {
        title: "Vintage Rolex Submariner",
        description: "Rare 1960s Rolex Submariner in excellent condition. Original box and papers included.",
        starting_price: 5000,
        current_price: 7500,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active' as const,
        images: ['/placeholder.svg'],
        featured: true,
        shipping_cost: 25,
        bid_increment: 100,
        seller_id: sellerId
      },
      {
        title: "MacBook Pro M3 - 16 inch", 
        description: "Brand new MacBook Pro with M3 chip, 16GB RAM, 512GB SSD. Still sealed in original packaging.",
        starting_price: 1500,
        current_price: 1850,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active' as const,
        images: ['/placeholder.svg'],
        featured: true,
        shipping_cost: 15,
        bid_increment: 50,
        seller_id: sellerId
      },
      {
        title: "Original Banksy Print",
        description: "Authenticated Banksy screen print 'Girl with Balloon' from 2004. Certificate of authenticity included.",
        starting_price: 3000,
        current_price: 4200,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active' as const,
        images: ['/placeholder.svg'],
        featured: true,
        shipping_cost: 50,
        bid_increment: 200,
        seller_id: sellerId
      }
    ];

    // Insert sample auctions
    const { data, error } = await supabase
      .from('auctions')
      .insert(sampleAuctions)
      .select();

    if (error) {
      console.error('Error creating sample auctions:', error);
      return false;
    }

    console.log('Sample auctions created successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in createSampleAuctions:', error);
    return false;
  }
};

export const createSampleBids = async () => {
  try {
    // Get sample auctions
    const { data: auctions } = await supabase
      .from('auctions')
      .select('id, current_price')
      .eq('status', 'active')
      .limit(3);

    if (!auctions || auctions.length === 0) {
      console.log('No auctions found for sample bids');
      return;
    }

    // Create sample bids for each auction
    const sampleBids = [];
    
    for (const auction of auctions) {
      const baseBid = auction.current_price - 500; // Start below current price
      for (let i = 0; i < 5; i++) {
        sampleBids.push({
          auction_id: auction.id,
          bidder_id: null, // Will be null for anonymous bids
          amount: baseBid + (i * 100),
          created_at: new Date(Date.now() - (5 - i) * 60 * 60 * 1000).toISOString(), // Spread over 5 hours
          is_auto_bid: false
        });
      }
    }

    const { data, error } = await supabase
      .from('bids')
      .insert(sampleBids)
      .select();

    if (error) {
      console.error('Error creating sample bids:', error);
      return false;
    }

    console.log('Sample bids created successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in createSampleBids:', error);
    return false;
  }
};

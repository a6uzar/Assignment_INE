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

    // First, we need to get a valid seller_id by creating a sample user or using auth
    // For demo purposes, we'll create auctions without a specific seller
    const dummySellerId = '00000000-0000-0000-0000-000000000000'; // UUID placeholder

    // Sample auction data matching the database schema
    const sampleAuctions = [
      {
        title: "Vintage Rolex Submariner",
        description: "Rare 1960s Rolex Submariner in excellent condition. Original box and papers included. A collector's dream watch with authentic patina and mechanical movement.",
        starting_price: 5000,
        current_price: 7500,
        reserve_price: 8000,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        status: 'active' as const,
        images: ['/placeholder.svg'],
        view_count: 234,
        bid_count: 15,
        seller_id: dummySellerId,
        featured: true,
        shipping_cost: 25,
        bid_increment: 100,
        condition: 'Used - Excellent'
      },
      {
        title: "MacBook Pro M3 - 16 inch",
        description: "Brand new MacBook Pro with M3 chip, 16GB RAM, 512GB SSD. Still sealed in original packaging. Perfect for professionals and creators.",
        starting_price: 1500,
        current_price: 1850,
        reserve_price: 2000,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        status: 'active' as const,
        images: ['/placeholder.svg'],
        view_count: 189,
        bid_count: 12,
        seller_id: dummySellerId,
        featured: true,
        shipping_cost: 15,
        bid_increment: 50,
        condition: 'New'
      },
      {
        title: "Original Banksy Print",
        description: "Authenticated Banksy screen print 'Girl with Balloon' from 2004. Certificate of authenticity included. Rare opportunity for art collectors.",
        starting_price: 3000,
        current_price: 4200,
        reserve_price: 5000,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        status: 'active' as const,
        images: ['/placeholder.svg'],
        view_count: 156,
        bid_count: 8,
        seller_id: dummySellerId,
        featured: true,
        shipping_cost: 50,
        bid_increment: 200,
        condition: 'Used - Very Good'
      },
      {
        title: "1969 Ford Mustang Boss 429",
        description: "Legendary muscle car in pristine condition. Matching numbers, fully restored by certified mechanics. One of the most sought-after classic cars.",
        starting_price: 150000,
        current_price: 175000,
        reserve_price: 200000,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'active' as const,
        images: ['/placeholder.svg'],
        view_count: 423,
        bid_count: 22,
        seller_id: dummySellerId,
        featured: true,
        shipping_cost: 500,
        bid_increment: 5000,
        condition: 'Restored'
      },
      {
        title: "Pokemon Charizard First Edition",
        description: "PSA 10 graded Charizard from Base Set (1998). Perfect condition, no scratches or damage. Holy grail for Pokemon card collectors.",
        starting_price: 8000,
        current_price: 9500,
        reserve_price: 12000,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        status: 'active' as const,
        images: ['/placeholder.svg'],
        view_count: 312,
        bid_count: 28,
        seller_id: dummySellerId,
        featured: true,
        shipping_cost: 10,
        bid_increment: 250,
        condition: 'Mint'
      },
      {
        title: "Chanel Vintage Handbag",
        description: "Authentic Chanel 2.55 quilted handbag from 1980s. Black lambskin leather with gold hardware. Excellent condition with authenticity card.",
        starting_price: 2500,
        current_price: 3100,
        reserve_price: 3500,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
        status: 'active' as const,
        images: ['/placeholder.svg'],
        view_count: 198,
        bid_count: 18,
        seller_id: dummySellerId,
        featured: true,
        shipping_cost: 20,
        bid_increment: 100,
        condition: 'Used - Excellent'
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

import { supabase } from '@/integrations/supabase/client';

export const createSimpleAuctions = async () => {
  try {
    console.log('Creating simple sample auctions...');
    
    // First check if we already have auctions
    const { data: existingAuctions, error: fetchError } = await supabase
      .from('auctions')
      .select('id')
      .limit(1);
    
    if (fetchError) {
      console.error('Error checking existing auctions:', fetchError);
      return;
    }
    
    if (existingAuctions && existingAuctions.length > 0) {
      console.log('Sample auctions already exist');
      return;
    }
    
    // Get the current user to use as seller
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in - cannot create sample auctions');
      return;
    }
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    const sampleAuctions = [
      {
        title: 'Vintage Leather Watch',
        description: 'Beautiful vintage leather watch in excellent condition. Perfect for collectors.',
        starting_price: 50,
        current_price: 75,
        start_time: oneHourAgo.toISOString(),
        end_time: oneDayFromNow.toISOString(),
        status: 'active' as const,
        featured: true,
        seller_id: user.id,
        images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500'],
        view_count: 24,
        bid_count: 3,
        shipping_cost: 10,
        bid_increment: 5
      },
      {
        title: 'Gaming Laptop',
        description: 'High-performance gaming laptop with RTX graphics card.',
        starting_price: 800,
        current_price: 950,
        start_time: oneHourAgo.toISOString(),
        end_time: twoDaysFromNow.toISOString(),
        status: 'active' as const,
        featured: true,
        seller_id: user.id,
        images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500'],
        view_count: 45,
        bid_count: 7,
        shipping_cost: 25,
        bid_increment: 25
      },
      {
        title: 'Antique Vase',
        description: 'Rare antique vase from the 19th century.',
        starting_price: 100,
        current_price: 150,
        start_time: oneHourAgo.toISOString(),
        end_time: threeDaysFromNow.toISOString(),
        status: 'active' as const,
        featured: true,
        seller_id: user.id,
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500'],
        view_count: 18,
        bid_count: 5,
        shipping_cost: 15,
        bid_increment: 10
      }
    ];
    
    const { data, error } = await supabase
      .from('auctions')
      .insert(sampleAuctions)
      .select();
    
    if (error) {
      console.error('Error creating sample auctions:', error);
      return;
    }
    
    console.log('Successfully created sample auctions:', data);
    
  } catch (error) {
    console.error('Unexpected error creating sample auctions:', error);
  }
};

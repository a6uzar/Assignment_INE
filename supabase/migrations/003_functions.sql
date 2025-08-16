-- Database Functions for Business Logic

-- Function to automatically extend auction if bid placed in last minutes
CREATE OR REPLACE FUNCTION extend_auction_if_needed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if bid is placed within auto-extend window
  IF EXISTS (
    SELECT 1 FROM public.auctions 
    WHERE id = NEW.auction_id 
    AND status = 'active'
    AND end_time - NOW() <= INTERVAL '1 minute' * COALESCE(auto_extend_minutes, 5)
  ) THEN
    -- Extend auction by auto_extend_minutes
    UPDATE public.auctions 
    SET end_time = end_time + INTERVAL '1 minute' * COALESCE(auto_extend_minutes, 5),
        updated_at = NOW()
    WHERE id = NEW.auction_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update auction current price and bid count
CREATE OR REPLACE FUNCTION update_auction_on_bid()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auction current price and bid count
  UPDATE public.auctions 
  SET current_price = NEW.amount,
      bid_count = bid_count + 1,
      updated_at = NOW()
  WHERE id = NEW.auction_id;
  
  -- Mark previous bids as outbid
  UPDATE public.bids 
  SET status = 'outbid'
  WHERE auction_id = NEW.auction_id 
  AND id != NEW.id 
  AND status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update auction status based on time
CREATE OR REPLACE FUNCTION update_auction_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-start scheduled auctions
  IF OLD.status = 'scheduled' AND NOW() >= NEW.start_time THEN
    NEW.status = 'active';
  END IF;
  
  -- Auto-end active auctions
  IF OLD.status = 'active' AND NOW() >= NEW.end_time THEN
    NEW.status = 'ended';
    
    -- Set winner if there are bids
    UPDATE public.auctions 
    SET winner_id = (
      SELECT bidder_id 
      FROM public.bids 
      WHERE auction_id = NEW.id 
      ORDER BY amount DESC, bid_time ASC 
      LIMIT 1
    ),
    final_price = current_price
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_auction_id UUID DEFAULT NULL,
  p_bid_id UUID DEFAULT NULL,
  p_type notification_type,
  p_title VARCHAR(255),
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, auction_id, bid_id, type, title, message, data
  ) VALUES (
    p_user_id, p_auction_id, p_bid_id, p_type, p_title, p_message, p_data
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle bid notifications
CREATE OR REPLACE FUNCTION notify_on_bid()
RETURNS TRIGGER AS $$
DECLARE
  auction_record RECORD;
  seller_id UUID;
  previous_bidder_id UUID;
BEGIN
  -- Get auction details
  SELECT * INTO auction_record FROM public.auctions WHERE id = NEW.auction_id;
  seller_id := auction_record.seller_id;
  
  -- Get previous highest bidder
  SELECT bidder_id INTO previous_bidder_id 
  FROM public.bids 
  WHERE auction_id = NEW.auction_id 
  AND id != NEW.id 
  AND status = 'outbid'
  ORDER BY amount DESC, bid_time ASC 
  LIMIT 1;
  
  -- Notify seller of new bid
  PERFORM create_notification(
    seller_id,
    NEW.auction_id,
    NEW.id,
    'bid_placed',
    'New Bid on Your Auction',
    format('New bid of $%s placed on "%s"', NEW.amount, auction_record.title),
    json_build_object('bid_amount', NEW.amount, 'bidder_id', NEW.bidder_id)
  );
  
  -- Notify previous bidder they were outbid
  IF previous_bidder_id IS NOT NULL AND previous_bidder_id != NEW.bidder_id THEN
    PERFORM create_notification(
      previous_bidder_id,
      NEW.auction_id,
      NEW.id,
      'outbid',
      'You Have Been Outbid',
      format('Someone bid $%s on "%s". Place a higher bid to stay in the game!', NEW.amount, auction_record.title),
      json_build_object('new_bid_amount', NEW.amount, 'auction_title', auction_record.title)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment auction view count
CREATE OR REPLACE FUNCTION increment_auction_views()
RETURNS TRIGGER AS $$
BEGIN
  NEW.view_count = OLD.view_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate bid amount
CREATE OR REPLACE FUNCTION validate_bid_amount()
RETURNS TRIGGER AS $$
DECLARE
  auction_record RECORD;
  min_bid_amount DECIMAL(12,2);
BEGIN
  -- Get auction details
  SELECT * INTO auction_record FROM public.auctions WHERE id = NEW.auction_id;
  
  -- Check if auction is active
  IF auction_record.status != 'active' THEN
    RAISE EXCEPTION 'Cannot bid on auction with status: %', auction_record.status;
  END IF;
  
  -- Check if bidder is not the seller
  IF auction_record.seller_id = NEW.bidder_id THEN
    RAISE EXCEPTION 'Sellers cannot bid on their own auctions';
  END IF;
  
  -- Calculate minimum bid amount
  IF auction_record.current_price = 0 THEN
    min_bid_amount := auction_record.starting_price;
  ELSE
    min_bid_amount := auction_record.current_price + auction_record.bid_increment;
  END IF;
  
  -- Validate bid amount
  IF NEW.amount < min_bid_amount THEN
    RAISE EXCEPTION 'Bid amount must be at least $%', min_bid_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

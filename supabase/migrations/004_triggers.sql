-- Database Triggers

-- Trigger to update auction on new bid
CREATE TRIGGER trigger_update_auction_on_bid
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_on_bid();

-- Trigger to extend auction if needed
CREATE TRIGGER trigger_extend_auction_if_needed
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION extend_auction_if_needed();

-- Trigger to create notifications on bid
CREATE TRIGGER trigger_notify_on_bid
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_bid();

-- Trigger to validate bid amount
CREATE TRIGGER trigger_validate_bid_amount
  BEFORE INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION validate_bid_amount();

-- Trigger to update auction status based on time
CREATE TRIGGER trigger_update_auction_status
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_status();

-- Trigger to update updated_at timestamp on auctions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

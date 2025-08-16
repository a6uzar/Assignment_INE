-- Row Level Security Policies

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Categories policies (public read, admin write)
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Auctions policies
CREATE POLICY "Public auctions are viewable by everyone" ON public.auctions
  FOR SELECT USING (status IN ('scheduled', 'active', 'ended', 'completed'));

CREATE POLICY "Sellers can view own auctions" ON public.auctions
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Sellers can create auctions" ON public.auctions
  FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own auctions" ON public.auctions
  FOR UPDATE USING (seller_id = auth.uid());

-- Bids policies
CREATE POLICY "Bidders can view auction bids" ON public.bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.auctions 
      WHERE id = auction_id AND status IN ('active', 'ended', 'completed')
    )
  );

CREATE POLICY "Users can place bids" ON public.bids
  FOR INSERT WITH CHECK (
    bidder_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.auctions 
      WHERE id = auction_id AND status = 'active'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Counter offers policies
CREATE POLICY "Users can view relevant counter offers" ON public.counter_offers
  FOR SELECT USING (seller_id = auth.uid() OR bidder_id = auth.uid());

CREATE POLICY "Sellers can create counter offers" ON public.counter_offers
  FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Bidders can respond to counter offers" ON public.counter_offers
  FOR UPDATE USING (bidder_id = auth.uid());

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "System can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- Auction watchers policies
CREATE POLICY "Users can view own watched auctions" ON public.auction_watchers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can watch/unwatch auctions" ON public.auction_watchers
  FOR ALL USING (user_id = auth.uid());

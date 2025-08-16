-- Sample Data for Development and Testing

-- Insert sample categories
INSERT INTO public.categories (name, description, icon) VALUES
('Electronics', 'Computers, phones, gadgets and electronic devices', 'laptop'),
('Art & Collectibles', 'Paintings, sculptures, vintage items and collectibles', 'palette'),
('Jewelry & Watches', 'Fine jewelry, luxury watches and accessories', 'gem'),
('Vehicles', 'Cars, motorcycles, boats and other vehicles', 'car'),
('Real Estate', 'Property, land and real estate investments', 'home'),
('Sports & Recreation', 'Sports equipment, outdoor gear and recreation items', 'bike'),
('Fashion & Accessories', 'Clothing, shoes, bags and fashion accessories', 'shirt'),
('Home & Garden', 'Furniture, decor, appliances and garden items', 'sofa');

-- Insert sample users (these will be created via Supabase Auth in the app)
-- This is just for reference - actual users will be inserted via auth triggers

-- Sample auctions for demonstration
-- Note: These will be created through the application interface
-- This file serves as a template for the data structure

-- Update existing categories to use proper UUIDs
-- Run this in Supabase SQL Editor if you already ran the previous setup

-- First, delete existing categories
DELETE FROM public.categories;

-- Insert categories with proper UUIDs
INSERT INTO public.categories (id, name, description, icon) VALUES
('11111111-1111-1111-1111-111111111111', 'Electronics', 'Computers, phones, gadgets and electronic devices', '💻'),
('22222222-2222-2222-2222-222222222222', 'Art & Collectibles', 'Paintings, sculptures, vintage items and collectibles', '🎨'),
('33333333-3333-3333-3333-333333333333', 'Jewelry & Watches', 'Fine jewelry, luxury watches and accessories', '💎'),
('44444444-4444-4444-4444-444444444444', 'Vehicles', 'Cars, motorcycles, boats and other vehicles', '🚗'),
('55555555-5555-5555-5555-555555555555', 'Real Estate', 'Property, land and real estate investments', '🏠'),
('66666666-6666-6666-6666-666666666666', 'Sports & Recreation', 'Sports equipment, outdoor gear and recreation items', '🏀'),
('77777777-7777-7777-7777-777777777777', 'Fashion & Accessories', 'Clothing, shoes, bags and fashion accessories', '👕'),
('88888888-8888-8888-8888-888888888888', 'Home & Garden', 'Furniture, decor, appliances and garden items', '🏡');

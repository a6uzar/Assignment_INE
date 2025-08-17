-- Ensure categories exist in the database
-- This migration will insert default categories if they don't already exist

-- First, ensure the categories table exists with proper structure
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    icon VARCHAR(10),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories with known UUIDs
INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Electronics', '💻', 'Computers, phones, gadgets and electronic devices', true),
('22222222-2222-2222-2222-222222222222', 'Art & Collectibles', '🎨', 'Artwork, collectibles, antiques and memorabilia', true),
('33333333-3333-3333-3333-333333333333', 'Jewelry & Watches', '💎', 'Fine jewelry, watches, and precious accessories', true),
('44444444-4444-4444-4444-444444444444', 'Vehicles', '🚗', 'Cars, motorcycles, boats and other vehicles', true),
('55555555-5555-5555-5555-555555555555', 'Real Estate', '🏠', 'Properties, land and real estate opportunities', true),
('66666666-6666-6666-6666-666666666666', 'Sports & Recreation', '🏀', 'Sports equipment, outdoor gear and recreational items', true),
('77777777-7777-7777-7777-777777777777', 'Fashion & Accessories', '👕', 'Clothing, shoes, bags and fashion accessories', true),
('88888888-8888-8888-8888-888888888888', 'Home & Garden', '🏡', 'Furniture, appliances, garden tools and home decor', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Also handle conflicts by name in case someone manually added categories
INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Electronics', '💻', 'Computers, phones, gadgets and electronic devices', true),
('22222222-2222-2222-2222-222222222222', 'Art & Collectibles', '🎨', 'Artwork, collectibles, antiques and memorabilia', true),
('33333333-3333-3333-3333-333333333333', 'Jewelry & Watches', '💎', 'Fine jewelry, watches, and precious accessories', true),
('44444444-4444-4444-4444-444444444444', 'Vehicles', '🚗', 'Cars, motorcycles, boats and other vehicles', true),
('55555555-5555-5555-5555-555555555555', 'Real Estate', '🏠', 'Properties, land and real estate opportunities', true),
('66666666-6666-6666-6666-666666666666', 'Sports & Recreation', '🏀', 'Sports equipment, outdoor gear and recreational items', true),
('77777777-7777-7777-7777-777777777777', 'Fashion & Accessories', '👕', 'Clothing, shoes, bags and fashion accessories', true),
('88888888-8888-8888-8888-888888888888', 'Home & Garden', '🏡', 'Furniture, appliances, garden tools and home decor', true)
ON CONFLICT (name) DO UPDATE SET
    id = EXCLUDED.id,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Update category icons to ensure proper display
-- This migration updates categories with proper emoji icons

-- Update existing categories with proper emoji icons
UPDATE public.categories 
SET icon = '💻'
WHERE name ILIKE '%electronic%' OR name ILIKE '%computer%' OR name ILIKE '%tech%';

UPDATE public.categories 
SET icon = '🎨'
WHERE name ILIKE '%art%' OR name ILIKE '%collectible%' OR name ILIKE '%antique%';

UPDATE public.categories 
SET icon = '💎'
WHERE name ILIKE '%jewelry%' OR name ILIKE '%watch%' OR name ILIKE '%diamond%';

UPDATE public.categories 
SET icon = '🚗'
WHERE name ILIKE '%vehicle%' OR name ILIKE '%car%' OR name ILIKE '%auto%';

UPDATE public.categories 
SET icon = '🏠'
WHERE name ILIKE '%real estate%' OR name ILIKE '%property%' OR name ILIKE '%house%';

UPDATE public.categories 
SET icon = '🏀'
WHERE name ILIKE '%sport%' OR name ILIKE '%fitness%' OR name ILIKE '%recreation%';

UPDATE public.categories 
SET icon = '👕'
WHERE name ILIKE '%fashion%' OR name ILIKE '%clothing%' OR name ILIKE '%accessories%';

UPDATE public.categories 
SET icon = '🏡'
WHERE name ILIKE '%home%' OR name ILIKE '%garden%' OR name ILIKE '%furniture%';

-- Insert default categories if they don't exist
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
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

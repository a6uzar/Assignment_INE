-- SIMPLE GUARANTEED FIX - Just create the specific category needed
-- This focuses only on the Art & Collectibles category that's causing the error

-- Method 1: Delete any conflicting Art & Collectibles categories and insert the correct one
DELETE FROM public.categories WHERE name = 'Art & Collectibles';

INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('22222222-2222-2222-2222-222222222222', 'Art & Collectibles', '🎨', 'Artwork, collectibles, antiques and memorabilia', true);

-- Verify it worked
SELECT id, name, icon FROM public.categories WHERE id = '22222222-2222-2222-2222-222222222222';

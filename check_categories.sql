-- Check what categories currently exist in your database
-- Run this in your Supabase SQL editor to see all categories

SELECT id, name, icon, description, is_active, created_at 
FROM public.categories 
ORDER BY name;

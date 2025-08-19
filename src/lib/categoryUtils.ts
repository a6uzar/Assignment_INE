import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CATEGORIES = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Electronics',
        icon: '💻',
        description: 'Computers, phones, gadgets and electronic devices',
        is_active: true
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Art & Collectibles',
        icon: '🎨',
        description: 'Artwork, collectibles, antiques and memorabilia',
        is_active: true
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Jewelry & Watches',
        icon: '💎',
        description: 'Fine jewelry, watches, and precious accessories',
        is_active: true
    },
    {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Vehicles',
        icon: '🚗',
        description: 'Cars, motorcycles, boats and other vehicles',
        is_active: true
    },
    {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Real Estate',
        icon: '🏠',
        description: 'Properties, land and real estate opportunities',
        is_active: true
    },
    {
        id: '66666666-6666-6666-6666-666666666666',
        name: 'Sports & Recreation',
        icon: '🏀',
        description: 'Sports equipment, outdoor gear and recreational items',
        is_active: true
    },
    {
        id: '77777777-7777-7777-7777-777777777777',
        name: 'Fashion & Accessories',
        icon: '👕',
        description: 'Clothing, shoes, bags and fashion accessories',
        is_active: true
    },
    {
        id: '88888888-8888-8888-8888-888888888888',
        name: 'Home & Garden',
        icon: '🏡',
        description: 'Furniture, appliances, garden tools and home decor',
        is_active: true
    },
    {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'Books & Media',
        icon: '📚',
        description: 'Books, movies, music, magazines and digital media',
        is_active: true
    }
];

export async function ensureCategoriesExist() {
    try {
        // Check if categories already exist
        const { data: existingCategories, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .limit(1);

        if (checkError) {
            console.error('Error checking categories:', checkError);
            return false;
        }

        // If no categories exist, insert default ones
        if (!existingCategories || existingCategories.length === 0) {
            console.log('No categories found, inserting default categories...');

            const { error: insertError } = await supabase
                .from('categories')
                .upsert(DEFAULT_CATEGORIES, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });

            if (insertError) {
                console.error('Error inserting categories:', insertError);
                return false;
            }

            console.log('Default categories inserted successfully');
            return true;
        }

        console.log('Categories already exist');
        return true;
    } catch (error) {
        console.error('Error ensuring categories exist:', error);
        return false;
    }
}

export async function getCategoriesWithFallback() {
    try {
        // First ensure categories exist
        await ensureCategoriesExist();

        // Fetch categories from database
        const { data, error } = await supabase
            .from('categories')
            .select('id, name, icon, description')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
            return DEFAULT_CATEGORIES;
        }

        // Process the data to ensure emojis are properly displayed
        const processedCategories = (data && data.length > 0 ? data : DEFAULT_CATEGORIES).map(category => {
            // Check if icon is an emoji or needs to be replaced
            const iconNeedsReplacement = category.icon && (
                category.icon.length > 2 || // Likely text if longer than 2 chars
                !isEmoji(category.icon) // Not a proper emoji
            );

            if (iconNeedsReplacement) {
                // Map text-based icons to emojis
                const iconMap: { [key: string]: string } = {
                    'Electronics': '💻',
                    'Computer': '💻',
                    'Package': '📦',
                    'Art': '🎨',
                    'Collectibles': '🎨',
                    'Jewelry': '💎',
                    'Watches': '💎',
                    'Vehicle': '🚗',
                    'Car': '🚗',
                    'Property': '🏠',
                    'House': '🏠',
                    'Sports': '🏀',
                    'Recreation': '🏀',
                    'Fashion': '👕',
                    'Clothing': '👕',
                    'Home': '🏡',
                    'Garden': '🏡',
                    'Books': '📚',
                    'Media': '📚',
                    'BookOpen': '📚',
                    'Book': '📚',
                    'Other': '📦'
                };

                // Try to find an appropriate emoji
                const newIcon = iconMap[category.icon] ||
                    Object.entries(iconMap).find(([key]) =>
                        category.name.toLowerCase().includes(key.toLowerCase())
                    )?.[1] || '📦';

                return { ...category, icon: newIcon };
            }

            return category;
        });

        return processedCategories;
    } catch (error) {
        console.error('Error getting categories:', error);
        return DEFAULT_CATEGORIES;
    }
}

// Helper function to check if a string is an emoji
function isEmoji(str: string): boolean {
    const emojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u;
    return str.length <= 2 && emojiRegex.test(str);
}

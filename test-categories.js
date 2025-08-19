// Quick test to check categories
import { supabase } from './src/integrations/supabase/client.js';

async function testCategories() {
    console.log('Testing categories...');

    const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, description')
        .eq('is_active', true)
        .order('name');

    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }

    console.log('Categories found:', data.length);
    data.forEach(category => {
        console.log(`${category.icon} ${category.name} (${category.id})`);
    });
}

testCategories();

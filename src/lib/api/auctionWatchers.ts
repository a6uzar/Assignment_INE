import { supabase } from '@/integrations/supabase/client';

export const auctionWatchersAPI = {
    // Safe method to add a watcher (handles duplicates)
    async addWatcher(auctionId: string, userId: string) {
        try {
            const { data, error } = await supabase
                .from('auction_watchers')
                .upsert({
                    auction_id: auctionId,
                    user_id: userId
                }, {
                    onConflict: 'user_id,auction_id',
                    ignoreDuplicates: true
                });

            if (error) {
                // If it's a duplicate key error, treat it as success
                if (error.code === '23505') {
                    return { data: null, error: null };
                }
                throw error;
            }

            return { data, error: null };
        } catch (error) {
            console.error('Error adding auction watcher:', error);
            return { data: null, error };
        }
    },

    // Remove a watcher
    async removeWatcher(auctionId: string, userId: string) {
        try {
            const { data, error } = await supabase
                .from('auction_watchers')
                .delete()
                .eq('auction_id', auctionId)
                .eq('user_id', userId);

            return { data, error };
        } catch (error) {
            console.error('Error removing auction watcher:', error);
            return { data: null, error };
        }
    },

    // Check if user is watching auction
    async isWatching(auctionId: string, userId: string) {
        try {
            const { data, error } = await supabase
                .from('auction_watchers')
                .select('id')
                .eq('auction_id', auctionId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                throw error;
            }

            return { isWatching: !!data, error: null };
        } catch (error) {
            console.error('Error checking watch status:', error);
            return { isWatching: false, error };
        }
    },

    // Toggle watch status
    async toggleWatch(auctionId: string, userId: string) {
        try {
            const { isWatching } = await this.isWatching(auctionId, userId);

            if (isWatching) {
                return await this.removeWatcher(auctionId, userId);
            } else {
                return await this.addWatcher(auctionId, userId);
            }
        } catch (error) {
            console.error('Error toggling watch status:', error);
            return { data: null, error };
        }
    },

    // Get watchers count for an auction
    async getWatchersCount(auctionId: string) {
        try {
            const { count, error } = await supabase
                .from('auction_watchers')
                .select('*', { count: 'exact', head: true })
                .eq('auction_id', auctionId);

            return { count: count || 0, error };
        } catch (error) {
            console.error('Error getting watchers count:', error);
            return { count: 0, error };
        }
    }
};

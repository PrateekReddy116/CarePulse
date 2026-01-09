import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AppUser {
    id: string;
    email: string;
    phone?: string;
    name?: string;
    avatar_url?: string;
    created_at: string;
}

/**
 * Check if a phone number is registered in the app
 * Checks both users and volunteers tables
 */
export const checkUserRegistered = async (phone: string): Promise<AppUser | null> => {
    try {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured, cannot check user registration');
            return null;
        }

        // Normalize phone number (remove spaces, dashes, etc.)
        const normalizedPhone = phone.replace(/\D/g, '');

        // First, try to check users table (preferred)
        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, email, name, phone')
                .eq('phone', normalizedPhone)
                .maybeSingle();

            if (!userError && userData) {
                return {
                    id: userData.id,
                    email: userData.email || '',
                    phone: userData.phone || '',
                    name: userData.name || '',
                    avatar_url: undefined,
                    created_at: new Date().toISOString(),
                };
            }
        } catch (usersTableError) {
            // If users table doesn't exist or query fails, fall back to volunteers
            console.log('Users table check failed, falling back to volunteers table');
        }

        // Fallback: Check volunteers table
        const { data: volunteerData, error: volunteerError } = await supabase
            .from('volunteers')
            .select('user_id, name, phone')
            .eq('phone', normalizedPhone)
            .maybeSingle();

        if (!volunteerError && volunteerData) {
            // Found in volunteers table
            return {
                id: volunteerData.user_id,
                email: '', // Can't get email without users table or admin access
                phone: volunteerData.phone || '',
                name: volunteerData.name || '',
                avatar_url: undefined,
                created_at: new Date().toISOString(),
            };
        }

        return null;
    } catch (error) {
        console.error('Error checking user registration:', error);
        return null;
    }
};

/**
 * Search users by name, email, or phone
 * Uses volunteers table since users table doesn't exist yet
 */
export const searchUsers = async (query: string): Promise<AppUser[]> => {
    try {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured, cannot search users');
            return [];
        }

        if (!query || query.length < 2) {
            return [];
        }

        const searchTerm = `%${query.toLowerCase()}%`;

        // Search in volunteers table (which exists)
        const { data: volunteers, error } = await supabase
            .from('volunteers')
            .select('user_id, name, phone')
            .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
            .limit(20);

        if (error) {
            console.error('Error searching users:', error);
            return [];
        }

        if (!volunteers || volunteers.length === 0) {
            return [];
        }

        // Get user emails from auth (we'll use user_id to identify)
        // For now, return volunteers data with user_id as id
        // In production, you'd want to join with auth.users or create a users table
        const users: AppUser[] = volunteers.map(v => ({
            id: v.user_id,
            email: '', // Will be empty since we can't easily get from auth.users
            phone: v.phone || '',
            name: v.name || '',
            avatar_url: undefined,
            created_at: new Date().toISOString(),
        }));

        return users;
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
};

/**
 * Get user by ID
 * Checks volunteers table first
 */
export const getUserById = async (userId: string): Promise<AppUser | null> => {
    try {
        if (!isSupabaseConfigured()) {
            return null;
        }

        // Try volunteers table
        const { data: volunteerData } = await supabase
            .from('volunteers')
            .select('user_id, name, phone')
            .eq('user_id', userId)
            .single();

        if (volunteerData) {
            return {
                id: volunteerData.user_id,
                email: '', // Can't easily get from auth.users without admin access
                phone: volunteerData.phone || '',
                name: volunteerData.name || '',
                avatar_url: undefined,
                created_at: new Date().toISOString(),
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
};

/**
 * Get multiple users by IDs
 * Uses volunteers table
 */
export const getUsersByIds = async (userIds: string[]): Promise<AppUser[]> => {
    try {
        if (!isSupabaseConfigured() || userIds.length === 0) {
            return [];
        }

        const { data, error } = await supabase
            .from('volunteers')
            .select('user_id, name, phone')
            .in('user_id', userIds);

        if (error) {
            console.error('Error getting users:', error);
            return [];
        }

        return (data || []).map(v => ({
            id: v.user_id,
            email: '',
            phone: v.phone || '',
            name: v.name || '',
            avatar_url: undefined,
            created_at: new Date().toISOString(),
        }));
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
};


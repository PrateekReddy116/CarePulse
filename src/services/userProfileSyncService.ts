import { supabase } from '../lib/supabase';
import { UserProfile } from './profileService';

const normalizePhone = (phone: string | undefined): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits || null;
};

/**
 * Syncs the local UserProfile into the Supabase public.users table.
 * Ensures that when you update your profile (name/phone), the users table is also updated.
 */
export const syncUserTableWithProfile = async (profile: UserProfile): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const normalizedPhone = normalizePhone(profile.phone);

        const updates: any = {
            id: user.id,
            email: user.email,
            name: profile.name || null,
            updated_at: new Date().toISOString(),
        };

        if (normalizedPhone) {
            updates.phone = normalizedPhone;
        }

        const { error } = await supabase
            .from('users')
            .upsert(updates, { onConflict: 'id' });

        if (error) {
            console.error('Error syncing profile to users table:', error);
        }
    } catch (error) {
        console.error('Failed to sync user profile to Supabase users table:', error);
    }
};


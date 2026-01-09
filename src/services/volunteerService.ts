import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

// Re-using the structure, but adapted for DB
export interface Volunteer {
    id: string;
    user_id: string;
    name: string;
    phone: string;
    latitude: number;
    longitude: number;
    status: 'available' | 'busy' | 'offline';
    distance?: number; // Calculated by DB or helper
}

export interface AssignedVolunteers {
    primary: Volunteer | null;
    backups: Volunteer[];
}

/**
 * Updates the current user's volunteer status and location in Supabase.
 */
export const updateVolunteerStatus = async (
    status: 'available' | 'busy' | 'offline',
    location?: Location.LocationObject,
    name?: string
) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updateData: any = {
            user_id: user.id,
            status,
            last_updated: new Date().toISOString(),
        };

        if (location) {
            updateData.latitude = location.coords.latitude;
            updateData.longitude = location.coords.longitude;
        }

        if (name) {
            updateData.name = name;
        }

        const { error } = await supabase
            .from('volunteers')
            .upsert(updateData, { onConflict: 'user_id' });

        if (error) {
            console.error('Error updating volunteer status:', error);
        }
    } catch (err) {
        console.error('Failed to update volunteer status', err);
    }
};

/**
 * Finds nearby volunteers using the Supabase RPC function.
 */
export const assignVolunteers = async (userLocation: Location.LocationObject): Promise<AssignedVolunteers> => {
    try {
        const { latitude, longitude } = userLocation.coords;
        const radiusKm = 50; // Search within 50km

        const { data, error } = await supabase
            .rpc('get_nearby_volunteers', {
                lat: latitude,
                long: longitude,
                radius_km: radiusKm
            });

        if (error) {
            console.error('Error fetching volunteers:', error);
            return { primary: null, backups: [] };
        }

        const volunteers = (data as any[] || []).map(v => ({
            id: v.id,
            user_id: v.user_id,
            name: v.name,
            phone: v.phone,
            latitude: v.latitude,
            longitude: v.longitude,
            status: v.status,
            distance: v.dist_km
        }));

        if (volunteers.length === 0) {
            return { primary: null, backups: [] };
        }

        const primary = volunteers[0];
        const backups = volunteers.slice(1, 4);

        return { primary, backups };

    } catch (err) {
        console.error('Failed to assign volunteers', err);
        return { primary: null, backups: [] };
    }
};

import { supabase } from '../lib/supabase';

export interface SafetyReport {
    id: string;
    user_id: string;
    latitude: number;
    longitude: number;
    safety_level: 'safe' | 'caution' | 'danger';
    description?: string;
    category?: string;
    created_at: string;
}

/**
 * Submit a safety report for a location
 */
export const submitSafetyReport = async (
    latitude: number,
    longitude: number,
    safetyLevel: 'safe' | 'caution' | 'danger',
    description?: string,
    category?: string
): Promise<SafetyReport | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('User not authenticated');
            return null;
        }

        const { data, error } = await supabase
            .from('safety_reports')
            .insert({
                user_id: user.id,
                latitude,
                longitude,
                safety_level: safetyLevel,
                description,
                category,
            })
            .select()
            .single();

        if (error) {
            console.error('Error submitting safety report:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error in submitSafetyReport:', error);
        return null;
    }
};

/**
 * Get safety reports within a radius (in km)
 */
export const getSafetyReportsNearby = async (
    latitude: number,
    longitude: number,
    radiusKm: number = 5
): Promise<SafetyReport[]> => {
    try {
        // Calculate approximate lat/lng bounds
        const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111 km
        const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

        const { data, error} = await supabase
            .from('safety_reports')
            .select('*')
            .gte('latitude', latitude - latDelta)
            .lte('latitude', latitude + latDelta)
            .gte('longitude', longitude - lngDelta)
            .lte('longitude', longitude + lngDelta)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching safety reports:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getSafetyReportsNearby:', error);
        return [];
    }
};

/**
 * Get all safety reports (for heatmap visualization)
 */
export const getAllSafetyReports = async (): Promise<SafetyReport[]> => {
    try {
        const { data, error } = await supabase
            .from('safety_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000); // Limit to recent 1000 reports

        if (error) {
            console.error('Error fetching all safety reports:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getAllSafetyReports:', error);
        return [];
    }
};

/**
 * Delete a safety report
 */
export const deleteSafetyReport = async (reportId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('safety_reports')
            .delete()
            .eq('id', reportId);

        if (error) {
            console.error('Error deleting safety report:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteSafetyReport:', error);
        return false;
    }
};

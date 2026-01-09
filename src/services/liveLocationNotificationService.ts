import { supabase } from '../lib/supabase';
import { EmergencyContact } from './profileService';
import { checkUserRegistered } from './userSearchService';
import { sendLiveLocationNotificationToUser } from './commsService';

/**
 * Notify app users in the contact list that a live location session has started.
 * Does NOT send SMS; only creates in-app notifications for registered users.
 */
export const notifyLiveLocationToContacts = async (
    sessionId: string,
    volunteerName: string,
    contacts: EmergencyContact[],
): Promise<void> => {
    for (const contact of contacts || []) {
        try {
            const registeredUser = await checkUserRegistered(contact.phone);
            if (registeredUser) {
                await sendLiveLocationNotificationToUser(registeredUser.id, sessionId, volunteerName);
            }
        } catch (error) {
            console.error(`Failed to notify contact ${contact.phone} of live location:`, error);
        }
    }
};

/**
 * Get the most recent live location session that was shared *to* the current user.
 */
export const getLatestIncomingLiveLocation = async (): Promise<{ sessionId: string; volunteerName: string } | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('notifications')
            .select('title, body, created_at')
            .eq('user_id', user.id)
            .eq('type', 'live_location')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            if (error) {
                console.error('Error fetching live location notifications:', error);
            }
            return null;
        }

        let sessionId: string | null = null;
        let volunteerName: string = 'Contact';

        // Try to parse JSON payload from body
        try {
            const payload = JSON.parse(data.body || '{}');
            if (payload.sessionId) {
                sessionId = payload.sessionId;
            }
            if (payload.volunteerName) {
                volunteerName = payload.volunteerName;
            } else if (data.title) {
                volunteerName = data.title.replace(' is sharing live location', '');
            }
        } catch {
            // Fallback: treat body as raw sessionId
            if (data.body) {
                sessionId = data.body;
            }
            if (data.title) {
                volunteerName = data.title.replace(' is sharing live location', '');
            }
        }

        if (!sessionId) return null;

        return { sessionId, volunteerName };
    } catch (error) {
        console.error('Failed to get latest incoming live location:', error);
        return null;
    }
};


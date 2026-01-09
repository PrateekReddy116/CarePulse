import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { checkUserRegistered } from './userSearchService';
import { supabase } from '../lib/supabase';

export interface Contact {
    name: string;
    phone: string;
    userId?: string; // If registered in app
}

/**
 * Check if a contact is registered and send appropriate message
 * - If registered: Send in-app notification
 * - If not registered: Send SMS as fallback
 */
export const sendEmergencyMessage = async (
    contacts: Contact[],
    body: string,
    title: string = 'Emergency Alert'
): Promise<{ sentInApp: number; sentSMS: number }> => {
    let sentInApp = 0;
    let sentSMS = 0;
    const smsContacts: Contact[] = [];

    // Check each contact and send accordingly
    for (const contact of contacts) {
        try {
            // Check if user is registered
            const registeredUser = contact.userId
                ? { id: contact.userId, phone: contact.phone }
                : await checkUserRegistered(contact.phone);

            if (registeredUser) {
                // Send in-app notification
                await sendInAppNotification(registeredUser.id, title, body);
                sentInApp++;
            } else {
                // Add to SMS list for fallback
                smsContacts.push(contact);
            }
        } catch (error) {
            console.error(`Error processing contact ${contact.phone}:`, error);
            // Fallback to SMS on error
            smsContacts.push(contact);
        }
    }

    // Send SMS to non-registered contacts
    if (smsContacts.length > 0) {
        try {
            await sendEmergencySMS(smsContacts, body);
            sentSMS = smsContacts.length;
        } catch (error) {
            console.error('Error sending SMS fallback:', error);
        }
    }

    return { sentInApp, sentSMS };
};

/**
 * Send in-app notification to a registered user
 */
export const sendInAppNotification = async (
    userId: string,
    title: string,
    body: string
): Promise<void> => {
    try {
        // Store notification in Supabase for the user
        const { error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                title,
                body,
                type: 'emergency',
                read: false,
                created_at: new Date().toISOString(),
            }]);

        if (error) {
            console.error('Error saving notification:', error);
        }

        // Also send push notification if user has device token
        // This would require expo-notifications setup with device tokens
        // For now, we'll just store it in the database
    } catch (error) {
        console.error('Error sending in-app notification:', error);
        throw error;
    }
};

/**
 * Send live location notification to a registered app user.
 * Stores a notification row with type 'live_location' and JSON payload in body.
 */
export const sendLiveLocationNotificationToUser = async (
    userId: string,
    sessionId: string,
    volunteerName: string,
): Promise<void> => {
    const payload = {
        sessionId,
        volunteerName,
        type: 'live_location',
    };

    try {
        const { error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                title: `${volunteerName} is sharing live location`,
                body: JSON.stringify(payload),
                type: 'live_location',
                read: false,
                created_at: new Date().toISOString(),
            }]);

        if (error) {
            console.error('Error saving live location notification:', error);
        }
    } catch (error) {
        console.error('Error sending live location notification:', error);
    }
};

/**
 * Sends an emergency SMS using the device's default SMS app.
 * @param contacts List of contacts to send the SMS to.
 * @param body The message body.
 */
export const sendEmergencySMS = async (contacts: Contact[], body: string): Promise<void> => {
    const phoneNumbers = contacts.map(c => c.phone).join(Platform.OS === 'ios' ? '&' : ',');
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${phoneNumbers}${separator}body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
        await Linking.openURL(url);
    } else {
        console.error('Cannot open SMS URL:', url);
        throw new Error('SMS not supported on this device');
    }
};

/**
 * Mocks sending a notification to volunteers via a backend API.
 * @param summary Incident summary.
 * @param location Incident location.
 */
export const notifyVolunteersOnline = async (summary: string, location: { latitude: number, longitude: number }) => {
    console.log('[Mock API] Notifying volunteers:', { summary, location });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
};

/**
 * Simulates local volunteer assignment notification for offline mode.
 * @param summary Incident summary.
 */
export const notifyVolunteersOfflineLocalAssignment = async (summary: string) => {
    console.log('[Offline] Simulating local volunteer assignment');

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Emergency Alert Sent (Offline)",
            body: "Local volunteers have been identified. SMS prepared.",
        },
        trigger: null, // Show immediately
    });
};

import { supabase } from '../lib/supabase';
import { EmergencyContact } from './profileService';

export interface SOSNotification {
    id: string;
    sender_id: string;
    sender_name: string;
    sender_phone?: string;
    latitude?: number;
    longitude?: number;
    message?: string;
    status: 'active' | 'resolved' | 'cancelled';
    created_at: string;
    is_read?: boolean;
}

/**
 * Create SOS notification and send to emergency contacts
 */
export const createSOSNotification = async (
    senderName: string,
    senderPhone: string,
    contacts: EmergencyContact[],
    location?: { latitude: number; longitude: number }
): Promise<string | null> => {
    try {
        console.log('Creating SOS notification for:', senderName, 'with', contacts.length, 'contacts');
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('User not authenticated');
            return null;
        }

        // Create SOS notification
        const { data: notification, error: notificationError } = await supabase
            .from('sos_notifications')
            .insert({
                sender_id: user.id,
                sender_name: senderName,
                sender_phone: senderPhone,
                latitude: location?.latitude,
                longitude: location?.longitude,
                message: `🚨 EMERGENCY! ${senderName} needs help!`,
                status: 'active',
            })
            .select()
            .single();

        if (notificationError || !notification) {
            console.error('Error creating SOS notification:', notificationError);
            return null;
        }

        console.log('SOS notification created:', notification.id);

        // Create recipient records for each contact
        const recipients = contacts.map((contact) => ({
            notification_id: notification.id,
            recipient_phone: contact.phone,
            is_read: false,
        }));

        console.log('Creating recipients:', recipients);

        const { error: recipientsError } = await supabase
            .from('sos_notification_recipients')
            .insert(recipients);

        if (recipientsError) {
            console.error('Error creating recipients:', recipientsError);
        } else {
            console.log('Recipients created successfully');
        }

        return notification.id;
    } catch (error) {
        console.error('Error in createSOSNotification:', error);
        return null;
    }
};

/**
 * Get unread SOS notifications for current user's phone number
 */
export const getUnreadSOSNotifications = async (userPhone: string): Promise<SOSNotification[]> => {
    try {
        console.log('Fetching notifications for phone:', userPhone);
        
        const { data, error } = await supabase
            .from('sos_notification_recipients')
            .select(`
                id,
                is_read,
                notification_id,
                sos_notifications (
                    id,
                    sender_id,
                    sender_name,
                    sender_phone,
                    latitude,
                    longitude,
                    message,
                    status,
                    created_at
                )
            `)
            .eq('recipient_phone', userPhone)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        console.log('Found notifications:', data?.length || 0);

        // Transform the data
        const notifications: SOSNotification[] = (data || [])
            .filter((item: any) => item.sos_notifications)
            .map((item: any) => ({
                ...item.sos_notifications,
                is_read: item.is_read,
            }));

        return notifications;
    } catch (error) {
        console.error('Error in getUnreadSOSNotifications:', error);
        return [];
    }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string, userPhone: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('sos_notification_recipients')
            .update({
                is_read: true,
                read_at: new Date().toISOString(),
            })
            .eq('notification_id', notificationId)
            .eq('recipient_phone', userPhone);

        if (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in markNotificationAsRead:', error);
        return false;
    }
};

/**
 * Update SOS status (resolve or cancel)
 */
export const updateSOSStatus = async (
    notificationId: string,
    status: 'resolved' | 'cancelled'
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('sos_notifications')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', notificationId);

        if (error) {
            console.error('Error updating SOS status:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in updateSOSStatus:', error);
        return false;
    }
};

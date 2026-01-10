import { Alert, Linking } from 'react-native';
import { EmergencyContact } from './profileService';

/**
 * Sends emergency alerts to all emergency contacts
 */
export const notifyEmergencyContacts = async (
    contacts: EmergencyContact[],
    userLocation?: { latitude: number; longitude: number },
    userName?: string
): Promise<void> => {
    if (contacts.length === 0) {
        console.log('No emergency contacts to notify');
        return;
    }

    const locationText = userLocation
        ? `Location: https://maps.google.com/?q=${userLocation.latitude},${userLocation.longitude}`
        : 'Location unavailable';

    const message = `🚨 EMERGENCY ALERT from ${userName || 'CarePulse User'}!\n\nI need immediate help!\n\n${locationText}\n\nThis is an automated emergency message from CarePulse.`;

    // Send SMS to each contact
    for (const contact of contacts) {
        try {
            await sendSMS(contact.phone, message);
            console.log(`Emergency SMS sent to ${contact.name} (${contact.phone})`);
        } catch (error) {
            console.error(`Failed to send SMS to ${contact.name}:`, error);
        }
    }
};

/**
 * Opens SMS app with pre-filled message
 */
const sendSMS = async (phoneNumber: string, message: string): Promise<void> => {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Different URL schemes for Android and iOS
    const separator = '?'; // Android uses '?', iOS uses '&'
    const url = `sms:${cleanNumber}${separator}body=${encodeURIComponent(message)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
        await Linking.openURL(url);
    } else {
        throw new Error('Cannot open SMS app');
    }
};

/**
 * Makes an emergency call to the primary contact
 */
export const callPrimaryContact = async (contacts: EmergencyContact[]): Promise<void> => {
    const primaryContact = contacts.find((c) => c.isPrimary);

    if (!primaryContact) {
        Alert.alert('No Primary Contact', 'Please set a primary emergency contact in your profile.');
        return;
    }

    const phoneNumber = primaryContact.phone.replace(/[^\d+]/g, '');
    const url = `tel:${phoneNumber}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
        await Linking.openURL(url);
    } else {
        Alert.alert('Error', 'Cannot make phone calls on this device.');
    }
};

/**
 * Sends emergency notification to all contacts (SMS)
 */
export const sendEmergencyAlerts = async (
    contacts: EmergencyContact[],
    userLocation?: { latitude: number; longitude: number },
    userName?: string
): Promise<void> => {
    if (contacts.length === 0) {
        Alert.alert(
            'No Emergency Contacts',
            'Please add emergency contacts in your profile to receive alerts.',
            [{ text: 'OK' }]
        );
        return;
    }

    Alert.alert(
        'Send Emergency Alerts',
        `Send emergency SMS to ${contacts.length} contact(s)?`,
        [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Send',
                onPress: () => notifyEmergencyContacts(contacts, userLocation, userName),
            },
        ]
    );
};

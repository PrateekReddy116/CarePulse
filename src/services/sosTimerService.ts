import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { loadProfile } from './profileService';
import { sendEmergencyMessage } from './commsService';
import * as Location from 'expo-location';

const SOS_TIMER_KEY = '@carepulse_sos_timers';

export interface SOSTimer {
    id: string;
    duration: number; // in seconds
    remainingTime: number; // in seconds
    startTime: string;
    endTime: string;
    isActive: boolean;
    isExpired: boolean;
    description?: string;
}

let activeTimer: NodeJS.Timeout | null = null;
let currentTimer: SOSTimer | null = null;

/**
 * Start a new SOS timer
 */
export const startSOSTimer = async (durationMinutes: number, description?: string): Promise<SOSTimer> => {
    try {
        // Stop any existing timer
        await stopSOSTimer();

        const durationSeconds = durationMinutes * 60;
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

        const timer: SOSTimer = {
            id: `timer_${Date.now()}`,
            duration: durationSeconds,
            remainingTime: durationSeconds,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            isActive: true,
            isExpired: false,
            description,
        };

        currentTimer = timer;
        await saveSOSTimer(timer);

        // Start countdown
        activeTimer = setInterval(async () => {
            if (currentTimer && currentTimer.isActive) {
                const now = new Date();
                const end = new Date(currentTimer.endTime);
                const remaining = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));

                currentTimer.remainingTime = remaining;

                if (remaining === 0) {
                    // Timer expired - trigger emergency
                    await handleTimerExpired();
                } else {
                    await saveSOSTimer(currentTimer);
                }
            }
        }, 1000);

        // Schedule notification for timer expiration
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'SOS Timer Started',
                body: `Timer set for ${durationMinutes} minutes. Check in before it expires.`,
            },
            trigger: null,
        });

        return timer;
    } catch (error) {
        console.error('Failed to start SOS timer:', error);
        throw error;
    }
};

/**
 * Check in - stop the timer and mark as safe
 */
export const checkInSOSTimer = async (): Promise<void> => {
    try {
        if (currentTimer && currentTimer.isActive) {
            currentTimer.isActive = false;
            await saveSOSTimer(currentTimer);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Check-In Successful',
                    body: 'You checked in safely. Timer stopped.',
                },
                trigger: null,
            });
        }

        if (activeTimer) {
            clearInterval(activeTimer);
            activeTimer = null;
        }

        currentTimer = null;
    } catch (error) {
        console.error('Failed to check in:', error);
        throw error;
    }
};

/**
 * Stop the timer manually
 */
export const stopSOSTimer = async (): Promise<void> => {
    try {
        if (activeTimer) {
            clearInterval(activeTimer);
            activeTimer = null;
        }

        if (currentTimer && currentTimer.isActive) {
            currentTimer.isActive = false;
            await saveSOSTimer(currentTimer);
        }

        currentTimer = null;
    } catch (error) {
        console.error('Failed to stop SOS timer:', error);
        throw error;
    }
};

/**
 * Get active timer
 */
export const getActiveSOSTimer = async (): Promise<SOSTimer | null> => {
    try {
        if (currentTimer && currentTimer.isActive) {
            // Update remaining time
            const now = new Date();
            const end = new Date(currentTimer.endTime);
            currentTimer.remainingTime = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
            return currentTimer;
        }

        const timers = await getAllSOSTimers();
        const active = timers.find(t => t.isActive && !t.isExpired);
        if (active) {
            currentTimer = active;
            return active;
        }

        return null;
    } catch (error) {
        console.error('Failed to get active SOS timer:', error);
        return null;
    }
};

/**
 * Get all SOS timers
 */
export const getAllSOSTimers = async (): Promise<SOSTimer[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(SOS_TIMER_KEY);
        if (jsonValue) {
            return JSON.parse(jsonValue);
        }
        return [];
    } catch (error) {
        console.error('Failed to load SOS timers:', error);
        return [];
    }
};

/**
 * Save SOS timer
 */
const saveSOSTimer = async (timer: SOSTimer): Promise<void> => {
    try {
        const timers = await getAllSOSTimers();
        const index = timers.findIndex(t => t.id === timer.id);
        
        if (index >= 0) {
            timers[index] = timer;
        } else {
            timers.push(timer);
        }

        await AsyncStorage.setItem(SOS_TIMER_KEY, JSON.stringify(timers));
    } catch (error) {
        console.error('Failed to save SOS timer:', error);
    }
};

/**
 * Handle timer expiration - trigger emergency
 */
const handleTimerExpired = async (): Promise<void> => {
    try {
        if (!currentTimer) return;

        currentTimer.isActive = false;
        currentTimer.isExpired = true;
        await saveSOSTimer(currentTimer);

        if (activeTimer) {
            clearInterval(activeTimer);
            activeTimer = null;
        }

        // Get user location
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        // Get emergency contacts
        const profile = await loadProfile();
        const contacts = profile.contacts.filter(c => c.isPrimary || true); // Include all contacts

        // Send emergency message (in-app or SMS fallback)
        const message = `🚨 EMERGENCY ALERT 🚨\n\n` +
            `${profile.name} did not check in before their SOS timer expired.\n\n` +
            `Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}\n` +
            `Time: ${new Date().toLocaleString()}\n\n` +
            `Please check on them immediately.`;

        if (contacts.length > 0) {
            await sendEmergencyMessage(
                contacts.map(c => ({ name: c.name, phone: c.phone })),
                message,
                'SOS Timer Expired'
            );
        }

        // Send notification
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🚨 SOS Timer Expired',
                body: 'Emergency alert has been sent to your contacts.',
                sound: true,
            },
            trigger: null,
        });

        currentTimer = null;
    } catch (error) {
        console.error('Failed to handle timer expiration:', error);
    }
};


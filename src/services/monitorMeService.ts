import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { loadProfile } from './profileService';
import { startLiveLocationSharing, stopLiveLocationSharing, getLiveLocationWS } from './liveLocationService';
import { supabase } from '../lib/supabase';
import { notifyLiveLocationToContacts } from './liveLocationNotificationService';

const MONITOR_ME_KEY = '@carepulse_monitor_me';
const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds (local storage)
// WebSocket updates every 2 seconds (handled by liveLocationService)

export interface MonitorMeSession {
    id: string;
    startTime: string;
    endTime?: string;
    isActive: boolean;
    sharedWith: string[]; // Contact IDs
    locationHistory: Array<{
        timestamp: string;
        latitude: number;
        longitude: number;
        accuracy?: number;
    }>;
}

let locationSubscription: Location.LocationSubscription | null = null;
let currentSession: MonitorMeSession | null = null;
let wsSessionId: string | null = null;

/**
 * Start monitoring session - share live location with selected contacts
 * Now uses WebSocket for real-time sharing
 */
export const startMonitorMe = async (contactIds: string[]): Promise<MonitorMeSession> => {
    try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Location permission is required for Monitor Me');
        }

        // Get current user ID for WebSocket session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const volunteerId = user.id;
        wsSessionId = `session_${volunteerId}_${Date.now()}`;

        // Load profile for notifications
        const profile = await loadProfile();

        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        const session: MonitorMeSession = {
            id: `monitor_${Date.now()}`,
            startTime: new Date().toISOString(),
            isActive: true,
            sharedWith: contactIds,
            locationHistory: [{
                timestamp: new Date().toISOString(),
                latitude: initialLocation.coords.latitude,
                longitude: initialLocation.coords.longitude,
                accuracy: initialLocation.coords.accuracy ?? undefined,
            }],
        };

        currentSession = session;

        // Start WebSocket live location sharing
        await startLiveLocationSharing(
            wsSessionId,
            volunteerId,
            async () => {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                return {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
            }
        );

        // Setup WebSocket event handlers
        const ws = getLiveLocationWS();
        ws.onSessionStarted(() => {
            console.log('📍 WebSocket live location session started');
        });

        ws.onError((error) => {
            console.error('❌ WebSocket error:', error);
        });

        // Also track location locally for history
        locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: LOCATION_UPDATE_INTERVAL,
                distanceInterval: 10,
            },
            (location) => {
                if (currentSession && currentSession.isActive) {
                    currentSession.locationHistory.push({
                        timestamp: new Date().toISOString(),
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy ?? undefined,
                    });

                    // Save session periodically
                    saveMonitorMeSession(currentSession);
                }
            }
        );

        // Save session
        await saveMonitorMeSession(session);

        // Notify app users in contacts (if they are registered) about live location session
        try {
            await notifyLiveLocationToContacts(wsSessionId, profile.name || 'Someone', profile.contacts || []);
        } catch (notifyError) {
            console.error('Failed to notify contacts of live location:', notifyError);
        }

        // Local device notification for the owner
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Monitor Me Started',
                body: 'Your location is now being shared in real-time with selected contacts.',
            },
            trigger: null,
        });

        // Notify contacts via Supabase notifications (if they're app users)
        // This will be handled by the backend/commsService

        return session;
    } catch (error) {
        console.error('Failed to start Monitor Me:', error);
        throw error;
    }
};

/**
 * Stop monitoring session
 */
export const stopMonitorMe = async (): Promise<void> => {
    try {
        // Stop WebSocket live location sharing
        stopLiveLocationSharing();
        wsSessionId = null;

        if (locationSubscription) {
            locationSubscription.remove();
            locationSubscription = null;
        }

        if (currentSession && currentSession.isActive) {
            currentSession.isActive = false;
            currentSession.endTime = new Date().toISOString();
            await saveMonitorMeSession(currentSession);
            currentSession = null;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Monitor Me Stopped',
                body: 'Location sharing has been stopped.',
            },
            trigger: null,
        });
    } catch (error) {
        console.error('Failed to stop Monitor Me:', error);
        throw error;
    }
};

/**
 * Get current WebSocket session ID (for viewers to subscribe)
 */
export const getCurrentSessionId = (): string | null => {
    return wsSessionId;
};

/**
 * Get current active session
 */
export const getActiveMonitorMeSession = async (): Promise<MonitorMeSession | null> => {
    try {
        if (currentSession && currentSession.isActive) {
            return currentSession;
        }

        const sessions = await getAllMonitorMeSessions();
        const active = sessions.find(s => s.isActive);
        if (active) {
            currentSession = active;
            return active;
        }

        return null;
    } catch (error) {
        console.error('Failed to get active Monitor Me session:', error);
        return null;
    }
};

/**
 * Get all Monitor Me sessions
 */
export const getAllMonitorMeSessions = async (): Promise<MonitorMeSession[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(MONITOR_ME_KEY);
        if (jsonValue) {
            return JSON.parse(jsonValue);
        }
        return [];
    } catch (error) {
        console.error('Failed to load Monitor Me sessions:', error);
        return [];
    }
};

/**
 * Save Monitor Me session
 */
const saveMonitorMeSession = async (session: MonitorMeSession): Promise<void> => {
    try {
        const sessions = await getAllMonitorMeSessions();
        const index = sessions.findIndex(s => s.id === session.id);
        
        if (index >= 0) {
            sessions[index] = session;
        } else {
            sessions.push(session);
        }

        await AsyncStorage.setItem(MONITOR_ME_KEY, JSON.stringify(sessions));
    } catch (error) {
        console.error('Failed to save Monitor Me session:', error);
    }
};

/**
 * Get contacts that are being shared with
 */
export const getSharedContacts = async (): Promise<Array<{ id: string; name: string; phone: string }>> => {
    try {
        const session = await getActiveMonitorMeSession();
        if (!session) return [];

        const profile = await loadProfile();
        return profile.contacts
            .filter(c => session.sharedWith.includes(c.id))
            .map(c => ({ id: c.id, name: c.name, phone: c.phone }));
    } catch (error) {
        console.error('Failed to get shared contacts:', error);
        return [];
    }
};


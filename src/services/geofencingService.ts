import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { loadProfile } from './profileService';
import { sendEmergencyMessage } from './commsService';

const GEOFENCING_KEY = '@carepulse_geofences';
const MONITORING_INTERVAL = 5000; // Check every 5 seconds

export interface Geofence {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // in meters
    isActive: boolean;
    notifyOnEnter: boolean;
    notifyOnExit: boolean;
    createdAt: string;
}

let locationSubscription: Location.LocationSubscription | null = null;
let geofences: Geofence[] = [];
let lastKnownLocation: Location.LocationObject | null = null;
let monitoringActive = false;

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Check if a location is inside a geofence
 */
const isInsideGeofence = (
    latitude: number,
    longitude: number,
    geofence: Geofence
): boolean => {
    const distance = calculateDistance(
        latitude,
        longitude,
        geofence.latitude,
        geofence.longitude
    );
    return distance <= geofence.radius;
};

/**
 * Start monitoring geofences
 */
export const startGeofenceMonitoring = async (): Promise<void> => {
    try {
        if (monitoringActive) return;

        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Location permission is required for Geofencing');
        }

        // Load geofences
        geofences = await getAllGeofences();
        const activeGeofences = geofences.filter(g => g.isActive);

        if (activeGeofences.length === 0) {
            return; // No active geofences to monitor
        }

        monitoringActive = true;

        // Get initial location
        lastKnownLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        // Track which geofences we're currently inside
        const insideGeofences = new Set<string>();

        // Start location monitoring
        locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: MONITORING_INTERVAL,
                distanceInterval: 10,
            },
            async (location) => {
                if (!monitoringActive) return;

                lastKnownLocation = location;
                const { latitude, longitude } = location.coords;

                // Check each active geofence
                for (const geofence of activeGeofences) {
                    const isInside = isInsideGeofence(latitude, longitude, geofence);
                    const wasInside = insideGeofences.has(geofence.id);

                    if (isInside && !wasInside) {
                        // Entered geofence
                        insideGeofences.add(geofence.id);
                        if (geofence.notifyOnEnter) {
                            await handleGeofenceEvent(geofence, 'enter');
                        }
                    } else if (!isInside && wasInside) {
                        // Exited geofence
                        insideGeofences.delete(geofence.id);
                        if (geofence.notifyOnExit) {
                            await handleGeofenceEvent(geofence, 'exit');
                        }
                    }
                }
            }
        );
    } catch (error) {
        console.error('Failed to start geofence monitoring:', error);
        throw error;
    }
};

/**
 * Stop monitoring geofences
 */
export const stopGeofenceMonitoring = async (): Promise<void> => {
    try {
        monitoringActive = false;

        if (locationSubscription) {
            locationSubscription.remove();
            locationSubscription = null;
        }
    } catch (error) {
        console.error('Failed to stop geofence monitoring:', error);
    }
};

/**
 * Create a new geofence
 */
export const createGeofence = async (geofence: Omit<Geofence, 'id' | 'createdAt'>): Promise<Geofence> => {
    try {
        const newGeofence: Geofence = {
            ...geofence,
            id: `geofence_${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        geofences = await getAllGeofences();
        geofences.push(newGeofence);
        await AsyncStorage.setItem(GEOFENCING_KEY, JSON.stringify(geofences));

        // Restart monitoring if it was active
        if (monitoringActive) {
            await stopGeofenceMonitoring();
            await startGeofenceMonitoring();
        }

        return newGeofence;
    } catch (error) {
        console.error('Failed to create geofence:', error);
        throw error;
    }
};

/**
 * Update a geofence
 */
export const updateGeofence = async (id: string, updates: Partial<Geofence>): Promise<void> => {
    try {
        geofences = await getAllGeofences();
        const index = geofences.findIndex(g => g.id === id);
        
        if (index >= 0) {
            geofences[index] = { ...geofences[index], ...updates };
            await AsyncStorage.setItem(GEOFENCING_KEY, JSON.stringify(geofences));

            // Restart monitoring if it was active
            if (monitoringActive) {
                await stopGeofenceMonitoring();
                await startGeofenceMonitoring();
            }
        }
    } catch (error) {
        console.error('Failed to update geofence:', error);
        throw error;
    }
};

/**
 * Delete a geofence
 */
export const deleteGeofence = async (id: string): Promise<void> => {
    try {
        geofences = await getAllGeofences();
        geofences = geofences.filter(g => g.id !== id);
        await AsyncStorage.setItem(GEOFENCING_KEY, JSON.stringify(geofences));

        // Restart monitoring if it was active
        if (monitoringActive) {
            await stopGeofenceMonitoring();
            await startGeofenceMonitoring();
        }
    } catch (error) {
        console.error('Failed to delete geofence:', error);
        throw error;
    }
};

/**
 * Get all geofences
 */
export const getAllGeofences = async (): Promise<Geofence[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(GEOFENCING_KEY);
        if (jsonValue) {
            return JSON.parse(jsonValue);
        }
        return [];
    } catch (error) {
        console.error('Failed to load geofences:', error);
        return [];
    }
};

/**
 * Handle geofence event (enter/exit)
 */
const handleGeofenceEvent = async (geofence: Geofence, event: 'enter' | 'exit'): Promise<void> => {
    try {
        const profile = await loadProfile();
        const contacts = profile.contacts.filter(c => c.isPrimary || true);

        const eventText = event === 'enter' ? 'entered' : 'left';
        const locationUrl = lastKnownLocation
            ? `https://maps.google.com/?q=${lastKnownLocation.coords.latitude},${lastKnownLocation.coords.longitude}`
            : 'Location unavailable';

        const message = `📍 Geofence Alert\n\n` +
            `${profile.name} has ${eventText} the "${geofence.name}" area.\n\n` +
            `Location: ${locationUrl}\n` +
            `Time: ${new Date().toLocaleString()}`;

        // Send notification
        await Notifications.scheduleNotificationAsync({
            content: {
                title: `Geofence: ${geofence.name}`,
                body: `You ${eventText} this area.`,
                sound: true,
            },
            trigger: null,
        });

        // Send message to contacts (in-app or SMS fallback)
        if (contacts.length > 0) {
            await sendEmergencyMessage(
                contacts.map(c => ({ name: c.name, phone: c.phone })),
                message,
                `Geofence: ${geofence.name}`
            );
        }
    } catch (error) {
        console.error('Failed to handle geofence event:', error);
    }
};


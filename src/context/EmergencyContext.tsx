import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { assignVolunteers, AssignedVolunteers, Volunteer } from '../services/volunteerService';
import { loadProfile, UserProfile, initialProfile } from '../services/profileService';
import { generateAIIncidentSummary, IncidentSummary } from '../services/aiService';
import { startEvidenceCapture, stopEvidenceCapture, saveEvidenceLocally, isEvidenceCaptureActive } from '../services/evidenceCaptureService';
import { sendEmergencyAlerts } from '../services/emergencyNotificationService';
import { createSOSNotification } from '../services/sosNotificationService';

interface EmergencyContextType {
    location: Location.LocationObject | null;
    isSOSActive: boolean;
    activeVolunteers: Volunteer[];
    assignedVolunteers: AssignedVolunteers | null;
    userProfile: UserProfile;
    incidentSummary: IncidentSummary | null;
    triggerSOS: () => Promise<void>;
    cancelSOS: () => void;
    confirmVolunteer: (volunteerId: string) => void;
    submitIncidentReport: (symptoms: string[], description: string) => Promise<void>;
    setIncidentSummary: (summary: IncidentSummary | null) => void;
    reloadProfile: () => Promise<void>;
    profileLoading: boolean;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isSOSActive, setIsSOSActive] = useState(false);
    const [activeVolunteers, setActiveVolunteers] = useState<Volunteer[]>([]);
    const [assignedVolunteers, setAssignedVolunteers] = useState<AssignedVolunteers | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
    const [incidentSummary, setIncidentSummary] = useState<IncidentSummary | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        const initializeLocation = async () => {
            try {
                // Load profile first
                const profile = await loadProfile();
                setUserProfile(profile);
                setProfileLoading(false);

                // Request location permissions
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permission to access location was denied');
                    return;
                }

                // Get current location
                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);

                // Subscribe to location updates
                subscription = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
                    (newLocation) => {
                        setLocation(newLocation);
                    }
                );
            } catch (error) {
                console.error('Error initializing location:', error);
                setProfileLoading(false);
            }
        };

        initializeLocation();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

    const triggerSOS = async () => {
        setIsSOSActive(true);

        // Load latest profile to ensure we have up-to-date info
        const profile = await loadProfile();
        setUserProfile(profile);

        // Send emergency alerts to contacts
        if (profile.contacts && profile.contacts.length > 0) {
            const locationCoords = location ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            } : undefined;
            
            // Send SMS alerts
            await sendEmergencyAlerts(profile.contacts, locationCoords, profile.name);
            
            // Create database notification
            await createSOSNotification(
                profile.name,
                profile.phone,
                profile.contacts,
                locationCoords
            );
        }

        // Start evidence capture if enabled
        if (profile.enableEvidenceCapture) {
            try {
                const incidentId = `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await startEvidenceCapture(incidentId);
                console.log('Evidence capture started for incident:', incidentId);
            } catch (error) {
                console.error('Failed to start evidence capture:', error);
                // Don't block SOS activation if evidence capture fails
            }
        }

        if (location) {
            // Updated to await the async backend call
            const assigned = await assignVolunteers(location);
            setAssignedVolunteers(assigned);

            // Combine primary and backups for the map view or list
            const allActive = [];
            if (assigned.primary) allActive.push(assigned.primary);
            allActive.push(...assigned.backups);
            setActiveVolunteers(allActive);
        }
    };

    const cancelSOS = async () => {
        setIsSOSActive(false);
        setActiveVolunteers([]);
        setAssignedVolunteers(null);
        setIncidentSummary(null);

        // Stop evidence capture if active
        if (isEvidenceCaptureActive()) {
            try {
                const evidence = await stopEvidenceCapture();
                if (evidence) {
                    await saveEvidenceLocally(evidence);
                    console.log('Evidence saved locally:', evidence.incidentId);
                }
            } catch (error) {
                console.error('Failed to stop evidence capture:', error);
            }
        }
    };

    const confirmVolunteer = (volunteerId: string) => {
        // In a real app, this would notify the server
        console.log(`Volunteer ${volunteerId} confirmed`);
    };

    const submitIncidentReport = async (symptoms: string[], description: string) => {
        const summary = await generateAIIncidentSummary(userProfile, symptoms, description);
        setIncidentSummary(summary);
    };

    const reloadProfile = async () => {
        const profile = await loadProfile();
        setUserProfile(profile);
    };

    return (
        <EmergencyContext.Provider
            value={{
                location,
                isSOSActive,
                activeVolunteers,
                assignedVolunteers,
                userProfile,
                incidentSummary,
                triggerSOS,
                cancelSOS,
                confirmVolunteer,
                submitIncidentReport,
                setIncidentSummary,
                reloadProfile,
                profileLoading,
            }}
        >
            {children}
        </EmergencyContext.Provider>
    );
};

export const useEmergency = () => {
    const context = useContext(EmergencyContext);
    if (context === undefined) {
        throw new Error('useEmergency must be used within an EmergencyProvider');
    }
    return context;
};

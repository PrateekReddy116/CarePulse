import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@carepulse_profile';

export interface EmergencyContact {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    isPrimary: boolean;
}

export interface UserProfile {
    name: string;
    age: string;
    bloodGroup: string;
    conditions: string;
    allergies: string;
    medications: string;
    notes: string;
    contacts: EmergencyContact[];
    enableEvidenceCapture?: boolean;
}

export const initialProfile: UserProfile = {
    name: '',
    age: '',
    bloodGroup: '',
    conditions: '',
    allergies: '',
    medications: '',
    notes: '',
    contacts: [],
    enableEvidenceCapture: false,
};

/**
 * Saves the user profile to AsyncStorage.
 * @param profile The user profile object to save.
 */
export const saveProfile = async (profile: UserProfile): Promise<void> => {
    try {
        const jsonValue = JSON.stringify(profile);
        await AsyncStorage.setItem(PROFILE_KEY, jsonValue);
    } catch (e) {
        console.error('Failed to save profile', e);
        throw e;
    }
};

/**
 * Loads the user profile from AsyncStorage.
 * @returns The user profile object, or the initial empty profile if not found.
 */
export const loadProfile = async (): Promise<UserProfile> => {
    try {
        const jsonValue = await AsyncStorage.getItem(PROFILE_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : initialProfile;
    } catch (e) {
        console.error('Failed to load profile', e);
        return initialProfile;
    }
};

/**
 * Clears the user profile from AsyncStorage (useful for testing/reset).
 */
export const clearProfile = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(PROFILE_KEY);
    } catch (e) {
        console.error('Failed to clear profile', e);
    }
};

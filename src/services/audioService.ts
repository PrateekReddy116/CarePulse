import { Audio } from 'expo-av';

let recording: Audio.Recording | null = null;
let sound: Audio.Sound | null = null;

export const startRecording = async (): Promise<void> => {
    try {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
            throw new Error('Permission to access microphone was denied');
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recording = newRecording;
    } catch (err) {
        console.error('Failed to start recording', err);
        throw err;
    }
};

export const stopRecording = async (): Promise<{ uri: string; duration: number }> => {
    if (!recording) {
        throw new Error('No recording in progress');
    }

    try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        const status = await recording.getStatusAsync();
        recording = null;

        if (!uri) {
            throw new Error('Recording failed to produce a URI');
        }

        return { uri, duration: status.durationMillis };
    } catch (err) {
        console.error('Failed to stop recording', err);
        throw err;
    }
};

export const playRecording = async (uri: string): Promise<void> => {
    try {
        if (sound) {
            await sound.unloadAsync();
        }
        const { sound: newSound } = await Audio.Sound.createAsync({ uri });
        sound = newSound;
        await sound.playAsync();
    } catch (err) {
        console.error('Failed to play recording', err);
        throw err;
    }
};

/**
 * Check if there's an active recording
 */
export const isRecordingActive = (): boolean => {
    return recording !== null;
};

/**
 * Stop any active recording (used by evidence capture service)
 */
export const stopAnyActiveRecording = async (): Promise<void> => {
    if (recording) {
        try {
            await recording.stopAndUnloadAsync();
            recording = null;
        } catch (err) {
            console.error('Failed to stop existing recording:', err);
            // Try to unload anyway
            recording = null;
        }
    }
};
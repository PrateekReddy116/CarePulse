/**
 * Sarvam AI Text-to-Speech Service
 * Converts text to speech using Sarvam AI API
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY;

export interface TTSOptions {
    model?: string;
    speaker?: string;
    language?: string;
}

/**
 * Convert text to speech using Sarvam AI API
 * @param text The text to convert to speech
 * @param options TTS options (model, speaker, language)
 * @returns Path to the generated audio file
 */
export const textToSpeech = async (
    text: string,
    options: TTSOptions = {}
): Promise<string | null> => {
    try {
        console.log('[Sarvam TTS] Converting text to speech:', text.substring(0, 50) + '...');

        if (!SARVAM_API_KEY) {
            throw new Error('Sarvam API Key is missing. Please check your .env file.');
        }

        const {
            model = 'bulbul:v2',
            speaker = 'anushka',
            language = 'en-IN',
        } = options;

        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
            method: 'POST',
            headers: {
                'api-subscription-key': SARVAM_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model,
                speaker,
                target_language_code: language,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Sarvam TTS API Error (${response.status}): ${errorText}`);
        }

        // Sarvam TTS API returns audio as binary data (WAV format)
        // Read as array buffer and convert to base64
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64 string (React Native compatible)
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const audioBase64 = btoa(binary);

        // Save to local file system
        const audioUri = `${FileSystem.cacheDirectory}sarvam_tts_${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(audioUri, audioBase64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('[Sarvam TTS] Audio saved to:', audioUri);
        return audioUri;

    } catch (error) {
        console.error('[Sarvam TTS] Text-to-Speech Failed:', error);
        return null;
    }
};

/**
 * Play the generated audio file
 * @param audioUri Path to the audio file
 */
export const playTTSAudio = async (audioUri: string): Promise<void> => {
    try {
        // Set audio mode for playback
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { shouldPlay: true }
        );

        // Wait for playback to finish
        await new Promise<void>((resolve, reject) => {
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    if (status.didJustFinish) {
                        resolve();
                    } else if (status.error) {
                        reject(new Error('Playback error'));
                    }
                }
            });
        });

        // Clean up
        await sound.unloadAsync();
    } catch (error) {
        console.error('[Sarvam TTS] Playback Failed:', error);
        throw error;
    }
};

/**
 * Convert text to speech and play it immediately
 * @param text The text to convert and play
 * @param options TTS options
 */
export const speakText = async (
    text: string,
    options: TTSOptions = {}
): Promise<void> => {
    const audioUri = await textToSpeech(text, options);
    if (audioUri) {
        await playTTSAudio(audioUri);
    } else {
        throw new Error('Failed to generate speech audio');
    }
};

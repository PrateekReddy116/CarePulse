/**
 * Mocked Speech-to-Text Service
 * Simulates Google STT behavior for the demo phase.
 * TODO: Replace with real Google STT API integration.
 */
// TODO: Replace with your actual Sarvam API Key or usage of an environment variable
const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY;

export const transcribeAudio = async (fileUri: string): Promise<{ text: string } | null> => {
    try {
        console.log(`[Sarvam STT] Transcribing file: ${fileUri}`);

        if (!SARVAM_API_KEY) {
            throw new Error('Sarvam API Key is missing. Please check your .env file.');
        }

        const formData = new FormData();
        // React Native's FormData expects a file object with uri, name, and type
        formData.append('file', {
            uri: fileUri,
            name: 'audio.wav', // Sarvam supports wav but name is often required
            type: 'audio/wav',
        } as any);
        formData.append('model', 'saarika:v2.5'); // Updated to the latest Saarika model

        const response = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: {
                'api-subscription-key': SARVAM_API_KEY,
                // Do NOT set Content-Type to 'multipart/form-data' manually in React Native; 
                // the fetch client sets it with the boundary automatically.
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Sarvam API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('[Sarvam STT] Response:', data);

        // Sarvam API usually returns { "transcript": "..." }
        if (data && data.transcript) {
            return { text: data.transcript };
        } else {
            throw new Error('No transcript found in response');
        }

    } catch (error) {
        console.error('[Sarvam STT] Transcription Failed:', error);
        return null;
    }
};

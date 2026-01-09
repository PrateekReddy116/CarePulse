import { UserProfile } from './profileService';

export interface IncidentSummary {
    summary: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    explanation: string;
}

/**
 * Generates an AI-powered incident summary based on user profile and report.
 * @param profile The user's profile data.
 * @param symptoms Selected symptoms/conditions.
 * @param description Free text description of the incident.
 * @returns A promise resolving to an IncidentSummary object.
 */
export const generateAIIncidentSummary = async (
    profile: UserProfile,
    symptoms: string[],
    description: string
): Promise<IncidentSummary> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock logic to determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    const highRiskKeywords = ['unconscious', 'bleeding', 'chest pain', 'breathing', 'fracture'];
    const mediumRiskKeywords = ['dizzy', 'pain', 'fall'];

    const combinedText = (description + ' ' + symptoms.join(' ')).toLowerCase();

    if (highRiskKeywords.some(k => combinedText.includes(k))) {
        riskLevel = 'HIGH';
    } else if (mediumRiskKeywords.some(k => combinedText.includes(k))) {
        riskLevel = 'MEDIUM';
    }

    return {
        summary: `Incident reported by ${profile.name || 'User'}. Potential ${symptoms.join(', ')} detected.`,
        riskLevel,
        explanation: `Based on the reported symptoms (${symptoms.join(', ')}) and description, the AI assesses this as a ${riskLevel} risk situation. Immediate attention recommended.`,
    };
};

/**
 * Generates AI helper tips for volunteers based on symptoms.
 * @param symptoms List of reported symptoms.
 * @returns A list of helper tip strings.
 */
export const getAITips = (symptoms: string[]): string[] => {
    const tips: string[] = [
        "Ensure your own safety first before approaching.",
        "Keep the person calm and still.",
    ];

    if (symptoms.includes('bleeding')) {
        tips.push("Apply direct pressure to the wound if safe to do so.");
    }
    if (symptoms.includes('unconscious')) {
        tips.push("Check for breathing and pulse. Start CPR if trained and necessary.");
    }
    if (symptoms.includes('fracture suspected')) {
        tips.push("Do not move the injured limb unless absolutely necessary.");
    }

    return tips;
};

/**
 * Analyzes the incident using the Gemini API.
 * @param payload Data for analysis.
 * @returns Analysis result including summary, risk level, and reason.
 */
export const analyzeIncidentWithGemini = async (payload: {
    profile: UserProfile,
    location: { latitude: number, longitude: number },
    text: string,
    symptoms: string[]
}): Promise<{ summary: string, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH', reason: string }> => {

    // TODO: Replace with real Gemini API Key
    const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const prompt = `
    Analyze the following emergency incident report and provide a JSON response.
    
    User Profile: ${JSON.stringify(payload.profile)}
    Location: ${payload.location.latitude}, ${payload.location.longitude}
    Symptoms: ${payload.symptoms.join(', ')}
    Description/Transcript: "${payload.text}"
    
    Respond ONLY with a valid JSON object in this format:
    {
        "summary": "A concise summary of the incident (max 2 sentences) for first responders.",
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "reason": "Brief explanation of the risk level assessment."
    }
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('Invalid response from Gemini API');
        }

        // Clean up markdown code blocks if present
        const jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonString);

        return {
            summary: result.summary || "Incident reported.",
            riskLevel: (['LOW', 'MEDIUM', 'HIGH'].includes(result.riskLevel) ? result.riskLevel : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
            reason: result.reason || "AI analysis completed."
        };

    } catch (error) {
        console.error('Gemini Analysis Failed:', error);
        // Fallback if API fails or key is missing
        return {
            summary: `Incident reported. Symptoms: ${payload.symptoms.join(', ')}. ${payload.text.substring(0, 50)}...`,
            riskLevel: 'MEDIUM',
            reason: "AI analysis unavailable (Network/API Error). Defaulting to Medium risk."
        };
    }
};

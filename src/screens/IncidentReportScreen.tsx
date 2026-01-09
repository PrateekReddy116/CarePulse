import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useEmergency } from '../context/EmergencyContext';
import { useTheme } from '../context/ThemeContext';
import { RecordingIndicator } from '../components/RecordingIndicator';
import { BackgroundCamera } from '../components/BackgroundCamera';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Services
import { startRecording, stopRecording, playRecording } from '../services/audioService';
import { transcribeAudio } from '../services/sttService';
import { isEvidenceCaptureActive, initializeCameraForRecording } from '../services/evidenceCaptureService';
import { analyzeIncidentWithGemini } from '../services/aiService';
import { sendEmergencySMS, notifyVolunteersOnline, notifyVolunteersOfflineLocalAssignment } from '../services/commsService';
import { isOnline } from '../services/networkService';
import { assignVolunteers } from '../services/volunteerService';
import { speakText } from '../services/ttsService';

type IncidentReportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'IncidentReport'>;

interface Props {
    navigation: IncidentReportScreenNavigationProp;
}

const SYMPTOMS = [
    'Bleeding', 'Fracture', 'Dizzy', 'Unconscious', 'Breathing', 'Chest Pain', 'Fall'
];

export const IncidentReportScreen: React.FC<Props> = ({ navigation }) => {
    const { submitIncidentReport, userProfile, setIncidentSummary } = useEmergency();
    const { theme } = useTheme();

    // Form State
    const [description, setDescription] = useState('');
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

    // Voice & Processing State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [processingState, setProcessingState] = useState<'IDLE' | 'TRANSCRIBING' | 'ANALYZING' | 'SENDING' | 'SPEAKING'>('IDLE');
    const [transcript, setTranscript] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<{ summary: string, riskLevel: string, reason: string } | null>(null);
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);

    const toggleSymptom = (symptom: string) => {
        if (selectedSymptoms.includes(symptom)) {
            setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
        } else {
            setSelectedSymptoms(prev => [...prev, symptom]);
        }
    };

    const handleStartRecording = async () => {
        try {
            // Video recording hasn't started yet (it starts on Request Help)
            // So we can use microphone for transcription without conflicts
            await startRecording();
            setIsRecording(true);
            setRecordingUri(null);
            setTranscript(null);
            setAiAnalysis(null);
        } catch (error) {
            // Check if error is due to recording conflict
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('Recording') || errorMessage.includes('microphone')) {
                Alert.alert(
                    'Recording Conflict',
                    'Microphone is still in use. Please wait a moment and try again.'
                );
            } else {
            Alert.alert('Error', 'Could not start recording.');
            }
        }
    };

    const handleStopRecording = async () => {
        try {
            const { uri, duration } = await stopRecording();
            setIsRecording(false);
            setRecordingUri(uri);
            setRecordingDuration(duration);
            // Video recording hasn't started yet, so no need to resume anything
        } catch (error) {
            Alert.alert('Error', 'Could not stop recording.');
            setIsRecording(false);
        }
    };

    const handlePlayRecording = async () => {
        if (recordingUri) {
            await playRecording(recordingUri);
        }
    };

    const handleTranscribeAndAnalyze = async () => {
        if (!recordingUri) return;

        const online = await isOnline();
        if (!online) {
            Alert.alert('Offline', 'Internet connection required for AI analysis. Please use "Send" for offline reporting.');
            return;
        }

        try {
            setProcessingState('TRANSCRIBING');
            const transcriptionResult = await transcribeAudio(recordingUri);

            if (!transcriptionResult || !transcriptionResult.text) {
                throw new Error('Transcription failed');
            }

            const text = transcriptionResult.text;
            setTranscript(text);
            setDescription(text); // Auto-fill description

            setProcessingState('ANALYZING');

            // Get current location for analysis
            const location = await Location.getCurrentPositionAsync({});

            const analysis = await analyzeIncidentWithGemini({
                profile: userProfile,
                location: location.coords,
                text: text,
                symptoms: selectedSymptoms
            });

            setAiAnalysis(analysis);
            setIncidentSummary({
                summary: analysis.summary,
                riskLevel: analysis.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
                explanation: analysis.reason
            });

            // Notify online volunteers
            await notifyVolunteersOnline(analysis.summary, location.coords);

            setProcessingState('IDLE');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Analysis failed. Please try again or type manually.');
            setProcessingState('IDLE');
        }
    };

    const handleOfflineSend = async () => {
        try {
            setProcessingState('SENDING');
            const location = await Location.getCurrentPositionAsync({});
            const locationLink = `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;

            const messageBody = `CAREPULSE EMERGENCY: ${userProfile.name || 'Unknown'}, ${userProfile.age || 'N/A'}.
Location: ${location.coords.latitude}, ${location.coords.longitude} (${locationLink})
Symptoms: ${selectedSymptoms.join(', ')}
Description: ${description || transcript || (recordingUri ? 'Audio recorded (offline)' : 'No description')}
NOTE: No internet — audio saved locally.`;

            // 1. Send SMS
            if (userProfile.contacts && userProfile.contacts.length > 0) {
                await sendEmergencySMS(userProfile.contacts, messageBody);
            } else {
                // Fallback if no contacts, maybe just open SMS with empty recipient or alert user
                Alert.alert('No Contacts', 'No emergency contacts found. Please add contacts in profile.');
            }

            // 2. Local Volunteer Assignment
            const assigned = assignVolunteers(location);
            // In a real app, we'd save this assignment locally

            // 3. Notify User
            await notifyVolunteersOfflineLocalAssignment("Emergency reported locally.");

            setProcessingState('IDLE');
            navigation.replace('HelpStatus');

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to send offline report.');
            setProcessingState('IDLE');
        }
    };

    const handleSubmit = async () => {
        // Initialize camera for video recording when user clicks "Request Help"
        // Camera will mount, become ready, and start recording automatically
        // This happens after transcription is complete, so no conflicts
        if (isEvidenceCaptureActive()) {
            console.log('Initializing camera for video recording...');
            initializeCameraForRecording();
            // Camera will mount and start recording automatically via BackgroundCamera
        }

        // If we have AI analysis, we already notified online.
        // If not, we check connectivity and decide.
        const online = await isOnline();

        if (online && aiAnalysis) {
            // Already handled in Transcribe & Analyze, just navigate
            navigation.replace('HelpStatus');
        } else if (online) {
            // Manual text entry -> Online submission
            // We can trigger a quick analysis or just submit raw
            await submitIncidentReport(selectedSymptoms, description);
            navigation.replace('HelpStatus');
        } else {
            // Offline flow
            await handleOfflineSend();
        }
    };

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <BackgroundCamera />
            <ScrollView contentContainerStyle={styles.content}>
                <RecordingIndicator />
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>What happened?</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Record a voice message or select symptoms.</Text>
                </View>

                {/* Voice Recorder Section */}
                <View style={[styles.voiceContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.voiceControls}>
                        {isRecording ? (
                            <TouchableOpacity onPress={handleStopRecording} style={styles.recordButtonActive}>
                                <View style={styles.stopIcon} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleStartRecording} style={[styles.recordButton, { backgroundColor: theme.primary }]}>
                                <MaterialIcons name="mic" size={32} color="#FFF" />
                            </TouchableOpacity>
                        )}

                        <View style={styles.voiceStatus}>
                            <Text style={{ color: theme.textPrimary }}>
                                {isRecording ? 'Recording...' : (recordingUri ? 'Audio Recorded' : 'Tap to Record')}
                            </Text>
                            {recordingDuration > 0 && !isRecording && (
                                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                                    {(recordingDuration / 1000).toFixed(1)}s
                                </Text>
                            )}
                        </View>

                        {recordingUri && !isRecording && (
                            <TouchableOpacity onPress={handlePlayRecording} style={styles.iconButton}>
                                <MaterialIcons name="play-arrow" size={28} color={theme.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {recordingUri && !isRecording && (
                        <View style={styles.actionButtons}>
                            <Button
                                title={processingState === 'TRANSCRIBING' ? 'Transcribing...' : (processingState === 'ANALYZING' ? 'Analyzing...' : 'Transcribe & Analyze')}
                                onPress={handleTranscribeAndAnalyze}
                                variant="primary"
                                loading={processingState === 'TRANSCRIBING' || processingState === 'ANALYZING'}
                                style={{ flex: 1, marginRight: SPACING.s }}
                            />
                        </View>
                    )}
                </View>

                {/* AI Analysis Result */}
                {aiAnalysis && (
                    <View style={[styles.aiCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
                        <View style={styles.aiHeader}>
                            <MaterialIcons name="auto-awesome" size={20} color={theme.primary} />
                            <Text style={[styles.aiTitle, { color: theme.primary }]}>AI Assessment</Text>
                            <TouchableOpacity
                                onPress={async () => {
                                    if (isPlayingTTS) return;
                                    try {
                                        setIsPlayingTTS(true);
                                        setProcessingState('SPEAKING');
                                        const fullText = `${aiAnalysis.summary}. Risk Level: ${aiAnalysis.riskLevel}. ${aiAnalysis.reason}`;
                                        await speakText(fullText);
                                    } catch (error) {
                                        console.error('TTS Error:', error);
                                        Alert.alert('Error', 'Failed to play audio. Please check your internet connection and API key.');
                                    } finally {
                                        setIsPlayingTTS(false);
                                        setProcessingState('IDLE');
                                    }
                                }}
                                style={styles.ttsButton}
                                disabled={isPlayingTTS || processingState === 'SPEAKING'}
                            >
                                {isPlayingTTS || processingState === 'SPEAKING' ? (
                                    <ActivityIndicator size="small" color={theme.primary} />
                                ) : (
                                    <MaterialIcons name="volume-up" size={20} color={theme.primary} />
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.aiSummary, { color: theme.textPrimary }]}>{aiAnalysis.summary}</Text>
                        <View style={styles.riskContainer}>
                            <Text style={[styles.riskLabel, { color: theme.textSecondary }]}>Risk Level:</Text>
                            <Text style={[styles.riskValue, {
                                color: aiAnalysis.riskLevel === 'HIGH' ? '#FF4444' : (aiAnalysis.riskLevel === 'MEDIUM' ? '#FFAA00' : '#00CC44')
                            }]}>
                                {aiAnalysis.riskLevel}
                            </Text>
                        </View>
                        <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>Not medical advice. For responder assistance only.</Text>
                    </View>
                )}

                <View style={styles.symptomsContainer}>
                    {SYMPTOMS.map(symptom => {
                        const isSelected = selectedSymptoms.includes(symptom);
                        return (
                            <TouchableOpacity
                                key={symptom}
                                style={[
                                    styles.symptomChip,
                                    {
                                        backgroundColor: isSelected ? theme.primary : theme.surface,
                                        borderColor: isSelected ? theme.primary : theme.border,
                                    }
                                ]}
                                onPress={() => toggleSymptom(symptom)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.symptomText,
                                    { color: isSelected ? '#FFFFFF' : theme.textPrimary }
                                ]}>{symptom}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Input
                    label="Additional Details"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Briefly describe the situation..."
                    multiline
                    style={[styles.input, { height: 120 }]}
                />

                <View style={styles.spacer} />

                <Button
                    title={recordingUri && !aiAnalysis ? "Send Offline" : "Request Help"}
                    onPress={handleSubmit}
                    loading={processingState === 'SENDING'}
                    variant={recordingUri && !aiAnalysis ? "outline" : "primary"}
                    style={styles.submitButton}
                />

                <Button
                    title="Skip"
                    onPress={() => navigation.replace('HelpStatus')}
                    variant="outline"
                    style={styles.skipButton}
                />
            </ScrollView>
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: SPACING.l,
    },
    header: {
        marginBottom: SPACING.l,
    },
    title: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: FONT_SIZE.m,
        lineHeight: 22,
    },
    voiceContainer: {
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.xl,
    },
    voiceControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    recordButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordButtonActive: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopIcon: {
        width: 24,
        height: 24,
        backgroundColor: '#FFF',
        borderRadius: 4,
    },
    voiceStatus: {
        flex: 1,
        marginLeft: SPACING.m,
    },
    iconButton: {
        padding: SPACING.s,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    aiCard: {
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.xl,
        borderLeftWidth: 4,
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
        justifyContent: 'space-between',
    },
    ttsButton: {
        padding: SPACING.xs,
        marginLeft: SPACING.s,
    },
    aiTitle: {
        fontWeight: '700',
        marginLeft: SPACING.s,
    },
    aiSummary: {
        fontSize: FONT_SIZE.m,
        marginBottom: SPACING.s,
        lineHeight: 20,
    },
    riskContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    riskLabel: {
        fontWeight: '600',
        marginRight: SPACING.s,
    },
    riskValue: {
        fontWeight: '700',
    },
    disclaimer: {
        fontSize: FONT_SIZE.xs,
        fontStyle: 'italic',
    },
    symptomsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.s,
        marginBottom: SPACING.xl,
    },
    symptomChip: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: BORDER_RADIUS.l,
        borderWidth: 1,
    },
    symptomText: {
        fontWeight: '600',
        fontSize: FONT_SIZE.s,
    },
    input: {
        textAlignVertical: 'top',
    },
    spacer: {
        height: SPACING.xl,
    },
    submitButton: {
        marginBottom: SPACING.m,
    },
    skipButton: {
        borderWidth: 0,
    },
});

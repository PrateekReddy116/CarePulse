import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Button } from '../components/Button';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Notifications from 'expo-notifications';
import { useEmergency } from '../context/EmergencyContext';
import { useTheme } from '../context/ThemeContext';
import { RecordingIndicator } from '../components/RecordingIndicator';
import { BackgroundCamera } from '../components/BackgroundCamera';

type SOSActivationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SOSActivation'>;

interface Props {
    navigation: SOSActivationScreenNavigationProp;
}

export const SOSActivationScreen: React.FC<Props> = ({ navigation }) => {
    const { triggerSOS } = useEmergency();
    const { theme } = useTheme();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSOSActivated();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleSOSActivated = async () => {
        Vibration.vibrate([500, 500, 500]);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "SOS Activated!",
                body: "Help is being notified. Stay calm.",
            },
            trigger: null,
        });

        // Trigger SOS logic (auto-assignment)
        await triggerSOS();

        navigation.replace('IncidentReport');
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <BackgroundCamera />
            <View style={styles.content}>
                <RecordingIndicator />
                <Text style={[styles.title, { color: theme.textPrimary }]}>Sending Alert in...</Text>

                <View style={[styles.countdownContainer, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.countdown, { color: theme.danger }]}>{countdown}</Text>
                </View>

                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Notifying emergency contacts and nearby volunteers...
                </Text>

                <Button
                    title="CANCEL SOS"
                    onPress={handleCancel}
                    variant="danger"
                    style={styles.cancelButton}
                />
            </View>
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.l,
    },
    title: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        marginBottom: SPACING.xl,
    },
    countdownContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    countdown: {
        fontSize: 80,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: FONT_SIZE.m,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        maxWidth: '80%',
    },
    cancelButton: {
        width: '100%',
    },
});

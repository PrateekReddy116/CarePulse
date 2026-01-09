import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { isEvidenceCaptureActive, getRecordingDuration } from '../services/evidenceCaptureService';
import { SPACING, FONT_SIZE } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

export const RecordingIndicator: React.FC = () => {
    const { theme } = useTheme();
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const interval = setInterval(() => {
            const active = isEvidenceCaptureActive();
            setIsRecording(active);
            if (active) {
                setDuration(getRecordingDuration());
            } else {
                setDuration(0);
            }
        }, 1000); // Update every second

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isRecording) {
            // Start pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.3,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isRecording, pulseAnim]);

    if (!isRecording) {
        return null;
    }

    const formatDuration = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.danger }]}>
            <Animated.View style={{ opacity: pulseAnim }}>
                <MaterialIcons name="videocam" size={20} color={theme.danger} />
            </Animated.View>
            <View style={styles.textContainer}>
                <Text style={[styles.text, { color: theme.danger }]}>Recording Evidence</Text>
                <Text style={[styles.duration, { color: theme.textSecondary }]}>
                    {formatDuration(duration)}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: SPACING.m,
    },
    textContainer: {
        marginLeft: SPACING.s,
        flex: 1,
    },
    text: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    duration: {
        fontSize: FONT_SIZE.xs,
        marginTop: 2,
    },
});


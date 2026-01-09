import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Animated,
    StatusBar,
    Platform,
    Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, Timer, Play, Square, CheckCircle } from 'lucide-react-native';
import {
    startSOSTimer,
    stopSOSTimer,
    checkInSOSTimer,
    getActiveSOSTimer,
} from '../services/sosTimerService';

type SOSTimerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SOSTimer'>;

interface Props {
    navigation: SOSTimerScreenNavigationProp;
}

export const SOSTimerScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const [isActive, setIsActive] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [description, setDescription] = useState('');
    const [inputMinutes, setInputMinutes] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadTimer();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        if (isActive) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();

            // Update remaining time every second
            timerIntervalRef.current = setInterval(async () => {
                const timer = await getActiveSOSTimer();
                if (timer) {
                    setRemainingTime(timer.remainingTime);
                    if (timer.remainingTime === 0) {
                        setIsActive(false);
                        Alert.alert(
                            '🚨 Timer Expired',
                            'Emergency alert has been sent to your contacts.',
                            [{ text: 'OK' }]
                        );
                    }
                } else {
                    setIsActive(false);
                }
            }, 1000);

            return () => {
                pulse.stop();
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                }
            };
        }
    }, [isActive]);

    const loadTimer = async () => {
        try {
            const timer = await getActiveSOSTimer();
            if (timer && timer.isActive) {
                setIsActive(true);
                setRemainingTime(timer.remainingTime);
                setDuration(timer.duration);
                setDescription(timer.description || '');
            }
        } catch (error) {
            console.error('Failed to load timer:', error);
        }
    };

    const handleStart = async () => {
        const minutes = parseInt(inputMinutes, 10);
        if (!minutes || minutes < 1 || minutes > 1440) {
            Alert.alert('Invalid Duration', 'Please enter a duration between 1 and 1440 minutes.');
            return;
        }

        try {
            const timer = await startSOSTimer(minutes, description || undefined);
            setIsActive(true);
            setRemainingTime(timer.remainingTime);
            setDuration(timer.duration);
            setInputMinutes('');
            setDescription('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start timer');
        }
    };

    const handleStop = async () => {
        Alert.alert(
            'Stop Timer?',
            'Are you sure you want to stop the timer?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Stop',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await stopSOSTimer();
                            setIsActive(false);
                            setRemainingTime(0);
                            setDuration(0);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to stop timer');
                        }
                    },
                },
            ]
        );
    };

    const handleCheckIn = async () => {
        try {
            await checkInSOSTimer();
            setIsActive(false);
            setRemainingTime(0);
            setDuration(0);
            Alert.alert('Check-In Successful', 'You checked in safely. Timer stopped.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to check in');
        }
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgress = (): number => {
        if (duration === 0) return 0;
        return (duration - remainingTime) / duration;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>SOS Timer</Text>
                <View style={{ width: 40 }} />
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Timer Display */}
                    <View style={[
                        styles.timerCard,
                        {
                            backgroundColor: theme.surface,
                            ...(isDark ? SHADOWS.dark : SHADOWS.light),
                        },
                    ]}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <View style={[
                                styles.timerIcon,
                                {
                                    backgroundColor: isActive
                                        ? theme.warning + '20'
                                        : theme.textSecondary + '20',
                                },
                            ]}>
                                <Timer
                                    size={48}
                                    color={isActive ? theme.warning : theme.textSecondary}
                                />
                            </View>
                        </Animated.View>

                        <Text style={[styles.timerText, { color: theme.textPrimary }]}>
                            {formatTime(remainingTime)}
                        </Text>

                        <Text style={[styles.timerStatus, { color: theme.textSecondary }]}>
                            {isActive
                                ? 'Timer is running. Check in before it expires.'
                                : 'Set a timer to automatically send an emergency alert'}
                        </Text>

                        {/* Progress Bar */}
                        {isActive && (
                            <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        {
                                            width: `${getProgress() * 100}%`,
                                            backgroundColor: theme.warning,
                                        },
                                    ]}
                                />
                            </View>
                        )}
                    </View>

                    {/* Input Section */}
                    {!isActive && (
                        <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
                                Duration (minutes)
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: theme.surface,
                                        color: theme.textPrimary,
                                        borderColor: theme.border,
                                    },
                                ]}
                                value={inputMinutes}
                                onChangeText={setInputMinutes}
                                placeholder="Enter duration in minutes"
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="numeric"
                            />

                            <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: SPACING.m }]}>
                                Description (optional)
                            </Text>
                            <TextInput
                                style={[
                                    styles.textArea,
                                    {
                                        backgroundColor: theme.surface,
                                        color: theme.textPrimary,
                                        borderColor: theme.border,
                                    },
                                ]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="What are you doing? (e.g., Walking home)"
                                placeholderTextColor={theme.textSecondary}
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    )}

                    {/* Info Section */}
                    <View style={styles.infoSection}>
                        <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>
                            How It Works
                        </Text>
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                            • Set a countdown timer for your activity{'\n'}
                            • If you don't check in before it expires, an emergency alert is automatically sent{'\n'}
                            • You can check in at any time to stop the timer{'\n'}
                            • Your contacts will receive your location if the timer expires
                        </Text>
                    </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={[styles.actionContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                    {isActive ? (
                        <>
                            <TouchableOpacity
                                onPress={handleCheckIn}
                                style={[
                                    styles.actionButton,
                                    {
                                        backgroundColor: theme.success,
                                        ...(isDark ? SHADOWS.dark : SHADOWS.light),
                                    },
                                ]}
                                activeOpacity={0.8}
                            >
                                <CheckCircle size={20} color="#FFFFFF" />
                                <Text style={styles.actionButtonText}>Check In</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleStop}
                                style={[
                                    styles.actionButton,
                                    styles.secondaryButton,
                                    {
                                        backgroundColor: theme.surface,
                                        borderColor: theme.border,
                                    },
                                ]}
                                activeOpacity={0.8}
                            >
                                <Square size={20} color={theme.danger} />
                                <Text style={[styles.secondaryButtonText, { color: theme.danger }]}>
                                    Stop Timer
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            onPress={handleStart}
                            style={[
                                styles.actionButton,
                                {
                                    backgroundColor: theme.primary,
                                    ...(isDark ? SHADOWS.dark : SHADOWS.light),
                                },
                            ]}
                            activeOpacity={0.8}
                        >
                            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Start Timer</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingTop: Platform.OS === 'ios' ? SPACING.xxl + 16 : SPACING.xl + 8,
        paddingBottom: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.l,
        paddingBottom: 100,
    },
    timerCard: {
        borderRadius: BORDER_RADIUS.l,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    timerIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.l,
    },
    timerText: {
        fontSize: 56,
        fontWeight: '800',
        letterSpacing: -1,
        marginBottom: SPACING.s,
        fontVariant: ['tabular-nums'],
    },
    timerStatus: {
        fontSize: FONT_SIZE.s,
        textAlign: 'center',
        marginBottom: SPACING.m,
        lineHeight: 20,
    },
    progressBarContainer: {
        width: '100%',
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: SPACING.m,
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    inputSection: {
        marginBottom: SPACING.xl,
    },
    inputLabel: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    input: {
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
        fontSize: FONT_SIZE.m,
        borderWidth: 1,
    },
    textArea: {
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
        fontSize: FONT_SIZE.m,
        borderWidth: 1,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    infoSection: {
        marginTop: SPACING.l,
    },
    infoTitle: {
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
        marginBottom: SPACING.s,
    },
    infoText: {
        fontSize: FONT_SIZE.s,
        lineHeight: 22,
    },
    actionContainer: {
        padding: SPACING.l,
        paddingBottom: SPACING.xl,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: SPACING.s,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: BORDER_RADIUS.m,
        paddingVertical: SPACING.m + 4,
    },
    secondaryButton: {
        borderWidth: 1,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    secondaryButtonText: {
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
});


import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    StatusBar,
    Platform,
    Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { useEmergency } from '../context/EmergencyContext';
import { ChevronLeft, Radio, MapPin, Users, Clock } from 'lucide-react-native';
import {
    startMonitorMe,
    stopMonitorMe,
    getActiveMonitorMeSession,
    getSharedContacts,
} from '../services/monitorMeService';

type MonitorMeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MonitorMe'>;

interface Props {
    navigation: MonitorMeScreenNavigationProp;
}

export const MonitorMeScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { userProfile } = useEmergency();
    const [isActive, setIsActive] = useState(false);
    const [sharedContacts, setSharedContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
    const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadSession();
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
                        toValue: 1.1,
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
            return () => pulse.stop();
        }
    }, [isActive]);

    const loadSession = async () => {
        try {
            const session = await getActiveMonitorMeSession();
            if (session) {
                setIsActive(true);
                setSessionStartTime(session.startTime);
                const contacts = await getSharedContacts();
                setSharedContacts(contacts);
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    };

    const handleStart = async () => {
        try {
            if (userProfile.contacts.length === 0) {
                Alert.alert(
                    'No Contacts',
                    'Please add emergency contacts in your profile first.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Select all contacts for now (can be enhanced with multi-select)
            const contactIds = userProfile.contacts.map(c => c.id);
            const session = await startMonitorMe(contactIds);
            
            setIsActive(true);
            setSessionStartTime(session.startTime);
            const contacts = await getSharedContacts();
            setSharedContacts(contacts);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start Monitor Me');
        }
    };

    const handleStop = async () => {
        Alert.alert(
            'Stop Monitor Me?',
            'Your location will no longer be shared with contacts.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Stop',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await stopMonitorMe();
                            setIsActive(false);
                            setSessionStartTime(null);
                            setSharedContacts([]);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to stop Monitor Me');
                        }
                    },
                },
            ]
        );
    };

    const formatDuration = (startTime: string) => {
        const start = new Date(startTime);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
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
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Monitor Me</Text>
                <View style={{ width: 40 }} />
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Status Card */}
                    <View style={[
                        styles.statusCard,
                        {
                            backgroundColor: theme.surface,
                            ...(isDark ? SHADOWS.dark : SHADOWS.light),
                        },
                    ]}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <View style={[
                                styles.statusIndicator,
                                {
                                    backgroundColor: isActive
                                        ? theme.success
                                        : theme.textSecondary,
                                },
                            ]}>
                                <Radio
                                    size={24}
                                    color="#FFFFFF"
                                    fill={isActive ? '#FFFFFF' : 'transparent'}
                                />
                            </View>
                        </Animated.View>
                        
                        <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>
                            {isActive ? 'Location Sharing Active' : 'Location Sharing Inactive'}
                        </Text>
                        <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
                            {isActive
                                ? 'Your location is being shared with selected contacts'
                                : 'Start sharing your live location with trusted contacts'}
                        </Text>

                        {isActive && sessionStartTime && (
                            <View style={styles.durationContainer}>
                                <Clock size={14} color={theme.textSecondary} />
                                <Text style={[styles.durationText, { color: theme.textSecondary }]}>
                                    Active for {formatDuration(sessionStartTime)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Shared Contacts */}
                    {isActive && sharedContacts.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Users size={18} color={theme.textPrimary} />
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                    Sharing With
                                </Text>
                            </View>
                            {sharedContacts.map((contact) => (
                                <View
                                    key={contact.id}
                                    style={[
                                        styles.contactItem,
                                        {
                                            backgroundColor: theme.surface,
                                            borderColor: theme.border,
                                            ...(isDark ? SHADOWS.dark : SHADOWS.light),
                                        },
                                    ]}
                                >
                                    <View style={[
                                        styles.contactAvatar,
                                        { backgroundColor: theme.primary + '20' },
                                    ]}>
                                        <Text style={[styles.contactInitial, { color: theme.primary }]}>
                                            {contact.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.contactInfo}>
                                        <Text style={[styles.contactName, { color: theme.textPrimary }]}>
                                            {contact.name}
                                        </Text>
                                        <Text style={[styles.contactPhone, { color: theme.textSecondary }]}>
                                            {contact.phone}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Info Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MapPin size={18} color={theme.textPrimary} />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                How It Works
                            </Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                                • Your location is updated every 10 seconds{'\n'}
                                • Selected contacts can see your real-time location{'\n'}
                                • You can stop sharing at any time{'\n'}
                                • Location history is saved for your safety
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Action Button */}
                <View style={[styles.actionContainer, { backgroundColor: theme.background }]}>
                    <TouchableOpacity
                        onPress={isActive ? handleStop : handleStart}
                        style={[
                            styles.actionButton,
                            {
                                backgroundColor: isActive ? theme.danger : theme.primary,
                                ...(isDark ? SHADOWS.dark : SHADOWS.light),
                            },
                        ]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionButtonText}>
                            {isActive ? 'Stop Sharing' : 'Start Sharing'}
                        </Text>
                    </TouchableOpacity>
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
    statusCard: {
        borderRadius: BORDER_RADIUS.l,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    statusIndicator: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.m,
    },
    statusTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    statusSubtitle: {
        fontSize: FONT_SIZE.s,
        textAlign: 'center',
        lineHeight: 20,
    },
    durationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.m,
        gap: 6,
    },
    durationText: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
        gap: 8,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        marginBottom: SPACING.s,
    },
    contactAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    contactInitial: {
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: FONT_SIZE.s,
    },
    infoCard: {
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
    },
    infoText: {
        fontSize: FONT_SIZE.s,
        lineHeight: 22,
    },
    actionContainer: {
        padding: SPACING.l,
        paddingBottom: SPACING.xl,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    actionButton: {
        borderRadius: BORDER_RADIUS.m,
        paddingVertical: SPACING.m + 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
});


import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ViewStyle, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { Eye, Timer, MapPin, ChevronRight, Navigation as NavigationIcon, Bluetooth, Users } from 'lucide-react-native';
import { getCurrentSessionId } from '../services/monitorMeService';
import { useEmergency } from '../context/EmergencyContext';
import { getLatestIncomingLiveLocation } from '../services/liveLocationNotificationService';
import { useFocusEffect } from '@react-navigation/native';

type SafetyToolsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SafetyTools'>;

interface Props {
    navigation: SafetyToolsScreenNavigationProp;
}

export const SafetyToolsScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { userProfile } = useEmergency();
    const [hasIncomingLiveLocation, setHasIncomingLiveLocation] = useState(false);

    // Check for incoming live location notifications when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            const checkForIncomingLiveLocation = async () => {
                try {
                    const incoming = await getLatestIncomingLiveLocation();
                    setHasIncomingLiveLocation(!!incoming);
                } catch (error) {
                    console.error('Error checking for incoming live location:', error);
                }
            };

            // Check immediately
            checkForIncomingLiveLocation();

            // Poll every 5 seconds while screen is focused
            const pollInterval = setInterval(checkForIncomingLiveLocation, 5000);

            return () => {
                clearInterval(pollInterval);
            };
        }, [])
    );

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <ScrollView
                contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
                bounces={false}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.title, { color: theme.textPrimary }]}>Safety Tools</Text>

                <View style={styles.cardsContainer}>
                    {/* Sathi - ESP32 BLE Pairing */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Sathi')}
                    >
                        <Card style={StyleSheet.flatten([
                            styles.toolCard,
                            {
                                backgroundColor: isDark ? 'rgba(80, 40, 120, 0.3)' : '#F3E8FF',
                                shadowColor: isDark ? SHADOWS.dark.shadowColor : SHADOWS.light.shadowColor,
                                shadowOffset: isDark ? SHADOWS.dark.shadowOffset : SHADOWS.light.shadowOffset,
                                shadowOpacity: isDark ? SHADOWS.dark.shadowOpacity : SHADOWS.light.shadowOpacity,
                                shadowRadius: isDark ? SHADOWS.dark.shadowRadius : SHADOWS.light.shadowRadius,
                                elevation: isDark ? SHADOWS.dark.elevation : SHADOWS.light.elevation,
                            },
                        ]) as ViewStyle}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}>
                                        <Bluetooth size={36} color={theme.secondary} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.toolTitle, { color: theme.textPrimary }]}>Sathi</Text>
                                        <Text style={[styles.toolSubtitleBold, { color: theme.textPrimary }]}>ESP32 BLE connection.</Text>
                                        <Text style={[styles.toolSubtitle, { color: theme.textSecondary }]}>
                                            Pair and connect your ESP32 device via Bluetooth Low Energy to receive real-time safety data and alerts.
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={theme.textSecondary} />
                            </View>
                        </Card>
                    </TouchableOpacity>

                    {/* Travel Buddy */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('TravelBuddy')}
                    >
                        <Card style={StyleSheet.flatten([
                            styles.toolCard,
                            {
                                backgroundColor: isDark ? 'rgba(40, 80, 120, 0.3)' : '#E0F2FE',
                                shadowColor: isDark ? SHADOWS.dark.shadowColor : SHADOWS.light.shadowColor,
                                shadowOffset: isDark ? SHADOWS.dark.shadowOffset : SHADOWS.light.shadowOffset,
                                shadowOpacity: isDark ? SHADOWS.dark.shadowOpacity : SHADOWS.light.shadowOpacity,
                                shadowRadius: isDark ? SHADOWS.dark.shadowRadius : SHADOWS.light.shadowRadius,
                                elevation: isDark ? SHADOWS.dark.elevation : SHADOWS.light.elevation,
                            },
                        ]) as ViewStyle}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}>
                                        <Users size={36} color={theme.primary} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.toolTitle, { color: theme.textPrimary }]}>Travel Buddy</Text>
                                        <Text style={[styles.toolSubtitleBold, { color: theme.textPrimary }]}>Find safe travel companions.</Text>
                                        <Text style={[styles.toolSubtitle, { color: theme.textSecondary }]}>
                                            Share your travel route and find trusted companions from our community. Connect through chat rooms and travel together safely.
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={theme.textSecondary} />
                            </View>
                        </Card>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('MonitorMe')}
                    >
                        <Card style={StyleSheet.flatten([
                            styles.toolCard,
                            {
                                backgroundColor: isDark ? 'rgba(30, 60, 100, 0.3)' : '#EAF5FF',
                                shadowColor: isDark ? SHADOWS.dark.shadowColor : SHADOWS.light.shadowColor,
                                shadowOffset: isDark ? SHADOWS.dark.shadowOffset : SHADOWS.light.shadowOffset,
                                shadowOpacity: isDark ? SHADOWS.dark.shadowOpacity : SHADOWS.light.shadowOpacity,
                                shadowRadius: isDark ? SHADOWS.dark.shadowRadius : SHADOWS.light.shadowRadius,
                                elevation: isDark ? SHADOWS.dark.elevation : SHADOWS.light.elevation,
                            },
                        ]) as ViewStyle}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}>
                                        <Eye size={36} color={theme.primary} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.toolTitle, { color: theme.textPrimary }]}>Monitor Me</Text>
                                        <Text style={[styles.toolSubtitleBold, { color: theme.textPrimary }]}>Real-time companionship.</Text>
                                        <Text style={[styles.toolSubtitle, { color: theme.textSecondary }]}>
                                            Share your live location and status with trusted contacts until you feel safe or reach your destination.
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={theme.textSecondary} />
                            </View>
                        </Card>
                    </TouchableOpacity>

                    {/* Live Location Viewer (prefers sessions shared *to* this user, falls back to own session) */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={async () => {
                            try {
                                // 1) Check if someone is sharing live location *with* this user
                                const incoming = await getLatestIncomingLiveLocation();
                                if (incoming) {
                                    navigation.navigate('LiveLocationViewer', {
                                        sessionId: incoming.sessionId,
                                        volunteerName: incoming.volunteerName,
                                    });
                                    return;
                                }

                                // 2) Fallback: if user has their own active Monitor Me session, show self
                                const selfSessionId = getCurrentSessionId();
                                if (selfSessionId) {
                                    navigation.navigate('LiveLocationViewer', {
                                        sessionId: selfSessionId,
                                        volunteerName: userProfile.name || 'You',
                                    });
                                    return;
                                }

                                Alert.alert(
                                    'No Live Location',
                                    'No one is currently sharing live location with you, and you have no active Monitor Me session.',
                                );
                            } catch (error: any) {
                                Alert.alert('Error', error?.message || 'Failed to open live location viewer');
                            }
                        }}
                    >
                        <Card style={StyleSheet.flatten([
                            styles.toolCard,
                            {
                                backgroundColor: isDark ? 'rgba(40, 40, 80, 0.4)' : '#EAE8FF',
                                shadowColor: isDark ? SHADOWS.dark.shadowColor : SHADOWS.light.shadowColor,
                                shadowOffset: isDark ? SHADOWS.dark.shadowOffset : SHADOWS.light.shadowOffset,
                                shadowOpacity: isDark ? SHADOWS.dark.shadowOpacity : SHADOWS.light.shadowOpacity,
                                shadowRadius: isDark ? SHADOWS.dark.shadowRadius : SHADOWS.light.shadowRadius,
                                elevation: isDark ? SHADOWS.dark.elevation : SHADOWS.light.elevation,
                                borderWidth: hasIncomingLiveLocation ? 2 : 0,
                                borderColor: hasIncomingLiveLocation ? theme.primary : 'transparent',
                            },
                        ]) as ViewStyle}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}>
                                        <NavigationIcon size={32} color={theme.secondary} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <View style={styles.titleRow}>
                                            <Text style={[styles.toolTitle, { color: theme.textPrimary }]}>Live Location Viewer</Text>
                                            {hasIncomingLiveLocation && (
                                                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                                                    <Text style={styles.badgeText}>New</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.toolSubtitleBold, { color: theme.textPrimary }]}>WhatsApp-style tracking.</Text>
                                        <Text style={[styles.toolSubtitle, { color: theme.textSecondary }]}>
                                            {hasIncomingLiveLocation 
                                                ? 'Someone is sharing their live location with you! Tap to view.'
                                                : 'See your live movement on the map in real time while Monitor Me is active.'}
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={theme.textSecondary} />
                            </View>
                        </Card>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('SOSTimer')}
                    >
                        <Card style={StyleSheet.flatten([
                            styles.toolCard,
                            {
                                backgroundColor: isDark ? 'rgba(100, 60, 30, 0.3)' : '#FFEFE4',
                                shadowColor: isDark ? SHADOWS.dark.shadowColor : SHADOWS.light.shadowColor,
                                shadowOffset: isDark ? SHADOWS.dark.shadowOffset : SHADOWS.light.shadowOffset,
                                shadowOpacity: isDark ? SHADOWS.dark.shadowOpacity : SHADOWS.light.shadowOpacity,
                                shadowRadius: isDark ? SHADOWS.dark.shadowRadius : SHADOWS.light.shadowRadius,
                                elevation: isDark ? SHADOWS.dark.elevation : SHADOWS.light.elevation,
                            },
                        ]) as ViewStyle}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}>
                                        <Timer size={36} color={theme.warning} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.toolTitle, { color: theme.textPrimary }]}>SOS Timers</Text>
                                        <Text style={[styles.toolSubtitleBold, { color: theme.textPrimary }]}>Safety on a schedule.</Text>
                                        <Text style={[styles.toolSubtitle, { color: theme.textSecondary }]}>
                                            Set a countdown for your activity. If you don't check in before it ends, an emergency alert is automatically sent.
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={theme.textSecondary} />
                            </View>
                        </Card>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Geofencing')}
                    >
                        <Card style={StyleSheet.flatten([
                            styles.toolCard,
                            {
                                backgroundColor: isDark ? 'rgba(30, 100, 60, 0.3)' : '#E9FAF0',
                                shadowColor: isDark ? SHADOWS.dark.shadowColor : SHADOWS.light.shadowColor,
                                shadowOffset: isDark ? SHADOWS.dark.shadowOffset : SHADOWS.light.shadowOffset,
                                shadowOpacity: isDark ? SHADOWS.dark.shadowOpacity : SHADOWS.light.shadowOpacity,
                                shadowRadius: isDark ? SHADOWS.dark.shadowRadius : SHADOWS.light.shadowRadius,
                                elevation: isDark ? SHADOWS.dark.elevation : SHADOWS.light.elevation,
                            },
                        ]) as ViewStyle}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}>
                                        <MapPin size={36} color={theme.success} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.toolTitle, { color: theme.textPrimary }]}>Geofencing</Text>
                                        <Text style={[styles.toolSubtitleBold, { color: theme.textPrimary }]}>Virtual boundaries.</Text>
                                        <Text style={[styles.toolSubtitle, { color: theme.textSecondary }]}>
                                            Create safe zones on the map and automatically notify loved ones when you enter or leave a specific area.
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={theme.textSecondary} />
                            </View>
                        </Card>
                    </TouchableOpacity>
                </View>

                <View style={{ height: SPACING.xl }} />
            </ScrollView>

            {/* BottomNav is rendered once in MainTabsScreen */}
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.l,
        paddingBottom: SPACING.l,
    },
    title: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        marginBottom: SPACING.m,
    },
    cardsContainer: {
        gap: SPACING.m,
    },
    toolCard: {
        borderRadius: BORDER_RADIUS.l,
        padding: SPACING.l,
        width: '100%',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardLeft: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'flex-start',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    textContainer: {
        flex: 1,
    },
    toolTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: SPACING.xs,
    },
    toolSubtitleBold: {
        fontSize: FONT_SIZE.s,
        fontWeight: '700',
        marginBottom: 4,
    },
    toolSubtitle: {
        fontSize: FONT_SIZE.s,
        lineHeight: 18,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.xs,
    },
    badge: {
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.s,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
});



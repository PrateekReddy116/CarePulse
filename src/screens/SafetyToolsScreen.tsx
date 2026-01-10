import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ViewStyle, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { Timer, MapPin, ChevronRight, Bluetooth, Users } from 'lucide-react-native';
import { useEmergency } from '../context/EmergencyContext';

type SafetyToolsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SafetyTools'>;

interface Props {
    navigation: SafetyToolsScreenNavigationProp;
}

export const SafetyToolsScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { userProfile } = useEmergency();

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

                    {/* Safety Heatmap */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('SafetyHeatmap')}
                    >
                        <Card style={StyleSheet.flatten([
                            styles.toolCard,
                            {
                                backgroundColor: isDark ? 'rgba(120, 40, 40, 0.3)' : '#FFE8E8',
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
                                        <MapPin size={36} color={theme.danger} />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.toolTitle, { color: theme.textPrimary }]}>Safety Heatmap</Text>
                                        <Text style={[styles.toolSubtitleBold, { color: theme.textPrimary }]}>Community safety reports.</Text>
                                        <Text style={[styles.toolSubtitle, { color: theme.textSecondary }]}>
                                            View and report unsafe locations. Help the community by marking dangerous areas on the map.
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



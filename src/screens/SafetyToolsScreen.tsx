import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ViewStyle } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { Eye, Timer, MapPin, ChevronRight } from 'lucide-react-native';
import { BottomNav } from '../components/BottomNav';

type SafetyToolsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SafetyTools'>;

interface Props {
    navigation: SafetyToolsScreenNavigationProp;
}

export const SafetyToolsScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <ScrollView
                contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
                bounces={false}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.title, { color: theme.textPrimary }]}>Safety Tools</Text>

                <View style={styles.cardsContainer}>
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
});



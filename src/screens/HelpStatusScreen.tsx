import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useEmergency } from '../context/EmergencyContext';
import { useTheme } from '../context/ThemeContext';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react-native';

type HelpStatusScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HelpStatus'>;

interface Props {
    navigation: HelpStatusScreenNavigationProp;
}

export const HelpStatusScreen: React.FC<Props> = ({ navigation }) => {
    const { location, cancelSOS, assignedVolunteers, incidentSummary, userProfile } = useEmergency();
    const { theme, isDark } = useTheme();

    const handleSafe = () => {
        cancelSOS();
        navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
        });
    };

    const primaryVolunteer = assignedVolunteers?.primary;
    const backupCount = assignedVolunteers?.backups.length || 0;

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Help is on the way</Text>
                <View style={[styles.etaBadge, { backgroundColor: theme.surface }]}>
                    <Clock size={14} color={theme.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.eta, { color: theme.primary }]}>ETA: 5 mins</Text>
                </View>
            </View>

            <View style={[styles.mapContainer, { borderColor: theme.border }]}>
                <MapView
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    region={{
                        latitude: location?.coords.latitude || 37.78825,
                        longitude: location?.coords.longitude || -122.4324,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    userInterfaceStyle={isDark ? 'dark' : 'light'}
                >
                    {location && (
                        <Marker
                            coordinate={{
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                            }}
                            title="You"
                        />
                    )}
                    {primaryVolunteer && (
                        <Marker
                            coordinate={{
                                latitude: primaryVolunteer.latitude,
                                longitude: primaryVolunteer.longitude,
                            }}
                            pinColor={theme.primary}
                            title={primaryVolunteer.name}
                            description="Primary Volunteer"
                        />
                    )}
                </MapView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {primaryVolunteer ? (
                    <Card style={styles.card}>
                        <View style={styles.cardHeader}>
                            <CheckCircle size={20} color={theme.success} />
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Volunteer Assigned</Text>
                        </View>
                        <Text style={[styles.volunteerName, { color: theme.textPrimary }]}>{primaryVolunteer.name}</Text>
                        <Text style={[styles.volunteerInfo, { color: theme.textSecondary }]}>
                            {primaryVolunteer.distance ? `${primaryVolunteer.distance.toFixed(2)} km away` : 'Nearby'}
                        </Text>
                        {backupCount > 0 && (
                            <Text style={[styles.backupInfo, { color: theme.textSecondary }]}>+ {backupCount} backup volunteers notified</Text>
                        )}
                    </Card>
                ) : (
                    <Card style={styles.card}>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Searching for volunteers...</Text>
                    </Card>
                )}

                {incidentSummary && (
                    <Card style={[styles.card, { borderLeftColor: incidentSummary.riskLevel === 'HIGH' ? theme.danger : theme.warning, borderLeftWidth: 4 }]}>
                        <View style={styles.cardHeader}>
                            <AlertTriangle size={20} color={incidentSummary.riskLevel === 'HIGH' ? theme.danger : theme.warning} />
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>AI Incident Summary</Text>
                        </View>
                        <View style={[styles.riskBadge, { backgroundColor: incidentSummary.riskLevel === 'HIGH' ? theme.danger + '20' : theme.warning + '20' }]}>
                            <Text style={[styles.riskText, { color: incidentSummary.riskLevel === 'HIGH' ? theme.danger : theme.warning }]}>
                                RISK: {incidentSummary.riskLevel}
                            </Text>
                        </View>
                        <Text style={[styles.summaryText, { color: theme.textPrimary }]}>{incidentSummary.summary}</Text>
                        <Text style={[styles.explanationText, { color: theme.textSecondary }]}>{incidentSummary.explanation}</Text>
                    </Card>
                )}

                <Card style={styles.card}>
                    <Text style={[styles.cardTitle, { color: theme.textPrimary, marginBottom: SPACING.s }]}>My Medical Info</Text>
                    <InfoRow label="Name" value={userProfile.name} theme={theme} />
                    <InfoRow label="Blood Group" value={userProfile.bloodGroup} theme={theme} />
                    <InfoRow label="Conditions" value={userProfile.conditions} theme={theme} />
                    <InfoRow label="Allergies" value={userProfile.allergies} theme={theme} />
                    <InfoRow label="Meds" value={userProfile.medications} theme={theme} />
                </Card>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                <Button
                    title="I AM SAFE"
                    onPress={handleSafe}
                    variant="success"
                    style={styles.safeButton}
                />
            </View>
        </SafeScreen>
    );
};

const InfoRow = ({ label, value, theme }: { label: string, value?: string, theme: any }) => {
    if (!value) return null;
    return (
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{value}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        padding: SPACING.l,
        alignItems: 'center',
    },
    title: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        marginBottom: SPACING.s,
    },
    etaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.round,
    },
    eta: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    mapContainer: {
        height: 200,
        marginHorizontal: SPACING.l,
        marginBottom: SPACING.m,
        borderRadius: BORDER_RADIUS.l,
        overflow: 'hidden',
        borderWidth: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    scrollContent: {
        paddingHorizontal: SPACING.l,
        paddingBottom: 100,
    },
    card: {
        marginBottom: SPACING.m,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginBottom: SPACING.s,
    },
    cardTitle: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    volunteerName: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: 2,
    },
    volunteerInfo: {
        fontSize: FONT_SIZE.m,
    },
    backupInfo: {
        fontSize: FONT_SIZE.s,
        marginTop: SPACING.xs,
    },
    riskBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.s,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.s,
        marginBottom: SPACING.s,
    },
    riskText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
    summaryText: {
        fontSize: FONT_SIZE.m,
        fontWeight: '500',
        marginBottom: SPACING.xs,
        lineHeight: 22,
    },
    explanationText: {
        fontSize: FONT_SIZE.s,
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: FONT_SIZE.s,
    },
    infoValue: {
        fontSize: FONT_SIZE.s,
        fontWeight: '500',
        maxWidth: '70%',
        textAlign: 'right',
    },
    footer: {
        padding: SPACING.l,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
    },
    safeButton: {
        width: '100%',
    },
});

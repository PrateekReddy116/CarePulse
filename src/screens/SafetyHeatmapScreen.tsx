import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Button } from '../components/Button';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { useEmergency } from '../context/EmergencyContext';
import { ChevronLeft, MapPin, AlertTriangle, Shield, AlertCircle } from 'lucide-react-native';
import { OpenStreetMap } from '../components/OpenStreetMap';
import { submitSafetyReport, getSafetyReportsNearby, SafetyReport } from '../services/safetyHeatmapService';

type SafetyHeatmapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SafetyHeatmap'>;

interface Props {
    navigation: SafetyHeatmapScreenNavigationProp;
}

export const SafetyHeatmapScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { location } = useEmergency();
    const [reports, setReports] = useState<SafetyReport[]>([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<'safe' | 'caution' | 'danger'>('caution');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');

    useEffect(() => {
        loadNearbyReports();
    }, [location]);

    const loadNearbyReports = async () => {
        if (!location) return;
        
        const nearbyReports = await getSafetyReportsNearby(
            location.coords.latitude,
            location.coords.longitude,
            10 // 10km radius
        );
        setReports(nearbyReports);
    };

    const handleSubmitReport = async () => {
        if (!location) {
            Alert.alert('Location Required', 'Please enable location services');
            return;
        }

        const report = await submitSafetyReport(
            location.coords.latitude,
            location.coords.longitude,
            selectedLevel,
            description,
            category
        );

        if (report) {
            Alert.alert('Success', 'Safety report submitted successfully');
            setShowReportModal(false);
            setDescription('');
            setCategory('');
            loadNearbyReports();
        } else {
            Alert.alert('Error', 'Failed to submit safety report');
        }
    };

    const getMarkerColor = (level: string) => {
        switch (level) {
            case 'safe': return '#4CAF50';
            case 'caution': return '#FFC107';
            case 'danger': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    const markers = reports.map((report) => ({
        lat: report.latitude,
        lng: report.longitude,
        label: report.safety_level,
        color: getMarkerColor(report.safety_level),
    }));

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Safety Heatmap</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.mapContainer}>
                {location ? (
                    <OpenStreetMap
                        latitude={location.coords.latitude}
                        longitude={location.coords.longitude}
                        markers={markers}
                        zoom={13}
                        isDark={isDark}
                    />
                ) : (
                    <View style={[styles.noLocation, { backgroundColor: theme.surface }]}>
                        <MapPin size={48} color={theme.textSecondary} />
                        <Text style={[styles.noLocationText, { color: theme.textSecondary }]}>
                            Location not available
                        </Text>
                    </View>
                )}
            </View>

            <View style={[styles.legend, { backgroundColor: theme.surface }]}>
                <Text style={[styles.legendTitle, { color: theme.textPrimary }]}>Safety Levels</Text>
                <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Safe</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Caution</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Danger</Text>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Report This Location"
                    onPress={() => setShowReportModal(true)}
                    style={styles.reportButton}
                />
            </View>

            {/* Report Modal */}
            <Modal
                visible={showReportModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReportModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                            Report Safety Level
                        </Text>

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Safety Level</Text>
                        <View style={styles.levelButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.levelButton,
                                    { backgroundColor: selectedLevel === 'safe' ? '#4CAF50' : theme.background }
                                ]}
                                onPress={() => setSelectedLevel('safe')}
                            >
                                <Shield size={20} color="#FFF" />
                                <Text style={styles.levelButtonText}>Safe</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.levelButton,
                                    { backgroundColor: selectedLevel === 'caution' ? '#FFC107' : theme.background }
                                ]}
                                onPress={() => setSelectedLevel('caution')}
                            >
                                <AlertCircle size={20} color="#FFF" />
                                <Text style={styles.levelButtonText}>Caution</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.levelButton,
                                    { backgroundColor: selectedLevel === 'danger' ? '#F44336' : theme.background }
                                ]}
                                onPress={() => setSelectedLevel('danger')}
                            >
                                <AlertTriangle size={20} color="#FFF" />
                                <Text style={styles.levelButtonText}>Danger</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Category (Optional)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.background, color: theme.textPrimary }]}
                            placeholder="e.g., Poor lighting, Harassment"
                            placeholderTextColor={theme.textSecondary}
                            value={category}
                            onChangeText={setCategory}
                        />

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.textArea, { backgroundColor: theme.background, color: theme.textPrimary }]}
                            placeholder="Describe what makes this location unsafe..."
                            placeholderTextColor={theme.textSecondary}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                        />

                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancel"
                                onPress={() => setShowReportModal(false)}
                                variant="outline"
                                style={styles.modalButton}
                            />
                            <Button
                                title="Submit"
                                onPress={handleSubmitReport}
                                style={styles.modalButton}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.m,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
    },
    mapContainer: {
        flex: 1,
        margin: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
        overflow: 'hidden',
    },
    noLocation: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.m,
    },
    noLocationText: {
        marginTop: SPACING.m,
        fontSize: FONT_SIZE.m,
    },
    legend: {
        padding: SPACING.m,
        marginHorizontal: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
    },
    legendTitle: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginBottom: SPACING.s,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: FONT_SIZE.s,
    },
    footer: {
        padding: SPACING.l,
    },
    reportButton: {
        width: '100%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        padding: SPACING.l,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        marginBottom: SPACING.l,
    },
    label: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
    },
    levelButtons: {
        flexDirection: 'row',
        gap: SPACING.s,
        marginBottom: SPACING.m,
    },
    levelButton: {
        flex: 1,
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        alignItems: 'center',
        gap: SPACING.xs,
    },
    levelButtonText: {
        color: '#FFF',
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    input: {
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        fontSize: FONT_SIZE.m,
        marginBottom: SPACING.m,
    },
    textArea: {
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        fontSize: FONT_SIZE.m,
        height: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.m,
        marginTop: SPACING.l,
    },
    modalButton: {
        flex: 1,
    },
});

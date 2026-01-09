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
    Modal,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { StackNavigationProp } from '@react-navigation/stack';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { useEmergency } from '../context/EmergencyContext';
import { ChevronLeft, MapPin, Plus, Trash2, Edit2, Bell, BellOff } from 'lucide-react-native';
import { lightMapStyle, darkMapStyle } from '../constants/mapStyles';
import {
    createGeofence,
    updateGeofence,
    deleteGeofence,
    getAllGeofences,
    startGeofenceMonitoring,
    stopGeofenceMonitoring,
} from '../services/geofencingService';
import type { Geofence } from '../services/geofencingService';

type GeofencingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Geofencing'>;

interface Props {
    navigation: GeofencingScreenNavigationProp;
}

export const GeofencingScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { location } = useEmergency();
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
    const [name, setName] = useState('');
    const [radius, setRadius] = useState('500');
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const modalScale = useRef(new Animated.Value(0.9)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadGeofences();
        startGeofenceMonitoring();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        return () => {
            stopGeofenceMonitoring();
        };
    }, []);

    useEffect(() => {
        if (showAddModal || editingGeofence) {
            Animated.parallel([
                Animated.spring(modalScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(modalOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            modalScale.setValue(0.9);
            modalOpacity.setValue(0);
        }
    }, [showAddModal, editingGeofence]);

    const loadGeofences = async () => {
        try {
            const allGeofences = await getAllGeofences();
            setGeofences(allGeofences);
        } catch (error) {
            console.error('Failed to load geofences:', error);
        }
    };

    const handleMapPress = (event: any) => {
        if (showAddModal || editingGeofence) {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            setSelectedLocation({ latitude, longitude });
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a name for the geofence');
            return;
        }

        const radiusMeters = parseInt(radius, 10);
        if (!radiusMeters || radiusMeters < 50 || radiusMeters > 5000) {
            Alert.alert('Error', 'Radius must be between 50 and 5000 meters');
            return;
        }

        if (!selectedLocation) {
            Alert.alert('Error', 'Please select a location on the map');
            return;
        }

        try {
            if (editingGeofence) {
                await updateGeofence(editingGeofence.id, {
                    ...editingGeofence,
                    name: name.trim(),
                    radius: radiusMeters,
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                });
            } else {
                await createGeofence({
                    name: name.trim(),
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                    radius: radiusMeters,
                    isActive: true,
                    notifyOnEnter: true,
                    notifyOnExit: true,
                });
            }

            await loadGeofences();
            setShowAddModal(false);
            setEditingGeofence(null);
            setName('');
            setRadius('500');
            setSelectedLocation(null);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save geofence');
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert(
            'Delete Geofence?',
            'Are you sure you want to delete this geofence?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteGeofence(id);
                            await loadGeofences();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete geofence');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleActive = async (geofence: Geofence) => {
        try {
            await updateGeofence(geofence.id, { isActive: !geofence.isActive });
            await loadGeofences();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update geofence');
        }
    };

    const openEditModal = (geofence: Geofence) => {
        setEditingGeofence(geofence);
        setName(geofence.name);
        setRadius(geofence.radius.toString());
        setSelectedLocation({ latitude: geofence.latitude, longitude: geofence.longitude });
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingGeofence(null);
        setName('');
        setRadius('500');
        setSelectedLocation(null);
    };

    const initialRegion = {
        latitude: location?.coords.latitude || 37.78825,
        longitude: location?.coords.longitude || -122.4324,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
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
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Geofencing</Text>
                <TouchableOpacity
                    onPress={() => {
                        setEditingGeofence(null);
                        setName('');
                        setRadius('500');
                        setSelectedLocation(location ? {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        } : null);
                        setShowAddModal(true);
                    }}
                    style={styles.addButton}
                >
                    <Plus size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Map */}
                <View style={styles.mapContainer}>
                    <MapView
                        provider={PROVIDER_DEFAULT}
                        style={styles.map}
                        initialRegion={initialRegion}
                        region={location ? {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        } : undefined}
                        showsUserLocation
                        onPress={handleMapPress}
                        userInterfaceStyle={isDark ? 'dark' : 'light'}
                        customMapStyle={Platform.OS === 'android' ? (isDark ? darkMapStyle : lightMapStyle) : undefined}
                    >
                    {geofences.map((geofence) => (
                        <React.Fragment key={geofence.id}>
                            <Circle
                                center={{
                                    latitude: geofence.latitude,
                                    longitude: geofence.longitude,
                                }}
                                radius={geofence.radius}
                                fillColor={geofence.isActive ? theme.primary + '30' : theme.textSecondary + '20'}
                                strokeColor={geofence.isActive ? theme.primary : theme.textSecondary}
                                strokeWidth={2}
                            />
                            <Marker
                                coordinate={{
                                    latitude: geofence.latitude,
                                    longitude: geofence.longitude,
                                }}
                                title={geofence.name}
                                pinColor={geofence.isActive ? theme.primary : theme.textSecondary}
                            />
                        </React.Fragment>
                    ))}
                    {selectedLocation && (
                        <Marker
                            coordinate={selectedLocation}
                            pinColor={theme.primary}
                        />
                    )}
                    </MapView>
                </View>

                {/* Geofences List */}
                <ScrollView
                    style={styles.listContainer}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {geofences.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MapPin size={48} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No geofences yet.{'\n'}Tap + to create one.
                            </Text>
                        </View>
                    ) : (
                        geofences.map((geofence) => (
                            <View
                                key={geofence.id}
                                style={[
                                    styles.geofenceCard,
                                    {
                                        backgroundColor: theme.surface,
                                        borderColor: theme.border,
                                        ...(isDark ? SHADOWS.dark : SHADOWS.light),
                                    },
                                ]}
                            >
                                <View style={styles.geofenceHeader}>
                                    <View style={styles.geofenceInfo}>
                                        <Text style={[styles.geofenceName, { color: theme.textPrimary }]}>
                                            {geofence.name}
                                        </Text>
                                        <Text style={[styles.geofenceDetails, { color: theme.textSecondary }]}>
                                            {geofence.radius}m radius
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleToggleActive(geofence)}
                                        style={[
                                            styles.toggleButton,
                                            {
                                                backgroundColor: geofence.isActive
                                                    ? theme.success + '20'
                                                    : theme.textSecondary + '20',
                                            },
                                        ]}
                                    >
                                        {geofence.isActive ? (
                                            <Bell size={20} color={theme.success} />
                                        ) : (
                                            <BellOff size={20} color={theme.textSecondary} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.geofenceActions}>
                                    <TouchableOpacity
                                        onPress={() => openEditModal(geofence)}
                                        style={styles.actionButton}
                                    >
                                        <Edit2 size={18} color={theme.primary} />
                                        <Text style={[styles.actionText, { color: theme.primary }]}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(geofence.id)}
                                        style={styles.actionButton}
                                    >
                                        <Trash2 size={18} color={theme.danger} />
                                        <Text style={[styles.actionText, { color: theme.danger }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </Animated.View>

            {/* Add/Edit Modal */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="none"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: theme.surface,
                                transform: [{ scale: modalScale }],
                                opacity: modalOpacity,
                            },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                                {editingGeofence ? 'Edit Geofence' : 'New Geofence'}
                            </Text>
                            <TouchableOpacity onPress={closeModal}>
                                <Text style={[styles.modalClose, { color: theme.primary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>Name</Text>
                        <TextInput
                            style={[
                                styles.modalInput,
                                {
                                    backgroundColor: theme.background,
                                    color: theme.textPrimary,
                                    borderColor: theme.border,
                                },
                            ]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter geofence name"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={[styles.modalLabel, { color: theme.textPrimary, marginTop: SPACING.m }]}>
                            Radius (meters)
                        </Text>
                        <TextInput
                            style={[
                                styles.modalInput,
                                {
                                    backgroundColor: theme.background,
                                    color: theme.textPrimary,
                                    borderColor: theme.border,
                                },
                            ]}
                            value={radius}
                            onChangeText={setRadius}
                            placeholder="500"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                        />

                        <Text style={[styles.modalHint, { color: theme.textSecondary }]}>
                            Tap on the map to select location
                        </Text>

                        <TouchableOpacity
                            onPress={handleSave}
                            style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                        >
                            <Text style={styles.modalSaveText}>Save</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>
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
    addButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    mapContainer: {
        height: 300,
        marginBottom: SPACING.m,
    },
    map: {
        flex: 1,
    },
    listContainer: {
        maxHeight: 300,
    },
    listContent: {
        padding: SPACING.l,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xxl,
    },
    emptyText: {
        fontSize: FONT_SIZE.s,
        textAlign: 'center',
        marginTop: SPACING.m,
        lineHeight: 20,
    },
    geofenceCard: {
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
    },
    geofenceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    geofenceInfo: {
        flex: 1,
    },
    geofenceName: {
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
        marginBottom: 2,
    },
    geofenceDetails: {
        fontSize: FONT_SIZE.s,
    },
    toggleButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    geofenceActions: {
        flexDirection: 'row',
        gap: SPACING.m,
        marginTop: SPACING.s,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: BORDER_RADIUS.l,
        padding: SPACING.l,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    modalTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
    },
    modalClose: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    modalLabel: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    modalInput: {
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
        fontSize: FONT_SIZE.m,
        borderWidth: 1,
    },
    modalHint: {
        fontSize: FONT_SIZE.xs,
        marginTop: SPACING.s,
        fontStyle: 'italic',
    },
    modalSaveButton: {
        borderRadius: BORDER_RADIUS.m,
        paddingVertical: SPACING.m,
        alignItems: 'center',
        marginTop: SPACING.l,
    },
    modalSaveText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
    },
});


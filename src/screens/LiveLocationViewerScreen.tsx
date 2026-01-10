import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MapPlaceholder } from '../components/MapPlaceholder';
import { StackNavigationProp } from '@react-navigation/stack';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, MapPin, Navigation as NavigationIcon, XCircle } from 'lucide-react-native';
import {
    getLiveLocationWS,
    LocationUpdate,
} from '../services/liveLocationService';

type LiveLocationViewerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LiveLocationViewer'>;

interface Props {
    navigation: LiveLocationViewerScreenNavigationProp;
    route: {
        params: {
            sessionId: string;
            volunteerName?: string;
        };
    };
}

export const LiveLocationViewerScreen: React.FC<Props> = ({ navigation, route }) => {
    const { theme, isDark } = useTheme();
    const { sessionId, volunteerName = 'Volunteer' } = route.params;

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const markerScaleAnim = useRef(new Animated.Value(1)).current;
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        connectToLiveLocation();

        return () => {
            const ws = getLiveLocationWS();
            ws.unsubscribeFromLiveLocation(sessionId);
            // Don't disconnect here - other screens might be using the WebSocket
        };
    }, [sessionId]);

    useEffect(() => {
        if (location && mapRef.current) {
            // Animate marker
            Animated.sequence([
                Animated.timing(markerScaleAnim, {
                    toValue: 1.3,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(markerScaleAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Smoothly move map to new location
            mapRef.current.animateToRegion({
                latitude: location.lat,
                longitude: location.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    }, [location]);

    const connectToLiveLocation = async () => {
        try {
            setError(null);
            const ws = getLiveLocationWS();

            // Setup event handlers BEFORE connecting
            ws.onLocationUpdate((update: LocationUpdate) => {
                if (update.sessionId === sessionId) {
                    setLocation({ lat: update.lat, lng: update.lng });
                    setLastUpdate(new Date(update.timestamp));
                    setIsConnected(true);
                    setError(null);
                }
            });

            ws.onSessionEnded((endedSessionId: string) => {
                if (endedSessionId === sessionId) {
                    setIsConnected(false);
                    Alert.alert(
                        'Session Ended',
                        `${volunteerName} has stopped sharing their location.`,
                        [
                            {
                                text: 'OK',
                                onPress: () => navigation.goBack(),
                            },
                        ]
                    );
                }
            });

            ws.onConnected(() => {
                setIsConnected(true);
                setError(null);
                // Subscribe to live location after connection is established
                ws.subscribeToLiveLocation(sessionId);
            });

            ws.onDisconnected(() => {
                setIsConnected(false);
            });

            ws.onError((error: Error) => {
                console.error('WebSocket error in viewer:', error);
                setError(error.message || 'Connection error');
                setIsConnected(false);
            });

            // Connect to WebSocket (this will trigger onConnected callback)
            ws.connect();
        } catch (error: any) {
            console.error('Failed to connect to live location:', error);
            setError(error.message || 'Failed to connect');
        }
    };

    const formatLastUpdate = (date: Date | null) => {
        if (!date) return 'Never';
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 5) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    const initialRegion = location
        ? {
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }
        : {
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                        {volunteerName}'s Location
                    </Text>
                    <View style={styles.headerStatus}>
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: isConnected ? theme.success : theme.textSecondary },
                            ]}
                        />
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                            {isConnected ? 'Live' : 'Connecting...'}
                            {lastUpdate && ` • ${formatLastUpdate(lastUpdate)}`}
                        </Text>
                    </View>
                </View>

                <View style={{ width: 40 }} />
            </View>

            {/* Map */}
            <Animated.View style={[styles.mapContainer, { opacity: fadeAnim }]}>
                <MapPlaceholder
                    latitude={location?.lat}
                    longitude={location?.lng}
                    style={styles.map}
                />

                {/* Loading Overlay */}
                {!location && !error && (
                    <View style={[styles.loadingOverlay, { backgroundColor: theme.background + 'CC' }]}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                            Connecting to live location...
                        </Text>
                    </View>
                )}

                {/* Error Overlay */}
                {error && (
                    <View style={[styles.errorOverlay, { backgroundColor: theme.background + 'CC' }]}>
                        <XCircle size={48} color={theme.danger} />
                        <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Connection Error</Text>
                        <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
                        <TouchableOpacity
                            onPress={connectToLiveLocation}
                            style={[styles.retryButton, { backgroundColor: theme.primary }]}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Animated.View>

            {/* Info Card */}
            {location && (
                <View
                    style={[
                        styles.infoCard,
                        {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                            ...(isDark ? SHADOWS.dark : SHADOWS.light),
                        },
                    ]}
                >
                    <View style={styles.infoRow}>
                        <MapPin size={18} color={theme.primary} />
                        <View style={styles.infoText}>
                            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Current Location</Text>
                            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                            </Text>
                        </View>
                    </View>
                    {lastUpdate && (
                        <View style={[styles.infoRow, styles.infoRowLast]}>
                            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                                Last updated: {formatLastUpdate(lastUpdate)}
                            </Text>
                        </View>
                    )}
                </View>
            )}
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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    headerStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    headerSubtitle: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
    },
    mapContainer: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.m,
    },
    loadingText: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.m,
        padding: SPACING.xl,
    },
    errorTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
    },
    errorText: {
        fontSize: FONT_SIZE.s,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryButton: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        marginTop: SPACING.s,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
    },
    infoCard: {
        position: 'absolute',
        bottom: SPACING.l,
        left: SPACING.l,
        right: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
        borderWidth: StyleSheet.hairlineWidth,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    infoRowLast: {
        marginTop: SPACING.xs,
        paddingLeft: 26, // Align with icon
    },
    infoText: {
        flex: 1,
    },
    infoLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
});

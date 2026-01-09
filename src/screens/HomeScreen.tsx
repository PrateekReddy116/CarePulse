import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useEmergency } from '../context/EmergencyContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomNav } from '../components/BottomNav';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
    navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const { location, triggerSOS, userProfile } = useEmergency();
    const { theme, isDark } = useTheme();

    const avatars = [
        {
            id: 'police',
            avatar: 'https://citizen.mahapolice.gov.in/Citizen/Images/DGoffice.gif',
        },
        {
            id: 'ambulance',
            avatar: 'https://amcarehospital.com/wp-content/uploads/2023/12/Are-Hospitals-Making-as-Much-Money-as-You-Think1.jpg',
        },
        {
            id: 'fire',
            avatar: 'https://media.gettyimages.com/id/183321983/photo/fire-truck.jpg?s=612x612&w=gi&k=20&c=g1Ej4JCrwUpLfjuIv3x1cuhJm9N-rgZWMxwl_fxPkKE=',
        },
    ];

    // Pulse Animation Values
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const startPulse = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        startPulse();
    }, [pulseAnim]);

    const handleSOSPress = () => {
        triggerSOS();
        navigation.navigate('SOSActivation');
    };

    const initialRegion = {
        latitude: location?.coords.latitude || 37.78825,
        longitude: location?.coords.longitude || -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    return (
        <SafeScreen
            style={{
                flex: 1,
                backgroundColor: theme.background,
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
            }}
        >
            <View style={{ flex: 1 }}>
                <MapView
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    region={location ? {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    } : initialRegion}
                    showsUserLocation
                    followsUserLocation
                    userInterfaceStyle={isDark ? 'dark' : 'light'}
                >
                    {location && (
                        <Marker
                            coordinate={{
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                            }}
                            title="You are here"
                        />
                    )}
                </MapView>

                {/* Top gradient with greeting and avatars */}
                <LinearGradient
                    colors={
                        isDark
                            ? ['rgba(0,0,0,0.96)', 'rgba(0,0,0,0.0)']
                            : ['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.0)']
                    }
                    style={styles.topGradient}
                >
                    <View style={styles.header}>
                        <Text style={[styles.status, { color: theme.textPrimary }]}>
                            Hello, {userProfile.name || 'John'}!
                        </Text>
                    </View>
                    <View style={styles.avatarRow}>
                        {avatars.map((item) => (
                            <View key={item.id} style={styles.avatarBubble}>
                                <Image
                                    source={{ uri: item.avatar }}
                                    style={[
                                        styles.avatarImage,
                                        { borderColor: isDark ? theme.surface : '#FFFFFF' }
                                    ]}
                                />
                                <View style={[
                                    styles.statusDot,
                                    { borderColor: isDark ? theme.background : '#FFFFFF' }
                                ]} />
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                {/* Bottom gradient with SOS and footer */}
                <LinearGradient
                    colors={
                        isDark
                            ? ['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.96)']
                            : ['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.96)']
                    }
                    style={styles.bottomGradient}
                >
                    <View style={styles.sosContainer}>
                        <View style={[styles.pulseContainer]}>
                            <Animated.View
                                style={[
                                    styles.pulseCircle,
                                    {
                                        backgroundColor: theme.danger,
                                        transform: [{ scale: pulseAnim }],
                                        opacity: 0.3,
                                    },
                                ]}
                            />
                            <TouchableOpacity
                                style={[styles.sosButton, { backgroundColor: theme.danger }]}
                                onPress={handleSOSPress}
                                activeOpacity={0.9}
                            >
                                <View style={styles.sosInner}>
                                    <Text style={styles.sosText}>SOS</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.footer}>
                        <Text style={[styles.footerCaption, { color: theme.textSecondary }]}>
                            Your SOS will be sent to 4 people
                        </Text>
                    </View>
                </LinearGradient>

                {/* BottomNav is rendered once in MainTabsScreen */}
            </View>
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.l,
        paddingBottom: SPACING.s,
    },
    status: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    avatarRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.s,
        gap: SPACING.s,
    },
    avatarBubble: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#28CD41',
        position: 'absolute',
        bottom: -1,
        right: 2,
        borderWidth: 2,
    },
    mapContainer: {
        height: 220,
        marginHorizontal: SPACING.l,
        marginTop: SPACING.s,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    topGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        paddingTop: SPACING.xl * 2,
        paddingBottom: SPACING.xl * 2.5,
    },
    bottomGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: SPACING.l,
        paddingBottom: SPACING.xl * 2.2,
    },
    sosContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.l,
    },
    pulseContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 240,
        height: 240,
    },
    pulseCircle: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    sosButton: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
    },
    sosInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosText: {
        fontSize: 40,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    footer: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    footerCaption: {
        fontSize: FONT_SIZE.s,
    },
});

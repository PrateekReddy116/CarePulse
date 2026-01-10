import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image, Modal, ScrollView } from 'react-native';
import { OpenStreetMap } from '../components/OpenStreetMap';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useEmergency } from '../context/EmergencyContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, X } from 'lucide-react-native';
import { getUnreadSOSNotifications, markNotificationAsRead, SOSNotification } from '../services/sosNotificationService';
import { useFocusEffect } from '@react-navigation/native';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
    navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const { location, triggerSOS, userProfile } = useEmergency();
    const { theme, isDark } = useTheme();
    const [notifications, setNotifications] = useState<SOSNotification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

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

    // Load notifications when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            loadNotifications();
            const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
            return () => clearInterval(interval);
        }, [userProfile.phone])
    );

    const loadNotifications = async () => {
        if (!userProfile.phone) return;
        const unread = await getUnreadSOSNotifications(userProfile.phone);
        setNotifications(unread);
    };

    const handleNotificationPress = async (notification: SOSNotification) => {
        await markNotificationAsRead(notification.id, userProfile.phone);
        setShowNotifications(false);
        loadNotifications();
        // You can navigate to a detail screen or show location on map
    };

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
                {location ? (
                    <OpenStreetMap
                        latitude={location.coords.latitude}
                        longitude={location.coords.longitude}
                        markers={[]}
                        zoom={15}
                        isDark={isDark}
                        style={styles.map}
                    />
                ) : (
                    <View style={[styles.noLocation, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.noLocationText, { color: theme.textSecondary }]}>
                            Loading location...
                        </Text>
                    </View>
                )}

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
                        <TouchableOpacity
                            style={[styles.notificationButton, { backgroundColor: theme.surface }]}
                            onPress={() => setShowNotifications(true)}
                        >
                            <Bell size={24} color={theme.textPrimary} />
                            {notifications.length > 0 && (
                                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                                    <Text style={styles.badgeText}>{notifications.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
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

            {/* Notifications Modal */}
            <Modal
                visible={showNotifications}
                transparent
                animationType="slide"
                onRequestClose={() => setShowNotifications(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                                SOS Notifications
                            </Text>
                            <TouchableOpacity onPress={() => setShowNotifications(false)}>
                                <X size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.notificationsList}>
                            {notifications.length === 0 ? (
                                <Text style={[styles.noNotifications, { color: theme.textSecondary }]}>
                                    No new notifications
                                </Text>
                            ) : (
                                notifications.map((notification) => (
                                    <TouchableOpacity
                                        key={notification.id}
                                        style={[styles.notificationItem, { backgroundColor: theme.background }]}
                                        onPress={() => handleNotificationPress(notification)}
                                    >
                                        <View style={[styles.notificationDot, { backgroundColor: theme.danger }]} />
                                        <View style={styles.notificationContent}>
                                            <Text style={[styles.notificationTitle, { color: theme.textPrimary }]}>
                                                {notification.sender_name}
                                            </Text>
                                            <Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>
                                                {notification.message}
                                            </Text>
                                            <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
                                                {new Date(notification.created_at).toLocaleString()}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.l,
        paddingBottom: SPACING.s,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    status: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    noLocation: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noLocationText: {
        fontSize: FONT_SIZE.m,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    modalTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
    },
    notificationsList: {
        padding: SPACING.l,
    },
    noNotifications: {
        textAlign: 'center',
        padding: SPACING.xl,
        fontSize: FONT_SIZE.m,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        marginBottom: SPACING.s,
        gap: SPACING.m,
    },
    notificationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: FONT_SIZE.s,
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: FONT_SIZE.xs,
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

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { Bluetooth, ChevronLeft, CheckCircle, XCircle } from 'lucide-react-native';

type SathiScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Sathi'>;

interface Props {
    navigation: SathiScreenNavigationProp;
}

export const SathiScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const [isScanning, setIsScanning] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [deviceName, setDeviceName] = useState<string | null>(null);

    const handleScanForDevices = async () => {
        setIsScanning(true);
        // TODO: Implement BLE scanning for ESP32 devices
        // This will require react-native-ble-plx or similar library
        // For now, show a placeholder message
        setTimeout(() => {
            setIsScanning(false);
            Alert.alert(
                'BLE Scanning',
                'BLE functionality requires a development build. This feature will be available in the production version.',
                [{ text: 'OK' }]
            );
        }, 2000);
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setDeviceName(null);
        Alert.alert('Disconnected', 'ESP32 device has been disconnected.');
    };

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Sathi</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.infoHeader}>
                        <Bluetooth size={32} color={theme.primary} />
                        <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>ESP32 BLE Connection</Text>
                    </View>
                    <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Connect your ESP32 device via Bluetooth Low Energy to receive real-time safety data, sensor readings, and emergency alerts directly to your phone.
                    </Text>
                </Card>

                {isConnected ? (
                    <Card style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.success }]}>
                        <View style={styles.statusHeader}>
                            <CheckCircle size={24} color={theme.success} />
                            <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Connected</Text>
                        </View>
                        <Text style={[styles.deviceName, { color: theme.textSecondary }]}>
                            Device: {deviceName || 'ESP32-Sathi'}
                        </Text>
                        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                            Your ESP32 device is paired and connected. You're receiving real-time data.
                        </Text>
                        <Button
                            title="Disconnect"
                            onPress={handleDisconnect}
                            variant="outline"
                            style={styles.disconnectButton}
                        />
                    </Card>
                ) : (
                    <Card style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.statusHeader}>
                            <XCircle size={24} color={theme.textSecondary} />
                            <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Not Connected</Text>
                        </View>
                        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                            Scan for nearby ESP32 devices to pair and connect.
                        </Text>
                        <Button
                            title={isScanning ? 'Scanning...' : 'Scan for Devices'}
                            onPress={handleScanForDevices}
                            loading={isScanning}
                            style={styles.scanButton}
                        />
                    </Card>
                )}

                <Card style={[styles.featuresCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.featuresTitle, { color: theme.textPrimary }]}>Features</Text>
                    <View style={styles.featureItem}>
                        <Text style={[styles.featureBullet, { color: theme.primary }]}>•</Text>
                        <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                            Real-time sensor data (temperature, motion, etc.)
                        </Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Text style={[styles.featureBullet, { color: theme.primary }]}>•</Text>
                        <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                            Emergency button triggers from ESP32
                        </Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Text style={[styles.featureBullet, { color: theme.primary }]}>•</Text>
                        <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                            Automatic SOS alerts when device detects danger
                        </Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Text style={[styles.featureBullet, { color: theme.primary }]}>•</Text>
                        <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                            Low battery and connection status notifications
                        </Text>
                    </View>
                </Card>

                <View style={styles.noteCard}>
                    <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                        Note: BLE functionality requires a development build. This feature is not available in Expo Go.
                    </Text>
                </View>
            </ScrollView>
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
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
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
    content: {
        padding: SPACING.l,
    },
    infoCard: {
        padding: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.m,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
        gap: SPACING.m,
    },
    infoTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
    },
    infoText: {
        fontSize: FONT_SIZE.m,
        lineHeight: 22,
    },
    statusCard: {
        padding: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 2,
        marginBottom: SPACING.m,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
        gap: SPACING.s,
    },
    statusTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
    },
    deviceName: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginBottom: SPACING.s,
    },
    statusText: {
        fontSize: FONT_SIZE.m,
        lineHeight: 20,
        marginBottom: SPACING.m,
    },
    scanButton: {
        marginTop: SPACING.s,
    },
    disconnectButton: {
        marginTop: SPACING.s,
    },
    featuresCard: {
        padding: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.m,
    },
    featuresTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: SPACING.m,
    },
    featureItem: {
        flexDirection: 'row',
        marginBottom: SPACING.s,
        alignItems: 'flex-start',
    },
    featureBullet: {
        fontSize: FONT_SIZE.l,
        marginRight: SPACING.s,
        fontWeight: '700',
    },
    featureText: {
        flex: 1,
        fontSize: FONT_SIZE.m,
        lineHeight: 20,
    },
    noteCard: {
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        marginTop: SPACING.s,
    },
    noteText: {
        fontSize: FONT_SIZE.s,
        lineHeight: 18,
        fontStyle: 'italic',
    },
});

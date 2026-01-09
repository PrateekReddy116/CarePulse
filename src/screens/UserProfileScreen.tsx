import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SPACING, FONT_SIZE } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { saveProfile, initialProfile } from '../services/profileService';
import { useTheme } from '../context/ThemeContext';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

type UserProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'UserProfile'>;

interface Props {
    navigation: UserProfileScreenNavigationProp;
}

export const UserProfileScreen: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name || !contactName || !contactPhone) {
            alert('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // Request permissions
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            const { status: notificationStatus } = await Notifications.requestPermissionsAsync();

            if (locationStatus !== 'granted' || notificationStatus !== 'granted') {
                alert('Permissions are required for the app to function.');
                setLoading(false);
                return;
            }

            // Save initial profile
            const newProfile = {
                ...initialProfile,
                name,
                contacts: [{
                    id: '1',
                    name: contactName,
                    phone: contactPhone,
                    relationship: 'Emergency Contact',
                    isPrimary: true,
                }]
            };
            await saveProfile(newProfile);

            navigation.replace('Home');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Setup Profile</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    We need a few details to help you in emergencies.
                </Text>

                <View style={styles.form}>
                    <Input
                        label="Your Full Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="John Doe"
                    />

                    <View style={styles.divider} />
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Emergency Contact</Text>

                    <Input
                        label="Contact Name"
                        value={contactName}
                        onChangeText={setContactName}
                        placeholder="Jane Doe"
                    />
                    <Input
                        label="Phone Number"
                        value={contactPhone}
                        onChangeText={setContactPhone}
                        placeholder="+1 234 567 890"
                        keyboardType="phone-pad"
                    />
                </View>

                <Button
                    title="Complete Setup"
                    onPress={handleSave}
                    loading={loading}
                    style={styles.button}
                />
            </ScrollView>
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: SPACING.l,
        flexGrow: 1,
    },
    title: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: FONT_SIZE.m,
        marginBottom: SPACING.xl,
        lineHeight: 22,
    },
    form: {
        marginBottom: SPACING.xl,
    },
    divider: {
        height: SPACING.l,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: SPACING.m,
        letterSpacing: 0.5,
    },
    button: {
        marginTop: 'auto',
    },
});

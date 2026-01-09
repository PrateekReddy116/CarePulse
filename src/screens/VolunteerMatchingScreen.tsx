import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useEmergency } from '../context/EmergencyContext';
import { useTheme } from '../context/ThemeContext';
import { UserCheck } from 'lucide-react-native';
import { BottomNav } from '../components/BottomNav';

type VolunteerMatchingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VolunteerMatching'>;

interface Props {
    navigation: VolunteerMatchingScreenNavigationProp;
}

export const VolunteerMatchingScreen: React.FC<Props> = ({ navigation }) => {
    const { activeVolunteers, confirmVolunteer } = useEmergency();
    const { theme } = useTheme();
    const [isSearching, setIsSearching] = useState(true);

    useEffect(() => {
        // Simulate search delay
        const timer = setTimeout(() => {
            setIsSearching(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleConfirm = (volunteerId: string) => {
        confirmVolunteer(volunteerId);
        navigation.replace('HelpStatus');
    };

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>Nearby Volunteers</Text>
                    {isSearching && <ActivityIndicator color={theme.primary} style={{ marginTop: SPACING.m }} />}
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {!isSearching && activeVolunteers.length === 0 && (
                        <Text style={[styles.noVolunteers, { color: theme.textSecondary }]}>No volunteers found nearby.</Text>
                    )}

                    {activeVolunteers.map((volunteer) => (
                        <Card key={volunteer.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.avatar, { backgroundColor: theme.surface }]}>
                                    <UserCheck size={24} color={theme.primary} />
                                </View>
                                <View style={styles.info}>
                                    <Text style={[styles.name, { color: theme.textPrimary }]}>{volunteer.name}</Text>
                                    <Text style={[styles.distance, { color: theme.textSecondary }]}>
                                        {volunteer.distance ? `${volunteer.distance.toFixed(1)} km away` : 'Nearby'}
                                    </Text>
                                </View>
                            </View>
                            <Button
                                title="Request Help"
                                onPress={() => handleConfirm(volunteer.id)}
                                style={styles.button}
                            />
                        </Card>
                    ))}
                </ScrollView>
            </View>

            <BottomNav navigation={navigation} active="VolunteerMatching" />
        </SafeScreen>
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
    },
    content: {
        padding: SPACING.l,
    },
    noVolunteers: {
        textAlign: 'center',
        fontSize: FONT_SIZE.m,
        marginTop: SPACING.xl,
    },
    card: {
        marginBottom: SPACING.m,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: FONT_SIZE.l,
        fontWeight: '600',
    },
    distance: {
        fontSize: FONT_SIZE.m,
    },
    button: {
        width: '100%',
    },
});

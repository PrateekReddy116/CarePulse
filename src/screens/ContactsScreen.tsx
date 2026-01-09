import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { StackNavigationProp, useFocusEffect } from '@react-navigation/native';
import { SafeScreen } from '../components/SafeScreen';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { useEmergency } from '../context/EmergencyContext';
import { Phone, Users, Plus, Search } from 'lucide-react-native';
import { BottomNav } from '../components/BottomNav';

type ContactsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Contacts'>;

interface Props {
    navigation: ContactsScreenNavigationProp;
}

export const ContactsScreen: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme();
    const { userProfile, reloadProfile } = useEmergency();

    // Reload profile when screen comes into focus to get latest contacts
    useFocusEffect(
        React.useCallback(() => {
            reloadProfile();
        }, [reloadProfile])
    );

    const emergencyContacts = [
        {
            id: 'police',
            name: 'Police',
            phone: '100',
            avatar: 'https://citizen.mahapolice.gov.in/Citizen/Images/DGoffice.gif',
        },
        {
            id: 'ambulance',
            name: 'Ambulance',
            phone: '108',
            avatar: 'https://amcarehospital.com/wp-content/uploads/2023/12/Are-Hospitals-Making-as-Much-Money-as-You-Think1.jpg',
        },
        {
            id: 'fire',
            name: 'Fire Department',
            phone: '101',
            avatar: 'https://media.gettyimages.com/id/183321983/photo/fire-truck.jpg?s=612x612&w=gi&k=20&c=g1Ej4JCrwUpLfjuIv3x1cuhJm9N-rgZWMxwl_fxPkKE=',
        },
    ];

    const userContacts = userProfile.contacts || [];
    const combinedContacts = [
        ...emergencyContacts,
        ...userContacts,
    ];

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Contacts</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('SearchUsers')}
                        style={styles.searchButton}
                    >
                        <Search size={20} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('ProfileHealth')}>
                        <Text style={[styles.viewAll, { color: theme.textPrimary }]}>View all</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.sectionHeaderTop}>
                    <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>My Contacts</Text>
                </View>
                {combinedContacts.map((contact) => (
                    <TouchableOpacity
                        key={contact.id}
                        onPress={() => navigation.navigate('Chat', { contact: { ...contact, phone: (contact as any).phone || '' } })}
                    >
                        <Card style={styles.contactCard}>
                            <View style={styles.avatar}>
                                {'avatar' in contact ? (
                                    <Image source={{ uri: (contact as any).avatar }} style={styles.avatarImage} />
                                ) : (
                                    <View style={[styles.avatarFallback, { backgroundColor: theme.surface }]}>
                                        <Phone size={20} color={theme.primary} />
                                    </View>
                                )}
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={[styles.contactName, { color: theme.textPrimary }]}>{contact.name}</Text>
                                <Text style={[styles.contactPhone, { color: theme.textSecondary }]}>{(contact as any).phone}</Text>
                            </View>
                            <View>
                                <Text style={[styles.more, { color: theme.textSecondary }]}>→</Text>
                            </View>
                        </Card>
                    </TouchableOpacity>
                ))}

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>My Communities</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Communities')}>
                        <Text style={[styles.viewAll, { color: theme.textPrimary }]}>View all</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.communityRow}>
                    <Card style={[styles.communityCard, { backgroundColor: theme.surface }]}>
                        <View style={[styles.communityIcon, { backgroundColor: '#FFEFE4' }]}>
                            <Users size={20} color={theme.primary} />
                        </View>
                        <Text style={[styles.communityName, { color: theme.textPrimary }]}>Family</Text>
                        <Text style={[styles.communityCount, { color: theme.textSecondary }]}>+7 people</Text>
                    </Card>
                    <Card style={[styles.communityCard, { backgroundColor: theme.surface }]}>
                        <View style={[styles.communityIcon, { backgroundColor: '#EAF5FF' }]}>
                            <Users size={20} color={theme.secondary} />
                        </View>
                        <Text style={[styles.communityName, { color: theme.textPrimary }]}>Office</Text>
                        <Text style={[styles.communityCount, { color: theme.textSecondary }]}>+21 people</Text>
                    </Card>
                </View>
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}
                onPress={() => navigation.navigate('ProfileHealth')}
                activeOpacity={0.9}
            >
                <Plus size={22} color={theme.white} />
            </TouchableOpacity>

            {/* BottomNav is rendered once in MainTabsScreen */}
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.l,
        paddingBottom: SPACING.s,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
    },
    searchButton: {
        padding: SPACING.xs,
    },
    title: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
    },
    viewAll: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.xxl,
    },
    sectionHeaderTop: {
        marginBottom: SPACING.s,
    },
    sectionLabel: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.l,
        marginBottom: SPACING.s,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        marginBottom: SPACING.s,
    },
    avatar: {
        marginRight: SPACING.m,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    contactPhone: {
        fontSize: FONT_SIZE.s,
        marginTop: 2,
    },
    more: {
        fontSize: 18,
        fontWeight: '700',
        paddingHorizontal: SPACING.s,
    },
    communityRow: {
        flexDirection: 'row',
        gap: SPACING.m,
        marginTop: SPACING.s,
    },
    communityCard: {
        flex: 1,
        borderRadius: BORDER_RADIUS.l,
        padding: SPACING.m,
    },
    communityIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.s,
    },
    communityName: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginBottom: 2,
    },
    communityCount: {
        fontSize: FONT_SIZE.s,
    },
    fab: {
        position: 'absolute',
        right: SPACING.l,
        bottom: SPACING.xl + 40,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
});



import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { SafeScreen } from '../components/SafeScreen';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { loadProfile, saveProfile, UserProfile, EmergencyContact, initialProfile } from '../services/profileService';
import { syncUserTableWithProfile } from '../services/userProfileSyncService';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { updateVolunteerStatus } from '../services/volunteerService';
import { requestEvidencePermissions } from '../services/evidenceCaptureService';
import { Trash2, Star, ChevronLeft, FolderOpen, Moon, Sun, Search } from 'lucide-react-native';

type ProfileHealthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProfileHealth'>;

interface Props {
    navigation: ProfileHealthScreenNavigationProp;
}

export const ProfileHealthScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark, toggleTheme } = useTheme();
    const { signOut } = useAuth();
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [loading, setLoading] = useState(false);
    const [newContact, setNewContact] = useState<Partial<EmergencyContact>>({});
    const [showAddContact, setShowAddContact] = useState(false);
    const [isVolunteer, setIsVolunteer] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await loadProfile();
        setProfile(data);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save locally
            await saveProfile(profile);
            // Sync to Supabase users table (name/phone)
            await syncUserTableWithProfile(profile);
            Alert.alert('Success', 'Profile saved successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: keyof UserProfile, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const addContact = () => {
        if (!newContact.name || !newContact.phone) {
            Alert.alert('Error', 'Name and Phone are required');
            return;
        }
        const contact: EmergencyContact = {
            id: Date.now().toString(),
            name: newContact.name,
            phone: newContact.phone,
            relationship: newContact.relationship || '',
            isPrimary: profile.contacts.length === 0,
        };
        setProfile(prev => ({
            ...prev,
            contacts: [...prev.contacts, contact],
        }));
        setNewContact({});
        setShowAddContact(false);
    };

    const removeContact = (id: string) => {
        setProfile(prev => ({
            ...prev,
            contacts: prev.contacts.filter(c => c.id !== id),
        }));
    };

    const setPrimaryContact = (id: string) => {
        setProfile(prev => ({
            ...prev,
            contacts: prev.contacts.map(c => ({
                ...c,
                isPrimary: c.id === id,
            })),
        }));
    };

    const handleSignOut = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                            // Navigation will automatically handle the auth state change via AppNavigator
                        } catch (error) {
                            Alert.alert("Error", "Failed to log out");
                        }
                    }
                }
            ]
        );
    };

    const handleVolunteerToggle = async (value: boolean) => {
        setIsVolunteer(value);
        try {
            if (value) {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Location permission is required to be a volunteer.');
                    setIsVolunteer(false);
                    return;
                }
                const location = await Location.getCurrentPositionAsync({});
                await updateVolunteerStatus('available', location, profile.name || 'Unknown Volunteer');
                Alert.alert('Active', 'You are now visible as a volunteer to nearby users.');
            } else {
                await updateVolunteerStatus('offline');
            }
        } catch (error) {
            console.error(error);
            setIsVolunteer(false);
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleEvidenceCaptureToggle = async (value: boolean) => {
        if (value) {
            // Request permissions when enabling
            try {
                const permissions = await requestEvidencePermissions();
                
                if (!permissions.camera && !permissions.audio && !permissions.location) {
                    Alert.alert(
                        'Permissions Required',
                        'Please grant camera, microphone, and location permissions to enable evidence capture.',
                        [{ text: 'OK' }]
                    );
                    return;
                }

                // Show which permissions were granted
                const grantedPermissions = [];
                if (permissions.camera) grantedPermissions.push('Camera');
                if (permissions.audio) grantedPermissions.push('Microphone');
                if (permissions.location) grantedPermissions.push('Location');

                if (grantedPermissions.length > 0) {
                    setProfile(prev => ({ ...prev, enableEvidenceCapture: true }));
                    Alert.alert(
                        'Evidence Capture Enabled',
                        `The following permissions were granted: ${grantedPermissions.join(', ')}. Evidence will be automatically captured when SOS is activated.`
                    );
                } else {
                    Alert.alert(
                        'Permissions Denied',
                        'Evidence capture requires camera, microphone, and location permissions. Please enable them in your device settings.'
                    );
                }
            } catch (error) {
                console.error('Error requesting evidence permissions:', error);
                Alert.alert('Error', 'Failed to request permissions. Please try again.');
            }
        } else {
            // Disable evidence capture
            setProfile(prev => ({ ...prev, enableEvidenceCapture: false }));
        }
    };

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <View style={{ flex: 1 }}>
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft size={24} color={theme.primary} />
                        <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>Profile & Health</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                <Section title="Personal Info" theme={theme}>
                    <Input
                        label="Full Name"
                        value={profile.name}
                        onChangeText={(t) => updateField('name', t)}
                        placeholder="John Doe"
                    />
                    <Input
                        label="Phone Number"
                        value={profile.phone}
                        onChangeText={(t) => updateField('phone', t)}
                        placeholder="+91 98765 43210"
                        keyboardType="phone-pad"
                    />
                    <View style={styles.row}>
                        <Input
                            label="Age"
                            value={profile.age}
                            onChangeText={(t) => updateField('age', t)}
                            placeholder="30"
                            keyboardType="numeric"
                            style={{ flex: 1 }}
                        />
                        <View style={{ width: SPACING.m }} />
                        <Input
                            label="Blood Group"
                            value={profile.bloodGroup}
                            onChangeText={(t) => updateField('bloodGroup', t)}
                            placeholder="O+"
                            style={{ flex: 1 }}
                        />
                    </View>
                </Section>

                <Section title="Volunteer Mode" theme={theme}>
                    <Card style={styles.volunteerCard}>
                        <View style={styles.volunteerInfo}>
                            <Text style={[styles.volunteerTitle, { color: theme.textPrimary }]}>Become a Volunteer</Text>
                            <Text style={[styles.volunteerDesc, { color: theme.textSecondary }]}>
                                Make yourself visible to help nearby people in emergencies.
                            </Text>
                        </View>
                        <Switch
                            value={isVolunteer}
                            onValueChange={handleVolunteerToggle}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor={'#fff'}
                        />
                    </Card>
                </Section>

                <Section title="Appearance" theme={theme}>
                    <Card style={styles.volunteerCard}>
                        <View style={styles.volunteerInfo}>
                            <View style={styles.themeTitleRow}>
                                {isDark ? (
                                    <Moon size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                                ) : (
                                    <Sun size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                                )}
                                <Text style={[styles.volunteerTitle, { color: theme.textPrimary }]}>Dark Mode</Text>
                            </View>
                            <Text style={[styles.volunteerDesc, { color: theme.textSecondary }]}>
                                Switch between light and dark theme.
                            </Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor={'#fff'}
                        />
                    </Card>
                </Section>

                <Section title="Evidence Capture" theme={theme}>
                    <Card style={styles.volunteerCard}>
                        <View style={styles.volunteerInfo}>
                            <Text style={[styles.volunteerTitle, { color: theme.textPrimary }]}>Automatic Evidence Capture</Text>
                            <Text style={[styles.volunteerDesc, { color: theme.textSecondary }]}>
                                Automatically record video, audio, and location when SOS is activated for post-incident analysis.
                            </Text>
                        </View>
                        <Switch
                            value={profile.enableEvidenceCapture || false}
                            onValueChange={handleEvidenceCaptureToggle}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor={'#fff'}
                        />
                    </Card>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('EvidenceViewer')}
                        style={[styles.evidenceButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                        <FolderOpen size={20} color={theme.primary} />
                        <Text style={[styles.evidenceButtonText, { color: theme.textPrimary }]}>View Evidence Files</Text>
                    </TouchableOpacity>
                </Section>

                <Section title="Health Details" theme={theme}>
                    <Input
                        label="Chronic Conditions"
                        value={profile.conditions}
                        onChangeText={(t) => updateField('conditions', t)}
                        placeholder="Diabetes, Asthma..."
                        multiline
                    />
                    <Input
                        label="Allergies"
                        value={profile.allergies}
                        onChangeText={(t) => updateField('allergies', t)}
                        placeholder="Peanuts, Penicillin..."
                        multiline
                    />
                    <Input
                        label="Medications"
                        value={profile.medications}
                        onChangeText={(t) => updateField('medications', t)}
                        placeholder="Insulin, Inhaler..."
                        multiline
                    />
                </Section>

                <Section title="Emergency Contacts" theme={theme}>
                    {profile.contacts.map(contact => (
                        <Card key={contact.id} style={styles.contactCard}>
                            <View style={styles.contactInfo}>
                                <Text style={[styles.contactName, { color: theme.textPrimary }]}>{contact.name} ({contact.relationship})</Text>
                                <Text style={[styles.contactPhone, { color: theme.textSecondary }]}>{contact.phone}</Text>
                            </View>
                            <View style={styles.contactActions}>
                                <TouchableOpacity onPress={() => setPrimaryContact(contact.id)}>
                                    <Star
                                        size={24}
                                        color={contact.isPrimary ? theme.warning : theme.textSecondary}
                                        fill={contact.isPrimary ? theme.warning : 'transparent'}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => removeContact(contact.id)}>
                                    <Trash2 size={24} color={theme.danger} />
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ))}

                    {showAddContact ? (
                        <Card style={styles.addContactForm}>
                            <Input
                                label="Name"
                                value={newContact.name}
                                onChangeText={(t) => setNewContact(prev => ({ ...prev, name: t }))}
                            />
                            <Input
                                label="Phone"
                                value={newContact.phone}
                                onChangeText={(t) => setNewContact(prev => ({ ...prev, phone: t }))}
                                keyboardType="phone-pad"
                            />
                            <Input
                                label="Relationship"
                                value={newContact.relationship}
                                onChangeText={(t) => setNewContact(prev => ({ ...prev, relationship: t }))}
                            />
                            <View style={styles.addContactButtons}>
                                <Button title="Cancel" onPress={() => setShowAddContact(false)} variant="outline" style={{ flex: 1, marginRight: SPACING.s }} />
                                <Button title="Add" onPress={addContact} style={{ flex: 1 }} />
                            </View>
                        </Card>
                    ) : (
                        <Button
                            title="Add Contact"
                            onPress={() => setShowAddContact(true)}
                            variant="secondary"
                            style={styles.addButton}
                        />
                    )}
                </Section>

                <View style={styles.footer}>
                    <Button title="Save Profile" onPress={handleSave} loading={loading} />
                    <Button
                        title="Logout"
                        onPress={handleSignOut}
                        variant="danger"
                        style={styles.logoutButton}
                    />
                </View>
                </ScrollView>
            </View>
        </SafeScreen>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode; theme: any }> = ({ title, children, theme }) => (
    <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
        {children}
    </View>
);

const styles = StyleSheet.create({
    header: {
        padding: SPACING.l,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    backText: {
        fontSize: FONT_SIZE.m,
        marginLeft: 4,
    },
    title: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
    },
    content: {
        padding: SPACING.l,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: SPACING.m,
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
    },
    contactCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
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
    contactActions: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    addButton: {
        marginTop: SPACING.s,
    },
    addContactForm: {
        marginTop: SPACING.s,
    },
    addContactButtons: {
        flexDirection: 'row',
        marginTop: SPACING.m,
    },
    contactButtons: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    searchContactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        flex: 1,
    },
    searchContactText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    footer: {
        marginBottom: SPACING.xl,
    },
    logoutButton: {
        marginTop: SPACING.m,
    },
    volunteerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    volunteerInfo: {
        flex: 1,
        marginRight: SPACING.m,
    },
    themeTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    volunteerTitle: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginBottom: 4,
    },
    volunteerDesc: {
        fontSize: FONT_SIZE.s,
        lineHeight: 18,
    },
    evidenceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        marginTop: SPACING.s,
        gap: SPACING.s,
    },
    evidenceButtonText: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
});

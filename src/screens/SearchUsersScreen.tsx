import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    StatusBar,
    Platform,
    Image,
    Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, Search, UserPlus, Phone, Mail } from 'lucide-react-native';
import { searchUsers, AppUser } from '../services/userSearchService';
import { loadProfile, saveProfile, EmergencyContact } from '../services/profileService';
import { useEmergency } from '../context/EmergencyContext';

type SearchUsersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SearchUsers'>;

interface Props {
    navigation: SearchUsersScreenNavigationProp;
}

export const SearchUsersScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { reloadProfile } = useEmergency();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [existingContacts, setExistingContacts] = useState<string[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadExistingContacts();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 2) {
                performSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const loadExistingContacts = async () => {
        try {
            const profile = await loadProfile();
            const phoneNumbers = profile.contacts.map(c => c.phone.replace(/\D/g, ''));
            setExistingContacts(phoneNumbers);
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    };

    const performSearch = async () => {
        setLoading(true);
        try {
            const results = await searchUsers(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const isContactAdded = (user: AppUser): boolean => {
        const normalizedPhone = user.phone?.replace(/\D/g, '') || '';
        return existingContacts.includes(normalizedPhone);
    };

    const handleAddContact = async (user: AppUser) => {
        try {
            const profile = await loadProfile();
            
            // Check if already added
            if (isContactAdded(user)) {
                Alert.alert('Already Added', 'This contact is already in your list.');
                return;
            }

            const contact: EmergencyContact = {
                id: user.id,
                name: user.name || user.email.split('@')[0],
                phone: user.phone || '',
                relationship: 'App User',
                isPrimary: false,
            };

            profile.contacts.push(contact);
            await saveProfile(profile);
            
            // Reload profile in context
            await reloadProfile();
            
            // Update local state
            const normalizedPhone = user.phone?.replace(/\D/g, '') || '';
            setExistingContacts([...existingContacts, normalizedPhone]);
            
            Alert.alert('Success', 'Contact added successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to add contact');
            console.error('Error adding contact:', error);
        }
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
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Search Users</Text>
                <View style={{ width: 40 }} />
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Search Input */}
                <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Search size={20} color={theme.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search by name, email, or phone..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {loading && <ActivityIndicator size="small" color={theme.primary} />}
                </View>

                {/* Results */}
                <ScrollView
                    style={styles.resultsContainer}
                    contentContainerStyle={styles.resultsContent}
                    showsVerticalScrollIndicator={false}
                >
                    {searchQuery.length < 2 ? (
                        <View style={styles.emptyState}>
                            <Search size={48} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                Start typing to search for users
                            </Text>
                        </View>
                    ) : searchResults.length === 0 && !loading ? (
                        <View style={styles.emptyState}>
                            <UserPlus size={48} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No users found
                            </Text>
                        </View>
                    ) : (
                        searchResults.map((user) => {
                            const isAdded = isContactAdded(user);
                            return (
                                <View
                                    key={user.id}
                                    style={[
                                        styles.userCard,
                                        {
                                            backgroundColor: theme.surface,
                                            borderColor: theme.border,
                                            ...(isDark ? SHADOWS.dark : SHADOWS.light),
                                        },
                                    ]}
                                >
                                    <View style={styles.userInfo}>
                                        {user.avatar_url ? (
                                            <Image
                                                source={{ uri: user.avatar_url }}
                                                style={styles.avatar}
                                            />
                                        ) : (
                                            <View style={[styles.avatarFallback, { backgroundColor: theme.primary + '20' }]}>
                                                <Text style={[styles.avatarText, { color: theme.primary }]}>
                                                    {(user.name || user.email).charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.userDetails}>
                                            <Text style={[styles.userName, { color: theme.textPrimary }]}>
                                                {user.name || user.email.split('@')[0]}
                                            </Text>
                                            <View style={styles.userMeta}>
                                                {user.phone && (
                                                    <View style={styles.metaItem}>
                                                        <Phone size={12} color={theme.textSecondary} />
                                                        <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                                            {user.phone}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={styles.metaItem}>
                                                    <Mail size={12} color={theme.textSecondary} />
                                                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                                        {user.email}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleAddContact(user)}
                                        disabled={isAdded}
                                        style={[
                                            styles.addButton,
                                            {
                                                backgroundColor: isAdded
                                                    ? theme.textSecondary + '20'
                                                    : theme.primary,
                                            },
                                        ]}
                                    >
                                        {isAdded ? (
                                            <Text style={[styles.addButtonText, { color: theme.textSecondary }]}>
                                                Added
                                            </Text>
                                        ) : (
                                            <>
                                                <UserPlus size={16} color="#FFFFFF" />
                                                <Text style={styles.addButtonText}>Add</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            </Animated.View>
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
    content: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        margin: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        gap: SPACING.s,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZE.m,
        paddingVertical: SPACING.xs,
    },
    resultsContainer: {
        flex: 1,
    },
    resultsContent: {
        padding: SPACING.l,
        paddingTop: 0,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xxl,
    },
    emptyText: {
        fontSize: FONT_SIZE.s,
        marginTop: SPACING.m,
        textAlign: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        marginBottom: SPACING.s,
        borderWidth: 1,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: SPACING.m,
    },
    avatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    avatarText: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
        marginBottom: 4,
    },
    userMeta: {
        gap: 4,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: FONT_SIZE.xs,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.m,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
});


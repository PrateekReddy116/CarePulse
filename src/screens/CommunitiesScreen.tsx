import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Animated,
    StatusBar,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, Plus, Users, Trash2, Edit2, Search } from 'lucide-react-native';
import {
    getUserCommunities,
    createCommunity,
    deleteCommunity,
    addCommunityMembers,
    Community,
} from '../services/communitiesService';
import { searchUsers, AppUser } from '../services/userSearchService';

type CommunitiesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Communities'>;

interface Props {
    navigation: CommunitiesScreenNavigationProp;
}

export const CommunitiesScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
    const [communityName, setCommunityName] = useState('');
    const [communityDescription, setCommunityDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AppUser[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const modalScale = useRef(new Animated.Value(0.9)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadCommunities();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        if (showCreateModal || showAddMembersModal) {
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
    }, [showCreateModal, showAddMembersModal]);

    useEffect(() => {
        if (searchQuery.length >= 2 && showAddMembersModal) {
            performSearch();
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, showAddMembersModal]);

    const loadCommunities = async () => {
        setLoading(true);
        try {
            const data = await getUserCommunities();
            setCommunities(data);
        } catch (error) {
            console.error('Error loading communities:', error);
        } finally {
            setLoading(false);
        }
    };

    const performSearch = async () => {
        try {
            const results = await searchUsers(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const handleCreateCommunity = async () => {
        if (!communityName.trim()) {
            Alert.alert('Error', 'Please enter a community name');
            return;
        }

        try {
            await createCommunity(communityName, communityDescription, selectedMembers);
            await loadCommunities();
            setShowCreateModal(false);
            setCommunityName('');
            setCommunityDescription('');
            setSelectedMembers([]);
            Alert.alert('Success', 'Community created successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create community');
        }
    };

    const handleAddMembers = async () => {
        if (!selectedCommunity || selectedMembers.length === 0) {
            Alert.alert('Error', 'Please select at least one member');
            return;
        }

        try {
            await addCommunityMembers(selectedCommunity.id, selectedMembers);
            await loadCommunities();
            setShowAddMembersModal(false);
            setSelectedCommunity(null);
            setSelectedMembers([]);
            setSearchQuery('');
            Alert.alert('Success', 'Members added successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add members');
        }
    };

    const handleDeleteCommunity = async (communityId: string) => {
        Alert.alert(
            'Delete Community?',
            'Are you sure you want to delete this community?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCommunity(communityId);
                            await loadCommunities();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete community');
                        }
                    },
                },
            ]
        );
    };

    const toggleMemberSelection = (userId: string) => {
        setSelectedMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
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
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Communities</Text>
                <TouchableOpacity
                    onPress={() => {
                        setSelectedMembers([]);
                        setShowCreateModal(true);
                    }}
                    style={styles.addButton}
                >
                    <Plus size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : communities.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Users size={48} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            No communities yet.{'\n'}Create one to get started.
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.communitiesContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {communities.map((community) => (
                            <View
                                key={community.id}
                                style={[
                                    styles.communityCard,
                                    {
                                        backgroundColor: theme.surface,
                                        borderColor: theme.border,
                                        ...(isDark ? SHADOWS.dark : SHADOWS.light),
                                    },
                                ]}
                            >
                                <View style={styles.communityHeader}>
                                    <View style={styles.communityInfo}>
                                        <Text style={[styles.communityName, { color: theme.textPrimary }]}>
                                            {community.name}
                                        </Text>
                                        {community.description && (
                                            <Text style={[styles.communityDescription, { color: theme.textSecondary }]}>
                                                {community.description}
                                            </Text>
                                        )}
                                        <Text style={[styles.memberCount, { color: theme.textSecondary }]}>
                                            {community.memberIds.length} member{community.memberIds.length !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteCommunity(community.id)}
                                        style={styles.deleteButton}
                                    >
                                        <Trash2 size={18} color={theme.danger} />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedCommunity(community);
                                        setSelectedMembers([]);
                                        setSearchQuery('');
                                        setShowAddMembersModal(true);
                                    }}
                                    style={[styles.addMembersButton, { borderColor: theme.border }]}
                                >
                                    <Plus size={16} color={theme.primary} />
                                    <Text style={[styles.addMembersText, { color: theme.primary }]}>
                                        Add Members
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </Animated.View>

            {/* Create Community Modal */}
            <Modal
                visible={showCreateModal}
                transparent
                animationType="none"
                onRequestClose={() => setShowCreateModal(false)}
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
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Create Community</Text>
                        
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
                            value={communityName}
                            onChangeText={setCommunityName}
                            placeholder="Enter community name"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={[styles.modalLabel, { color: theme.textPrimary, marginTop: SPACING.m }]}>
                            Description (optional)
                        </Text>
                        <TextInput
                            style={[
                                styles.modalTextArea,
                                {
                                    backgroundColor: theme.background,
                                    color: theme.textPrimary,
                                    borderColor: theme.border,
                                },
                            ]}
                            value={communityDescription}
                            onChangeText={setCommunityDescription}
                            placeholder="Enter description"
                            placeholderTextColor={theme.textSecondary}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowCreateModal(false);
                                    setCommunityName('');
                                    setCommunityDescription('');
                                    setSelectedMembers([]);
                                }}
                                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                            >
                                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleCreateCommunity}
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.primary }]}
                            >
                                <Text style={styles.modalButtonTextWhite}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Add Members Modal */}
            <Modal
                visible={showAddMembersModal}
                transparent
                animationType="none"
                onRequestClose={() => {
                    setShowAddMembersModal(false);
                    setSelectedCommunity(null);
                    setSelectedMembers([]);
                    setSearchQuery('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            styles.addMembersModal,
                            {
                                backgroundColor: theme.surface,
                                transform: [{ scale: modalScale }],
                                opacity: modalOpacity,
                            },
                        ]}
                    >
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                            Add Members to {selectedCommunity?.name}
                        </Text>

                        <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            <Search size={18} color={theme.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.textPrimary }]}
                                placeholder="Search users..."
                                placeholderTextColor={theme.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                            />
                        </View>

                        <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
                            {searchResults.map((user) => {
                                const isSelected = selectedMembers.includes(user.id);
                                return (
                                    <TouchableOpacity
                                        key={user.id}
                                        onPress={() => toggleMemberSelection(user.id)}
                                        style={[
                                            styles.memberItem,
                                            {
                                                backgroundColor: isSelected
                                                    ? theme.primary + '20'
                                                    : theme.background,
                                                borderColor: isSelected ? theme.primary : theme.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.memberName, { color: theme.textPrimary }]}>
                                            {user.name || user.email.split('@')[0]}
                                        </Text>
                                        {isSelected && (
                                            <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
                                                <Text style={styles.checkmarkText}>✓</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowAddMembersModal(false);
                                    setSelectedCommunity(null);
                                    setSelectedMembers([]);
                                    setSearchQuery('');
                                }}
                                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                            >
                                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAddMembers}
                                disabled={selectedMembers.length === 0}
                                style={[
                                    styles.modalButton,
                                    styles.saveButton,
                                    {
                                        backgroundColor: selectedMembers.length > 0 ? theme.primary : theme.textSecondary,
                                    },
                                ]}
                            >
                                <Text style={styles.modalButtonTextWhite}>
                                    Add ({selectedMembers.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
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
    communitiesContent: {
        padding: SPACING.l,
    },
    communityCard: {
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
    },
    communityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.m,
    },
    communityInfo: {
        flex: 1,
    },
    communityName: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: 4,
    },
    communityDescription: {
        fontSize: FONT_SIZE.s,
        marginBottom: 4,
    },
    memberCount: {
        fontSize: FONT_SIZE.xs,
    },
    deleteButton: {
        padding: SPACING.xs,
    },
    addMembersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: SPACING.s,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
    },
    addMembersText: {
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
    addMembersModal: {
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: SPACING.l,
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
    modalTextArea: {
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
        fontSize: FONT_SIZE.m,
        borderWidth: 1,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        gap: SPACING.s,
        marginBottom: SPACING.m,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZE.m,
        paddingVertical: SPACING.xs,
    },
    membersList: {
        maxHeight: 200,
        marginBottom: SPACING.m,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        marginBottom: SPACING.xs,
        borderWidth: 1,
    },
    memberName: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    modalActions: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    modalButton: {
        flex: 1,
        paddingVertical: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    saveButton: {},
    modalButtonText: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    modalButtonTextWhite: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
});


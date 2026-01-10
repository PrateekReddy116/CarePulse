import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, FlatList, ViewStyle } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { ChevronLeft, Users, MapPin, Clock, MessageCircle, Plus, Trash2 } from 'lucide-react-native';
import { createTravelRequest, getTravelRequests, acceptTravelRequest, TravelRequest } from '../services/travelBuddyService';
import { getChatRoomByTravelRequest, deleteChatRoom } from '../services/travelBuddyChatService';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

type TravelBuddyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TravelBuddy'>;

interface Props {
    navigation: TravelBuddyScreenNavigationProp;
}

export const TravelBuddyScreen: React.FC<Props> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { userProfile } = useEmergency();
    const { user } = useAuth();
    const currentUserId = user?.id || '';
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [travelDate, setTravelDate] = useState('');
    const [travelTime, setTravelTime] = useState('');
    const [availableRequests, setAvailableRequests] = useState<TravelRequest[]>([]);
    const [myRequests, setMyRequests] = useState<TravelRequest[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUserId) {
            loadTravelRequests();
        }
    }, [currentUserId]);

    // Reload requests when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            if (currentUserId) {
                loadTravelRequests();
            }
        }, [currentUserId])
    );

    const loadTravelRequests = async () => {
        try {
            setLoading(true);
            const requests = await getTravelRequests();
            // Filter: available requests are those not created by current user and not yet accepted
            const available = requests.filter(r => r.user_id !== currentUserId && r.status === 'pending');
            // My requests: requests I created OR requests I accepted
            const my = requests.filter(r => r.user_id === currentUserId || r.accepted_by === currentUserId);
            setAvailableRequests(available);
            setMyRequests(my);
        } catch (error) {
            console.error('Failed to load travel requests:', error);
            Alert.alert('Error', `Failed to load travel requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequest = async () => {
        if (!fromLocation.trim() || !toLocation.trim()) {
            Alert.alert('Error', 'Please enter both from and to locations');
            return;
        }

        if (!currentUserId) {
            Alert.alert('Error', 'You must be logged in to create a travel request');
            return;
        }

        try {
            setLoading(true);
            const request = await createTravelRequest({
                from_location: fromLocation.trim(),
                to_location: toLocation.trim(),
                travel_date: travelDate || new Date().toISOString().split('T')[0],
                travel_time: travelTime || '12:00',
            });
            console.log('Travel request created successfully:', request);
            Alert.alert('Success', 'Travel request created! Others can now see and join your trip.');
            setShowCreateForm(false);
            setFromLocation('');
            setToLocation('');
            setTravelDate('');
            setTravelTime('');
            await loadTravelRequests();
        } catch (error) {
            console.error('Failed to create travel request:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Alert.alert(
                'Error',
                `Failed to create travel request: ${errorMessage}\n\nPlease check:\n1. Your internet connection\n2. The travel_requests table exists in Supabase (see SUPABASE_SETUP.md)\n3. Your Supabase credentials are correct`
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            setLoading(true);
            await acceptTravelRequest(requestId);
            Alert.alert('Success', 'You have joined this travel request! A chat room has been created.');
            await loadTravelRequests();
            // Navigate to chat room
            // TODO: Navigate to chat screen with travel buddy
        } catch (error) {
            console.error('Failed to accept travel request:', error);
            Alert.alert('Error', 'Failed to join travel request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteChatRoom = async (request: TravelRequest) => {
        Alert.alert(
            'Delete Chat Room',
            'Are you sure you want to delete this chat room? All messages will be permanently deleted.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const chatRoom = await getChatRoomByTravelRequest(request.id);
                            if (chatRoom) {
                                await deleteChatRoom(chatRoom.id);
                                Alert.alert('Success', 'Chat room deleted successfully.');
                                await loadTravelRequests();
                            } else {
                                Alert.alert('Error', 'Chat room not found.');
                            }
                        } catch (error) {
                            console.error('Failed to delete chat room:', error);
                            Alert.alert('Error', 'Failed to delete chat room. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const renderRequestCard = (request: TravelRequest, isMine: boolean = false) => (
        <Card
            key={request.id}
            style={StyleSheet.flatten([
                styles.requestCard,
                {
                    backgroundColor: theme.surface,
                    borderColor: isMine ? theme.primary : theme.border,
                },
            ]) as ViewStyle}
        >
            <View style={styles.requestHeader}>
                <Users size={20} color={theme.primary} />
                <Text style={[styles.requestUserName, { color: theme.textPrimary }]}>
                    {request.user_name || 'Traveler'}
                </Text>
                {isMine && (
                    <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.badgeText}>Your Request</Text>
                    </View>
                )}
            </View>
            <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                    <MapPin size={16} color={theme.success} />
                    <Text style={[styles.routeText, { color: theme.textPrimary }]}>
                        From: {request.from_location}
                    </Text>
                </View>
                <View style={styles.routeItem}>
                    <MapPin size={16} color={theme.danger} />
                    <Text style={[styles.routeText, { color: theme.textPrimary }]}>
                        To: {request.to_location}
                    </Text>
                </View>
            </View>
            {(request.travel_date || request.travel_time) && (
                <View style={styles.timeContainer}>
                    <Clock size={16} color={theme.textSecondary} />
                    <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                        {request.travel_date} {request.travel_time && `at ${request.travel_time}`}
                    </Text>
                </View>
            )}
            {!isMine && request.status === 'pending' && (
                <Button
                    title="Join Trip"
                    onPress={() => handleAcceptRequest(request.id)}
                    variant="primary"
                    style={styles.joinButton}
                />
            )}
            {request.status === 'accepted' && (
                <View style={styles.chatButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.chatButton, { backgroundColor: theme.primary, flex: 1, marginRight: SPACING.xs }]}
                        onPress={async () => {
                            try {
                                // Get chat room for this travel request
                                const chatRoom = await getChatRoomByTravelRequest(request.id);
                                if (!chatRoom) {
                                    Alert.alert('Error', 'Chat room not found. Please try again.');
                                    return;
                                }

                                // Get other user's name
                                // If I created the request, other user is the one who accepted it
                                // If I accepted the request, other user is the one who created it
                                const otherUserId = request.user_id === currentUserId
                                    ? request.accepted_by
                                    : request.user_id;
                                
                                if (!otherUserId) {
                                    Alert.alert('Error', 'Unable to determine other user. Please try again.');
                                    return;
                                }
                                
                                // Get user name from users table
                                const { supabase } = await import('../lib/supabase');
                                const { data: otherUser } = await supabase
                                    .from('users')
                                    .select('name')
                                    .eq('id', otherUserId)
                                    .single();

                                navigation.navigate('TravelBuddyChat', {
                                    travelRequestId: request.id,
                                    chatRoomId: chatRoom.id,
                                    otherUserName: otherUser?.name || request.user_name || 'Travel Buddy',
                                });
                            } catch (error) {
                                console.error('Failed to open chat room:', error);
                                Alert.alert('Error', 'Failed to open chat room. Please try again.');
                            }
                        }}
                    >
                        <MessageCircle size={18} color="#FFF" />
                        <Text style={styles.chatButtonText}>Open Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: theme.danger }]}
                        onPress={() => handleDeleteChatRoom(request)}
                    >
                        <Trash2 size={18} color="#FFF" />
                        <Text style={styles.chatButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}
        </Card>
    );

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Travel Buddy</Text>
                <TouchableOpacity
                    onPress={() => setShowCreateForm(!showCreateForm)}
                    style={styles.addButton}
                >
                    <Plus size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {showCreateForm && (
                    <Card style={StyleSheet.flatten([
                        styles.createCard,
                        { backgroundColor: theme.surface, borderColor: theme.primary }
                    ]) as ViewStyle}>
                        <Text style={[styles.createTitle, { color: theme.textPrimary }]}>Create Travel Request</Text>
                        <Input
                            label="From Location"
                            value={fromLocation}
                            onChangeText={setFromLocation}
                            placeholder="e.g., Bangalore Central Station"
                        />
                        <Input
                            label="To Location"
                            value={toLocation}
                            onChangeText={setToLocation}
                            placeholder="e.g., Mumbai Airport"
                        />
                        <Input
                            label="Travel Date"
                            value={travelDate}
                            onChangeText={setTravelDate}
                            placeholder="YYYY-MM-DD"
                        />
                        <Input
                            label="Travel Time"
                            value={travelTime}
                            onChangeText={setTravelTime}
                            placeholder="HH:MM"
                        />
                        <View style={styles.formButtons}>
                            <Button
                                title="Cancel"
                                onPress={() => setShowCreateForm(false)}
                                variant="outline"
                                style={{ flex: 1, marginRight: SPACING.s }}
                            />
                            <Button
                                title="Create Request"
                                onPress={handleCreateRequest}
                                loading={loading}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </Card>
                )}

                {myRequests.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>My Travel Requests</Text>
                        {myRequests.map(request => renderRequestCard(request, true))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                        Available Travel Companions
                    </Text>
                    {availableRequests.length === 0 ? (
                        <Card style={StyleSheet.flatten([
                            styles.emptyCard,
                            { backgroundColor: theme.surface }
                        ]) as ViewStyle}>
                            <Users size={32} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No travel requests available at the moment.
                            </Text>
                            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                                Create a request to find travel companions!
                            </Text>
                        </Card>
                    ) : (
                        availableRequests.map(request => renderRequestCard(request, false))
                    )}
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
    addButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: SPACING.l,
    },
    createCard: {
        padding: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 2,
        marginBottom: SPACING.l,
    },
    createTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: SPACING.m,
    },
    formButtons: {
        flexDirection: 'row',
        marginTop: SPACING.m,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: SPACING.m,
    },
    requestCard: {
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.m,
    },
    requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
        gap: SPACING.s,
    },
    requestUserName: {
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
        flex: 1,
    },
    badge: {
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.s,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
    routeContainer: {
        marginBottom: SPACING.s,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
        gap: SPACING.xs,
    },
    routeText: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
        gap: SPACING.xs,
    },
    timeText: {
        fontSize: FONT_SIZE.s,
    },
    joinButton: {
        marginTop: SPACING.s,
    },
    chatButtonsContainer: {
        flexDirection: 'row',
        marginTop: SPACING.s,
        gap: SPACING.xs,
    },
    chatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        gap: SPACING.xs,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        gap: SPACING.xs,
        minWidth: 100,
    },
    chatButtonText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
    },
    emptyCard: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.m,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginTop: SPACING.m,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: FONT_SIZE.s,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
});

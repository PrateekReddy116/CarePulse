import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    AppState,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Send } from 'lucide-react-native';
import { getChatMessages, sendChatMessage, subscribeToChatMessages, ChatMessage } from '../services/travelBuddyChatService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TravelBuddyChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TravelBuddyChat'>;
type TravelBuddyChatScreenRouteProp = RouteProp<RootStackParamList, 'TravelBuddyChat'>;

interface Props {
    navigation: TravelBuddyChatScreenNavigationProp;
    route: TravelBuddyChatScreenRouteProp;
}

export const TravelBuddyChatScreen: React.FC<Props> = ({ navigation, route }) => {
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { travelRequestId, chatRoomId, otherUserName } = route.params;
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const lastMessageTimestampRef = useRef<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const loadMessages = async () => {
        try {
            setLoading(true);
            const loadedMessages = await getChatMessages(chatRoomId);
            setMessages(loadedMessages);
            // Update last message timestamp
            if (loadedMessages.length > 0) {
                lastMessageTimestampRef.current = loadedMessages[loadedMessages.length - 1].created_at;
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkForNewMessages = async () => {
        try {
            console.log('🔍 Checking for new messages...');
            // Fetch all messages and compare IDs to find new ones (more reliable than timestamp)
            const { supabase } = await import('../lib/supabase');
            const { data: allMessages, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('chat_room_id', chatRoomId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Error checking for new messages:', error);
                return;
            }

            if (!allMessages || allMessages.length === 0) {
                console.log('📭 No messages found in database');
                return;
            }

            console.log(`📊 Found ${allMessages.length} total messages in database`);

            // Get user names for all messages
            const userIds = [...new Set(allMessages.map(m => m.user_id))];
            const { data: users } = await supabase
                .from('users')
                .select('id, name')
                .in('id', userIds);

            const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

            const formattedMessages: ChatMessage[] = allMessages.map(msg => ({
                ...msg,
                user_name: userMap.get(msg.user_id) || undefined,
            }));

            setMessages(prev => {
                // Find messages that don't exist in current state
                const existingIds = new Set(prev.map(m => m.id));
                const newMessages = formattedMessages.filter(m => !existingIds.has(m.id));
                
                console.log(`📋 Current messages: ${prev.length}, Database messages: ${formattedMessages.length}, New: ${newMessages.length}`);
                
                if (newMessages.length > 0) {
                    console.log(`📥 Found ${newMessages.length} new message(s) via polling:`, newMessages.map(m => ({ id: m.id, text: m.message.substring(0, 20) + '...' })));
                    // Merge and sort by timestamp
                    const merged = [...prev, ...newMessages].sort((a, b) => 
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                    
                    // Update last message timestamp
                    if (merged.length > 0) {
                        lastMessageTimestampRef.current = merged[merged.length - 1].created_at;
                    }
                    
                    // Scroll to bottom after state update
                    setTimeout(() => scrollToBottom(), 100);
                    
                    return merged;
                } else {
                    console.log('✅ No new messages found');
                }
                return prev;
            });
        } catch (error) {
            console.error('Failed to check for new messages:', error);
        }
    };

    const startPolling = () => {
        // Stop any existing polling first
        if (pollingIntervalRef.current) {
            console.log('⏹️ Stopping existing polling');
            stopPolling();
        }
        
        // Poll every 2 seconds for new messages
        console.log('🔄 Starting polling for chat room:', chatRoomId);
        pollingIntervalRef.current = setInterval(() => {
            console.log('⏰ Polling tick - checking for new messages');
            checkForNewMessages();
        }, 2000);
        
        // Also check immediately
        checkForNewMessages();
    };

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    // Initialize chat: load messages, set up real-time subscription, and start polling
    useEffect(() => {
        loadMessages();
        
        // Subscribe to new messages (real-time)
        const unsubscribe = subscribeToChatMessages(chatRoomId, (newMessage) => {
            console.log('📬 New message received via real-time:', newMessage);
            setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMessage.id)) {
                    console.log('⚠️ Duplicate message ignored:', newMessage.id);
                    return prev;
                }
                // Update last message timestamp
                lastMessageTimestampRef.current = newMessage.created_at;
                console.log('✅ Adding new message to chat');
                return [...prev, newMessage];
            });
            scrollToBottom();
        });

        // Start polling for new messages (fallback if real-time fails)
        startPolling();

        // Handle app state changes (pause polling when app is in background)
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                // App came to foreground, resume polling
                startPolling();
                // Also check for new messages immediately
                checkForNewMessages();
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                // App went to background, pause polling to save battery
                stopPolling();
            }
        });

        return () => {
            unsubscribe();
            stopPolling();
            subscription.remove();
        };
    }, [chatRoomId]);

    // Auto-scroll when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Check for new messages when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            // Immediately check for new messages when screen is focused
            checkForNewMessages();
            
            // Ensure polling is running
            if (!pollingIntervalRef.current) {
                startPolling();
            }
        }, [chatRoomId])
    );

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const messageText = inputText.trim();
        setInputText('');

        try {
            const newMessage = await sendChatMessage(chatRoomId, messageText);
            setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMessage.id)) {
                    return prev;
                }
                // Update last message timestamp
                lastMessageTimestampRef.current = newMessage.created_at;
                return [...prev, newMessage];
            });
            scrollToBottom();
        } catch (error) {
            console.error('Failed to send message:', error);
            // Restore input text on error
            setInputText(messageText);
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const isMyMessage = (message: ChatMessage) => message.user_id === user?.id;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                        {otherUserName || 'Travel Buddy'}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                        Travel Companion
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {loading && messages.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                                Loading messages...
                            </Text>
                        </View>
                    ) : messages.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No messages yet. Start the conversation!
                            </Text>
                        </View>
                    ) : (
                        messages.map((message) => {
                            const isMine = isMyMessage(message);
                            return (
                                <View
                                    key={message.id}
                                    style={[
                                        styles.messageWrapper,
                                        isMine ? styles.messageWrapperRight : styles.messageWrapperLeft,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.messageBubble,
                                            {
                                                backgroundColor: isMine ? theme.primary : theme.surface,
                                                borderColor: isMine ? theme.primary : theme.border,
                                            },
                                        ]}
                                    >
                                        {!isMine && (
                                            <Text style={[styles.messageSender, { color: theme.textSecondary }]}>
                                                {message.user_name || 'Traveler'}
                                            </Text>
                                        )}
                                        <Text
                                            style={[
                                                styles.messageText,
                                                { color: isMine ? '#FFFFFF' : theme.textPrimary },
                                            ]}
                                        >
                                            {message.message}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.messageTime,
                                                { color: isMine ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                                            ]}
                                        >
                                            {formatTime(message.created_at)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Input Area */}
                <View style={[
                    styles.inputContainer, 
                    { 
                        backgroundColor: theme.surface, 
                        borderTopColor: theme.border,
                        paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, SPACING.m) : SPACING.s,
                    }
                ]}>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.background }]}>
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            placeholder="Type a message..."
                            placeholderTextColor={theme.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            textAlignVertical="center"
                            includeFontPadding={false}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            style={[
                                styles.sendButton,
                                {
                                    backgroundColor: inputText.trim() ? theme.primary : 'transparent',
                                    opacity: inputText.trim() ? 1 : 0.5,
                                },
                            ]}
                            disabled={!inputText.trim()}
                            activeOpacity={0.7}
                        >
                            <Send
                                size={18}
                                color={inputText.trim() ? '#FFFFFF' : theme.textSecondary}
                                strokeWidth={2.5}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
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
        paddingHorizontal: SPACING.m,
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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '500',
    },
    keyboardView: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: SPACING.m,
        paddingBottom: SPACING.l,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    loadingText: {
        fontSize: FONT_SIZE.m,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    emptyText: {
        fontSize: FONT_SIZE.m,
        textAlign: 'center',
    },
    messageWrapper: {
        marginBottom: SPACING.s,
        maxWidth: '80%',
    },
    messageWrapperLeft: {
        alignItems: 'flex-start',
    },
    messageWrapperRight: {
        alignItems: 'flex-end',
        alignSelf: 'flex-end',
    },
    messageBubble: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: BORDER_RADIUS.l,
        borderWidth: StyleSheet.hairlineWidth,
        maxWidth: '100%',
    },
    messageSender: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        marginBottom: 4,
    },
    messageText: {
        fontSize: FONT_SIZE.m,
        lineHeight: 20,
    },
    messageTime: {
        fontSize: FONT_SIZE.xs,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.m,
        paddingTop: SPACING.s,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.l,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.xs,
        minHeight: 44,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZE.m,
        maxHeight: 100,
        paddingVertical: SPACING.xs,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.xs,
    },
});

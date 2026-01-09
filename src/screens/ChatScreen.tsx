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
    Image,
    Alert,
    Modal,
    Animated,
    Dimensions,
    StatusBar,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { SafeScreen } from '../components/SafeScreen';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { useEmergency } from '../context/EmergencyContext';
import { ChevronLeft, Send, Eye, Timer, MapPin, Phone, Plus, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Props {
    navigation: ChatScreenNavigationProp;
    route: ChatScreenRouteProp;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'contact';
    timestamp: number;
    type?: 'text' | 'location' | 'safety_tool';
}

const CHAT_STORAGE_KEY = '@carepulse_chat_';

export const ChatScreen: React.FC<Props> = ({ navigation, route }) => {
    const { theme, isDark } = useTheme();
    const { userProfile, location } = useEmergency();
    const { contact } = route.params;
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [showSafetyTools, setShowSafetyTools] = useState(false);
    const [timerMinutes, setTimerMinutes] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const modalScale = useRef(new Animated.Value(0.9)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;
    const safetyToolsScale = useRef(new Animated.Value(0.9)).current;
    const safetyToolsOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadMessages();
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [contact.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (showTimerModal) {
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
    }, [showTimerModal]);

    useEffect(() => {
        if (showSafetyTools) {
            Animated.parallel([
                Animated.spring(safetyToolsScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(safetyToolsOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            safetyToolsScale.setValue(0.9);
            safetyToolsOpacity.setValue(0);
        }
    }, [showSafetyTools]);

    const loadMessages = async () => {
        try {
            const key = `${CHAT_STORAGE_KEY}${contact.id}`;
            const stored = await AsyncStorage.getItem(key);
            if (stored) {
                setMessages(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const saveMessages = async (newMessages: Message[]) => {
        try {
            const key = `${CHAT_STORAGE_KEY}${contact.id}`;
            await AsyncStorage.setItem(key, JSON.stringify(newMessages));
        } catch (error) {
            console.error('Error saving messages:', error);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const sendMessage = async (text: string, type: 'text' | 'location' | 'safety_tool' = 'text') => {
        if (!text.trim() && type === 'text') return;

        const newMessage: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: Date.now(),
            type,
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        await saveMessages(updatedMessages);
        setInputText('');

        // Simulate contact response for text messages
        if (type === 'text') {
            setTimeout(() => {
                const response: Message = {
                    id: (Date.now() + 1).toString(),
                    text: 'Message received',
                    sender: 'contact',
                    timestamp: Date.now(),
                    type: 'text',
                };
                const finalMessages = [...updatedMessages, response];
                setMessages(finalMessages);
                saveMessages(finalMessages);
            }, 1000);
        }
    };

    const handleSend = () => {
        if (inputText.trim()) {
            sendMessage(inputText.trim());
        }
    };

    const shareLocation = async () => {
        if (!location) {
            Alert.alert('Error', 'Location not available');
            return;
        }

        const locationText = `📍 My location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
        sendMessage(locationText, 'location');
        setShowSafetyTools(false);
    };

    const startMonitorMe = () => {
        const monitorText = `👁️ Started Monitor Me - Sharing live location with ${contact.name}`;
        sendMessage(monitorText, 'safety_tool');
        setShowSafetyTools(false);
        Alert.alert('Monitor Me Active', `Your live location is being shared with ${contact.name}`);
    };

    const setSOSTimer = () => {
        setShowTimerModal(true);
    };

    const handleSetTimer = () => {
        if (timerMinutes && !isNaN(Number(timerMinutes)) && Number(timerMinutes) > 0) {
            const timerText = `⏱️ SOS Timer set for ${timerMinutes} minutes`;
            sendMessage(timerText, 'safety_tool');
            Alert.alert('Timer Set', `If you don't check in within ${timerMinutes} minutes, an alert will be sent to ${contact.name}`);
            setShowTimerModal(false);
            setTimerMinutes('');
        } else {
            Alert.alert('Invalid Input', 'Please enter a valid number of minutes');
        }
    };

    const callContact = () => {
        const phoneNumber = contact.phone.replace(/[^0-9]/g, '');
        Linking.openURL(`tel:${phoneNumber}`);
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Header */}
                <Animated.View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface, opacity: fadeAnim }]}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={styles.backButton}
                        activeOpacity={0.6}
                    >
                        <ChevronLeft size={22} color={theme.textPrimary} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        {'avatar' in contact && contact.avatar ? (
                            <Image source={{ uri: contact.avatar }} style={styles.headerAvatar} />
                        ) : (
                            <View style={[styles.headerAvatarFallback, { backgroundColor: theme.primary }]}>
                                <Text style={styles.headerAvatarText}>
                                    {contact.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.headerTextContainer}>
                            <Text style={[styles.headerName, { color: theme.textPrimary }]}>{contact.name}</Text>
                            <Text style={[styles.headerPhone, { color: theme.textSecondary }]}>
                                {'phone' in contact ? contact.phone : ''}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        onPress={callContact} 
                        style={[styles.callButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        activeOpacity={0.7}
                    >
                        <Phone size={18} color={theme.primary} strokeWidth={2} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Messages */}
                <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
                    <ScrollView
                        ref={scrollViewRef}
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.messagesContent}
                        onContentSizeChange={scrollToBottom}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.length === 0 && (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                    <Text style={[styles.emptyIcon, { color: theme.textSecondary }]}>💬</Text>
                                </View>
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                    No messages yet
                                </Text>
                                <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                                    Start a conversation with {contact.name}
                                </Text>
                            </View>
                        )}
                        {messages.map((message, index) => (
                            <Animated.View
                                key={message.id}
                                style={[
                                    styles.messageWrapper,
                                    message.sender === 'user' ? styles.userMessageWrapper : styles.contactMessageWrapper,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.messageBubble,
                                        message.sender === 'user'
                                            ? [styles.userBubble, { 
                                                backgroundColor: theme.primary,
                                                shadowColor: theme.primary,
                                            }]
                                            : [styles.contactBubble, { 
                                                backgroundColor: theme.surface,
                                                shadowColor: '#000',
                                            }],
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.messageText,
                                            message.sender === 'user' ? styles.userMessageText : { color: theme.textPrimary },
                                        ]}
                                    >
                                        {message.text}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.messageTime,
                                            message.sender === 'user' ? styles.userMessageTime : { color: theme.textSecondary },
                                        ]}
                                    >
                                        {formatTime(message.timestamp)}
                                    </Text>
                                </View>
                            </Animated.View>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* Input */}
                <Animated.View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border, opacity: fadeAnim }]}>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.background }]}>
                        <TouchableOpacity
                            onPress={() => setShowSafetyTools(!showSafetyTools)}
                            style={styles.plusButton}
                            activeOpacity={0.7}
                        >
                            {showSafetyTools ? (
                                <X size={20} color={theme.textPrimary} strokeWidth={2.5} />
                            ) : (
                                <Plus size={20} color={theme.textPrimary} strokeWidth={2.5} />
                            )}
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            placeholder="Message"
                            placeholderTextColor={theme.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            style={[
                                styles.sendButton,
                                { 
                                    backgroundColor: inputText.trim() ? theme.primary : 'transparent',
                                    opacity: inputText.trim() ? 1 : 0.5,
                                }
                            ]}
                            disabled={!inputText.trim()}
                            activeOpacity={0.7}
                        >
                            <Send 
                                size={18} 
                                color={inputText.trim() ? theme.white : theme.textSecondary} 
                                strokeWidth={2.5}
                            />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Safety Tools Popup */}
                    {showSafetyTools && (
                        <>
                            <TouchableOpacity
                                style={styles.safetyToolsBackdrop}
                                activeOpacity={1}
                                onPress={() => setShowSafetyTools(false)}
                            />
                            <Animated.View
                                style={[
                                    styles.safetyToolsPopup,
                                    {
                                        backgroundColor: theme.surface,
                                        opacity: safetyToolsOpacity,
                                        transform: [{ scale: safetyToolsScale }],
                                    },
                                ]}
                            >
                            <TouchableOpacity
                                style={[styles.safetyToolOption, { borderBottomColor: theme.border }]}
                                onPress={startMonitorMe}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.safetyToolOptionIcon, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.15)' }]}>
                                    <Eye size={18} color={theme.primary} strokeWidth={2} />
                                </View>
                                <View style={styles.safetyToolOptionText}>
                                    <Text style={[styles.safetyToolOptionTitle, { color: theme.textPrimary }]}>Monitor Me</Text>
                                    <Text style={[styles.safetyToolOptionSubtitle, { color: theme.textSecondary }]}>Share live location</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.safetyToolOption, { borderBottomColor: theme.border }]}
                                onPress={() => {
                                    setShowSafetyTools(false);
                                    setSOSTimer();
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.safetyToolOptionIcon, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.15)' }]}>
                                    <Timer size={18} color={theme.warning} strokeWidth={2} />
                                </View>
                                <View style={styles.safetyToolOptionText}>
                                    <Text style={[styles.safetyToolOptionTitle, { color: theme.textPrimary }]}>SOS Timer</Text>
                                    <Text style={[styles.safetyToolOptionSubtitle, { color: theme.textSecondary }]}>Set countdown timer</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.safetyToolOption}
                                onPress={shareLocation}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.safetyToolOptionIcon, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.15)' }]}>
                                    <MapPin size={18} color={theme.success} strokeWidth={2} />
                                </View>
                                <View style={styles.safetyToolOptionText}>
                                    <Text style={[styles.safetyToolOptionTitle, { color: theme.textPrimary }]}>Share Location</Text>
                                    <Text style={[styles.safetyToolOptionSubtitle, { color: theme.textSecondary }]}>Send current location</Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                        </>
                    )}
                </Animated.View>

                {/* Timer Modal */}
                <Modal
                    visible={showTimerModal}
                    transparent
                    animationType="none"
                    onRequestClose={() => setShowTimerModal(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => {
                            setShowTimerModal(false);
                            setTimerMinutes('');
                        }}
                    >
                        <Animated.View
                            style={[
                                styles.modalContentWrapper,
                                {
                                    opacity: modalOpacity,
                                    transform: [{ scale: modalScale }],
                                },
                            ]}
                        >
                            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                                <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                                    <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>SOS Timer</Text>
                                    <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                                        Set timer duration in minutes
                                    </Text>
                                    <View style={[styles.modalInputContainer, { backgroundColor: theme.background }]}>
                                        <TextInput
                                            style={[styles.modalInput, { color: theme.textPrimary }]}
                                            placeholder="Enter minutes"
                                            placeholderTextColor={theme.textSecondary}
                                            value={timerMinutes}
                                            onChangeText={setTimerMinutes}
                                            keyboardType="numeric"
                                            autoFocus
                                        />
                                    </View>
                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.modalButtonCancel, { borderColor: theme.border }]}
                                            onPress={() => {
                                                setShowTimerModal(false);
                                                setTimerMinutes('');
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: theme.primary }]}
                                            onPress={handleSetTimer}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.modalButtonText, { color: theme.white }]}>Set Timer</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </TouchableOpacity>
                </Modal>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m + 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingTop: Platform.OS === 'ios' ? SPACING.xxl + 16 : SPACING.xl + 8,
        paddingBottom: SPACING.m,
    },
    backButton: {
        marginRight: SPACING.m,
        padding: 4,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: SPACING.s + 2,
    },
    headerAvatarFallback: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: SPACING.s + 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatarText: {
        color: '#FFFFFF',
        fontSize: FONT_SIZE.m - 1,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerName: {
        fontSize: FONT_SIZE.m - 1,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    headerPhone: {
        fontSize: FONT_SIZE.xs - 1,
        marginTop: 1,
        letterSpacing: -0.1,
    },
    callButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingHorizontal: SPACING.m,
        paddingTop: SPACING.m,
        paddingBottom: SPACING.xl + SPACING.m,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xxl * 2,
        minHeight: Dimensions.get('window').height * 0.5,
    },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.m,
    },
    emptyIcon: {
        fontSize: 32,
    },
    emptyText: {
        fontSize: FONT_SIZE.l,
        fontWeight: '600',
        letterSpacing: -0.3,
        marginBottom: SPACING.xs,
    },
    emptySubtext: {
        fontSize: FONT_SIZE.s,
        letterSpacing: -0.1,
    },
    messageWrapper: {
        marginBottom: SPACING.xs + 2,
        maxWidth: '75%',
    },
    userMessageWrapper: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    contactMessageWrapper: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    messageBubble: {
        paddingHorizontal: SPACING.m - 2,
        paddingVertical: SPACING.s - 2,
        borderRadius: 18,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    contactBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: FONT_SIZE.m - 1,
        marginBottom: 2,
        lineHeight: (FONT_SIZE.m - 1) * 1.4,
        letterSpacing: -0.2,
    },
    userMessageText: {
        color: '#FFFFFF',
    },
    messageTime: {
        fontSize: FONT_SIZE.xs - 1,
        alignSelf: 'flex-end',
        marginTop: 2,
        letterSpacing: -0.1,
    },
    userMessageTime: {
        color: 'rgba(255,255,255,0.75)',
    },
    plusButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.xs,
    },
    safetyToolsBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
    safetyToolsPopup: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? SPACING.xl + 4 : SPACING.l + 4,
        left: SPACING.m,
        right: SPACING.m,
        marginTop: SPACING.s,
        marginHorizontal: SPACING.m,
        borderRadius: 16,
        paddingVertical: SPACING.xs,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    safetyToolOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    safetyToolOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    safetyToolOptionText: {
        flex: 1,
    },
    safetyToolOptionTitle: {
        fontSize: FONT_SIZE.m - 1,
        fontWeight: '600',
        letterSpacing: -0.2,
        marginBottom: 2,
    },
    safetyToolOptionSubtitle: {
        fontSize: FONT_SIZE.xs - 1,
        letterSpacing: -0.1,
    },
    inputContainer: {
        paddingHorizontal: SPACING.m,
        paddingTop: SPACING.s + 2,
        paddingBottom: Platform.OS === 'ios' ? SPACING.l + 8 : SPACING.s + 8,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: SPACING.s + 2,
        paddingVertical: SPACING.xs,
        minHeight: 44,
        maxHeight: 100,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZE.m - 1,
        paddingHorizontal: SPACING.s,
        paddingVertical: Platform.OS === 'ios' ? SPACING.xs : SPACING.xs + 2,
        maxHeight: 88,
        letterSpacing: -0.2,
        textAlignVertical: 'center',
        includeFontPadding: false,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
    },
    modalContentWrapper: {
        width: '100%',
        maxWidth: 340,
    },
    modalContent: {
        borderRadius: 20,
        padding: SPACING.l + 4,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: FONT_SIZE.xl - 2,
        fontWeight: '700',
        marginBottom: SPACING.xs,
        letterSpacing: -0.4,
    },
    modalSubtitle: {
        fontSize: FONT_SIZE.s + 1,
        marginBottom: SPACING.l,
        letterSpacing: -0.1,
    },
    modalInputContainer: {
        borderRadius: 12,
        marginBottom: SPACING.l,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
    },
    modalInput: {
        fontSize: FONT_SIZE.m,
        letterSpacing: -0.2,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.s,
    },
    modalButton: {
        flex: 1,
        paddingVertical: SPACING.m - 2,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonCancel: {
        borderWidth: StyleSheet.hairlineWidth,
    },
    modalButtonConfirm: {
        // backgroundColor set inline
    },
    modalButtonText: {
        fontSize: FONT_SIZE.m - 1,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
});


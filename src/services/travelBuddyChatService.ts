/**
 * Travel Buddy Chat Service
 * Handles chat rooms and messages for travel buddies
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ChatMessage {
    id: string;
    chat_room_id: string;
    user_id: string;
    user_name?: string;
    message: string;
    created_at: string;
}

export interface ChatRoom {
    id: string;
    travel_request_id: string;
    user_ids: string[];
    created_at: string;
    updated_at: string;
}

/**
 * Create a chat room for a travel request
 */
export const createChatRoom = async (travelRequestId: string, userIds: string[]): Promise<ChatRoom> => {
    try {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        const { data: room, error } = await supabase
            .from('chat_rooms')
            .insert([{
                travel_request_id: travelRequestId,
                user_ids: userIds,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return room;
    } catch (error) {
        console.error('Error creating chat room:', error);
        throw error;
    }
};

/**
 * Get chat room for a travel request
 */
export const getChatRoomByTravelRequest = async (travelRequestId: string): Promise<ChatRoom | null> => {
    try {
        if (!isSupabaseConfigured()) {
            return null;
        }

        const { data: room, error } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('travel_request_id', travelRequestId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return room;
    } catch (error) {
        console.error('Error getting chat room:', error);
        return null;
    }
};

/**
 * Get or create chat room for a travel request
 */
export const getOrCreateChatRoom = async (travelRequestId: string): Promise<ChatRoom> => {
    try {
        // Try to get existing room
        const existingRoom = await getChatRoomByTravelRequest(travelRequestId);
        if (existingRoom) {
            return existingRoom;
        }

        // Get travel request to find user IDs
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { data: travelRequest } = await supabase
            .from('travel_requests')
            .select('user_id, accepted_by, status')
            .eq('id', travelRequestId)
            .single();

        if (!travelRequest) {
            throw new Error('Travel request not found');
        }

        // Create room with both users
        const userIds = [travelRequest.user_id];
        if (travelRequest.accepted_by) {
            userIds.push(travelRequest.accepted_by);
        } else if (travelRequest.status === 'accepted') {
            // If status is accepted but accepted_by is null, try to find who accepted it
            // This handles edge cases where the accept happened but accepted_by wasn't set
            console.warn('Travel request is accepted but accepted_by is null');
        }

        return await createChatRoom(travelRequestId, userIds);
    } catch (error) {
        console.error('Error getting or creating chat room:', error);
        throw error;
    }
};

/**
 * Send a message in a chat room
 */
export const sendChatMessage = async (
    chatRoomId: string,
    message: string
): Promise<ChatMessage> => {
    try {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get user name
        const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

        const { data: chatMessage, error } = await supabase
            .from('chat_messages')
            .insert([{
                chat_room_id: chatRoomId,
                user_id: user.id,
                message: message.trim(),
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Update chat room updated_at
        await supabase
            .from('chat_rooms')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chatRoomId);

        return {
            ...chatMessage,
            user_name: userData?.name || undefined,
        };
    } catch (error) {
        console.error('Error sending chat message:', error);
        throw error;
    }
};

/**
 * Get all messages for a chat room
 */
export const getChatMessages = async (chatRoomId: string): Promise<ChatMessage[]> => {
    try {
        if (!isSupabaseConfigured()) {
            return [];
        }

        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_room_id', chatRoomId)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        // Get user names for all messages
        const userIds = [...new Set(messages.map(m => m.user_id))];
        const { data: users } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);

        const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

        return (messages || []).map(msg => ({
            ...msg,
            user_name: userMap.get(msg.user_id) || undefined,
        }));
    } catch (error) {
        console.error('Error getting chat messages:', error);
        return [];
    }
};

/**
 * Subscribe to new messages in a chat room (real-time)
 */
export const subscribeToChatMessages = (
    chatRoomId: string,
    onNewMessage: (message: ChatMessage) => void
): (() => void) => {
    if (!isSupabaseConfigured()) {
        return () => {};
    }

    const channel = supabase
        .channel(`chat_room_${chatRoomId}`, {
            config: {
                broadcast: { self: false }, // Don't receive our own broadcasts
            },
        })
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `chat_room_id=eq.${chatRoomId}`,
            },
            async (payload) => {
                console.log('📨 Real-time message received:', payload.new);
                const newMessage = payload.new as ChatMessage;
                
                // Get user name
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', newMessage.user_id)
                    .single();

                onNewMessage({
                    ...newMessage,
                    user_name: userData?.name || undefined,
                });
            }
        )
        .subscribe((status) => {
            console.log('📡 Subscription status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Successfully subscribed to chat room:', chatRoomId);
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Channel subscription error');
            }
        });

    return () => {
        console.log('🔌 Unsubscribing from chat room:', chatRoomId);
        supabase.removeChannel(channel);
    };
};

/**
 * Delete a chat room and all its messages
 */
export const deleteChatRoom = async (chatRoomId: string): Promise<void> => {
    try {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        // First delete all messages in the chat room
        const { error: messagesError } = await supabase
            .from('chat_messages')
            .delete()
            .eq('chat_room_id', chatRoomId);

        if (messagesError) {
            throw messagesError;
        }

        // Then delete the chat room itself
        const { error: roomError } = await supabase
            .from('chat_rooms')
            .delete()
            .eq('id', chatRoomId);

        if (roomError) {
            throw roomError;
        }

        console.log('✅ Chat room and messages deleted successfully');
    } catch (error) {
        console.error('Error deleting chat room:', error);
        throw error;
    }
};

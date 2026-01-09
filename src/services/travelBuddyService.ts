/**
 * Travel Buddy Service
 * Handles travel requests and matching for finding safe travel companions
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface TravelRequest {
    id: string;
    user_id: string;
    user_name?: string;
    from_location: string;
    to_location: string;
    travel_date?: string;
    travel_time?: string;
    status: 'pending' | 'accepted' | 'completed' | 'cancelled';
    accepted_by?: string;
    matched_buddy_id?: string;
    chat_room_id?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Create a new travel request
 */
export const createTravelRequest = async (data: {
    from_location: string;
    to_location: string;
    travel_date?: string;
    travel_time?: string;
}): Promise<TravelRequest> => {
    try {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get user name from users table
        const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

        // Prepare data - ensure date/time are properly formatted or null
        const insertData: any = {
            user_id: user.id,
            from_location: data.from_location,
            to_location: data.to_location,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Only add date/time if they are provided and valid
        if (data.travel_date && data.travel_date.trim()) {
            insertData.travel_date = data.travel_date.trim();
        }
        if (data.travel_time && data.travel_time.trim()) {
            insertData.travel_time = data.travel_time.trim();
        }

        const { data: request, error } = await supabase
            .from('travel_requests')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Supabase error creating travel request:', error);
            // Provide more helpful error message
            if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                throw new Error('The travel_requests table does not exist in Supabase. Please run the SQL script in SUPABASE_SETUP.md to create it.');
            }
            throw new Error(error.message || 'Failed to create travel request');
        }

        return {
            ...request,
            user_name: userData?.name || undefined,
        };
    } catch (error) {
        console.error('Error creating travel request:', error);
        throw error;
    }
};

/**
 * Get all travel requests (available and user's own)
 */
export const getTravelRequests = async (): Promise<TravelRequest[]> => {
    try {
        if (!isSupabaseConfigured()) {
            return [];
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return [];
        }

        // Get all pending and accepted requests
        const { data: requests, error } = await supabase
            .from('travel_requests')
            .select('id, user_id, from_location, to_location, travel_date, travel_time, status, accepted_by, chat_room_id, created_at, updated_at')
            .in('status', ['pending', 'accepted'])
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Get user names for each request
        const userIds = [...new Set(requests.map(r => r.user_id))];
        const { data: users } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);

        const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

        return (requests || []).map(request => ({
            ...request,
            user_name: userMap.get(request.user_id) || undefined,
        }));
    } catch (error) {
        console.error('Error getting travel requests:', error);
        return [];
    }
};

/**
 * Accept a travel request (join someone's trip)
 */
export const acceptTravelRequest = async (requestId: string): Promise<void> => {
    try {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Update request status and set accepted_by
        const { error } = await supabase
            .from('travel_requests')
            .update({
                status: 'accepted',
                accepted_by: user.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .eq('status', 'pending'); // Only accept if still pending

        if (error) {
            throw error;
        }

        // Create a chat room for the travel buddies
        try {
            const { getOrCreateChatRoom } = await import('./travelBuddyChatService');
            
            // Get the travel request to get both user IDs
            const { data: travelRequest } = await supabase
                .from('travel_requests')
                .select('user_id')
                .eq('id', requestId)
                .single();

            if (travelRequest) {
                const chatRoom = await getOrCreateChatRoom(requestId);
                
                // Update travel request with chat room ID
                await supabase
                    .from('travel_requests')
                    .update({ chat_room_id: chatRoom.id })
                    .eq('id', requestId);
            }
        } catch (chatError) {
            console.error('Failed to create chat room:', chatError);
            // Don't fail the accept if chat room creation fails
        }
    } catch (error) {
        console.error('Error accepting travel request:', error);
        throw error;
    }
};

/**
 * Cancel a travel request
 */
export const cancelTravelRequest = async (requestId: string): Promise<void> => {
    try {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { error } = await supabase
            .from('travel_requests')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .eq('user_id', user.id); // Only cancel own requests

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error cancelling travel request:', error);
        throw error;
    }
};

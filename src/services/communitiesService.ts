import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const COMMUNITIES_KEY = '@carepulse_communities';

export interface Community {
    id: string;
    name: string;
    description?: string;
    memberIds: string[]; // User IDs from Supabase
    createdAt: string;
    createdBy: string; // User ID
}

/**
 * Get all communities for the current user
 */
export const getUserCommunities = async (): Promise<Community[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Get communities from Supabase where user is a member
        const { data, error } = await supabase
            .from('communities')
            .select('*')
            .contains('member_ids', [user.id]);

        if (error) {
            console.error('Error fetching communities:', error);
            // Fallback to local storage
            return getLocalCommunities();
        }

        return (data || []) as Community[];
    } catch (error) {
        console.error('Error getting communities:', error);
        return getLocalCommunities();
    }
};

/**
 * Get local communities from AsyncStorage (fallback)
 */
const getLocalCommunities = async (): Promise<Community[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(COMMUNITIES_KEY);
        return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
        console.error('Error loading local communities:', error);
        return [];
    }
};

/**
 * Create a new community
 */
export const createCommunity = async (
    name: string,
    description?: string,
    memberIds: string[] = []
): Promise<Community> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const community: Community = {
            id: `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            memberIds: [...memberIds, user.id], // Include creator
            createdAt: new Date().toISOString(),
            createdBy: user.id,
        };

        // Try to save to Supabase
        const { error } = await supabase
            .from('communities')
            .insert([{
                id: community.id,
                name: community.name,
                description: community.description,
                member_ids: community.memberIds,
                created_at: community.createdAt,
                created_by: community.createdBy,
            }]);

        if (error) {
            console.error('Error saving community to Supabase:', error);
            // Fallback to local storage
            await saveLocalCommunity(community);
        }

        return community;
    } catch (error) {
        console.error('Error creating community:', error);
        throw error;
    }
};

/**
 * Save community to local storage (fallback)
 */
const saveLocalCommunity = async (community: Community): Promise<void> => {
    try {
        const communities = await getLocalCommunities();
        communities.push(community);
        await AsyncStorage.setItem(COMMUNITIES_KEY, JSON.stringify(communities));
    } catch (error) {
        console.error('Error saving local community:', error);
    }
};

/**
 * Add members to a community
 */
export const addCommunityMembers = async (
    communityId: string,
    memberIds: string[]
): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get existing community
        const { data, error: fetchError } = await supabase
            .from('communities')
            .select('member_ids')
            .eq('id', communityId)
            .single();

        if (fetchError || !data) {
            throw new Error('Community not found');
        }

        const existingMembers = data.member_ids || [];
        const newMembers = [...new Set([...existingMembers, ...memberIds])];

        // Update in Supabase
        const { error } = await supabase
            .from('communities')
            .update({ member_ids: newMembers })
            .eq('id', communityId);

        if (error) {
            console.error('Error updating community:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error adding community members:', error);
        throw error;
    }
};

/**
 * Remove a member from a community
 */
export const removeCommunityMember = async (
    communityId: string,
    memberId: string
): Promise<void> => {
    try {
        const { data, error: fetchError } = await supabase
            .from('communities')
            .select('member_ids')
            .eq('id', communityId)
            .single();

        if (fetchError || !data) {
            throw new Error('Community not found');
        }

        const members = (data.member_ids || []).filter((id: string) => id !== memberId);

        const { error } = await supabase
            .from('communities')
            .update({ member_ids: members })
            .eq('id', communityId);

        if (error) {
            console.error('Error removing member:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error removing community member:', error);
        throw error;
    }
};

/**
 * Delete a community
 */
export const deleteCommunity = async (communityId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('communities')
            .delete()
            .eq('id', communityId);

        if (error) {
            console.error('Error deleting community:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error deleting community:', error);
        throw error;
    }
};


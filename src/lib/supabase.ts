import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate Supabase credentials
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '⚠️ Supabase credentials are missing!\n' +
        'Please create a .env file in the root directory with:\n' +
        'EXPO_PUBLIC_SUPABASE_URL=your_supabase_url\n' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n' +
        'Some features may not work without Supabase configuration.'
    );
}

// Create Supabase client with fallback dummy values if credentials are missing
// This prevents the app from crashing, but Supabase operations will fail gracefully
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
);

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
    return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');
};

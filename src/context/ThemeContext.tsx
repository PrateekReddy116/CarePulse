import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTE } from '../constants/theme';
import { supabase } from '../lib/supabase';

type ThemeType = typeof PALETTE.light;

interface ThemeContextType {
    theme: ThemeType;
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@carepulse_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [isDark, setIsDark] = useState(true); // Default to dark mode
    const [isInitialized, setIsInitialized] = useState(false);

    // Load saved theme preference on mount
    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedPreference !== null) {
                    setIsDark(savedPreference === 'dark');
                } else {
                    // Default to dark mode (will be set when user logs in)
                    setIsDark(true);
                }
            } catch (error) {
                console.error('Error loading theme preference:', error);
                setIsDark(true); // Default to dark mode
            } finally {
                setIsInitialized(true);
            }
        };

        loadThemePreference();
    }, []);

    // When user logs in, set dark mode as default if no preference is saved
    useEffect(() => {
        const checkAndSetDefaultTheme = async () => {
            if (!isInitialized) return;

            try {
                // Check if user is logged in
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                    // User is logged in, check if preference exists
                    const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                    if (savedPreference === null) {
                        // No saved preference, set dark mode as default
                        setIsDark(true);
                        await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
                    }
                }
            } catch (error) {
                console.error('Error checking session for theme:', error);
            }
        };

        checkAndSetDefaultTheme();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session && event === 'SIGNED_IN') {
                // User just logged in, set dark mode if no preference
                try {
                    const savedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                    if (savedPreference === null) {
                        setIsDark(true);
                        await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
                    }
                } catch (error) {
                    console.error('Error setting default theme on login:', error);
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [isInitialized]);

    const toggleTheme = async () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    };

    const theme = isDark ? PALETTE.dark : PALETTE.light;

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

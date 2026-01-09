import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { Home, Shield, PhoneCall, User2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type MainTabKey = 'Home' | 'SafetyTools' | 'Contacts' | 'ProfileHealth';

type Navigation = StackNavigationProp<RootStackParamList>;

interface BottomNavProps {
    navigation: Navigation;
    active: MainTabKey;
    onTabPress?: (key: MainTabKey) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ navigation, active, onTabPress }) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Calculate bottom position: safe area inset + padding
    // On Android, insets.bottom accounts for navigation bar (gesture or soft keys)
    // On iOS, insets.bottom accounts for home indicator
    const bottomInset = insets.bottom + SPACING.m;

    const items: { key: MainTabKey; label: string; icon: React.ReactNode }[] = [
        {
            key: 'Home',
            label: 'Home',
            icon: <Home size={20} color={active === 'Home' ? theme.primary : theme.textSecondary} />,
        },
        {
            key: 'SafetyTools',
            label: 'Tools',
            icon: <Shield size={20} color={active === 'SafetyTools' ? theme.primary : theme.textSecondary} />,
        },
        {
            key: 'Contacts',
            label: 'Calls',
            icon: <PhoneCall size={20} color={active === 'Contacts' ? theme.primary : theme.textSecondary} />,
        },
        {
            key: 'ProfileHealth',
            label: 'Profile',
            icon: <User2 size={20} color={active === 'ProfileHealth' ? theme.primary : theme.textSecondary} />,
        },
    ];

    return (
        <View style={[styles.wrapper, { bottom: bottomInset }]}>
            <View style={[styles.container, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            {items.map((item) => {
                const isActive = active === item.key;
                return (
                    <TouchableOpacity
                        key={item.key}
                        style={styles.item}
                        onPress={() => {
                            if (onTabPress) {
                                onTabPress(item.key);
                            } else {
                                navigation.navigate(item.key);
                            }
                        }}
                        activeOpacity={0.8}
                        >
                            {item.icon}
                        <Text
                            style={[
                                styles.label,
                                { color: isActive ? theme.primary : theme.textSecondary },
                            ]}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: SPACING.l,
        right: SPACING.l,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: 24,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
        elevation: 6,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        marginTop: 4,
        fontSize: 11,
        fontWeight: '600',
    },
});



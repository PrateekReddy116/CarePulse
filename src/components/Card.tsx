import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
    const { theme, isDark } = useTheme();

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.surface },
                isDark ? SHADOWS.dark : SHADOWS.light,
                style,
            ]}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: BORDER_RADIUS.l, // More rounded
        padding: SPACING.m,
        marginBottom: SPACING.m,
    },
});

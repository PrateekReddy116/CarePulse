import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Animated } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
}) => {
    const { theme } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return theme.textSecondary + '40'; // Low opacity
        switch (variant) {
            case 'primary': return theme.primary;
            case 'secondary': return theme.secondary;
            case 'danger': return theme.danger;
            case 'success': return theme.success;
            case 'outline': return 'transparent';
            default: return theme.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.textSecondary;
        switch (variant) {
            case 'outline': return theme.primary;
            default: return '#FFFFFF'; // Always white for filled buttons
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor() },
                variant === 'outline' && { borderWidth: 1, borderColor: theme.primary },
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.l,
        borderRadius: BORDER_RADIUS.l, // More rounded (Apple style)
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    text: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});

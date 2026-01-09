import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    {label}
                </Text>
            )}
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.inputBackground,
                        color: theme.textPrimary,
                        borderColor: error ? theme.danger : theme.border,
                    },
                    style,
                ]}
                placeholderTextColor={theme.textSecondary}
                {...props}
            />
            {error && (
                <Text style={[styles.error, { color: theme.danger }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.m,
    },
    label: {
        fontSize: FONT_SIZE.s,
        marginBottom: SPACING.xs,
        fontWeight: '500',
        textTransform: 'uppercase', // Apple style small caps labels
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.m,
        fontSize: FONT_SIZE.m,
    },
    error: {
        fontSize: FONT_SIZE.s,
        marginTop: SPACING.xs,
    },
});

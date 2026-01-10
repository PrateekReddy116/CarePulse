import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface MapPlaceholderProps {
    latitude?: number;
    longitude?: number;
    style?: any;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ latitude, longitude, style }) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }, style]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>📍 Location</Text>
            {latitude && longitude ? (
                <>
                    <Text style={[styles.coords, { color: theme.textSecondary }]}>
                        Lat: {latitude.toFixed(6)}
                    </Text>
                    <Text style={[styles.coords, { color: theme.textSecondary }]}>
                        Lng: {longitude.toFixed(6)}
                    </Text>
                </>
            ) : (
                <Text style={[styles.coords, { color: theme.textSecondary }]}>
                    Location not available
                </Text>
            )}
            <Text style={[styles.note, { color: theme.textSecondary }]}>
                Map requires Google Maps API key
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.m,
        padding: SPACING.l,
    },
    title: {
        fontSize: FONT_SIZE.l,
        fontWeight: '600',
        marginBottom: SPACING.m,
    },
    coords: {
        fontSize: FONT_SIZE.m,
        marginBottom: SPACING.xs,
    },
    note: {
        fontSize: FONT_SIZE.s,
        marginTop: SPACING.m,
        textAlign: 'center',
    },
});

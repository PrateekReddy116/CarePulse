import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle;
}

export const SafeScreen: React.FC<Props> = ({ children, style }) => {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.background,
                    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : insets.top,
                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                },
                style,
            ]}
        >
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

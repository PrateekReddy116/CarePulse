import React, { useState } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, FONT_SIZE } from '../../constants/theme';
import { SafeScreen } from '../../components/SafeScreen';

export default function AuthScreen() {
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) Alert.alert('Error', error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) Alert.alert('Error', error.message);
        if (!session && !error) Alert.alert('Check your inbox', 'Please check your inbox for email verification!');
        setLoading(false);
    }

    const isDarkLogin = true;

    return (
        <SafeScreen style={{ flex: 1, backgroundColor: '#000000' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.container}>
                    <View style={styles.header}>
                        <Text style={[styles.brand, { color: '#FFFFFF' }]}>CarePulse</Text>
                        <Text style={[styles.title, { color: '#FFFFFF' }]}>
                            {isSignUp ? 'Create your safe space.' : 'Welcome back, guardian.'}
                        </Text>
                        <Text style={[styles.subtitle, { color: '#8E8E93' }]}>
                            Sign in to stay connected with your trusted circle.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Email"
                            onChangeText={(text) => setEmail(text)}
                            value={email}
                            placeholder="name@example.com"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={styles.inputDark}
                        />
                        <Input
                            label="Password"
                            onChangeText={(text) => setPassword(text)}
                            value={password}
                            secureTextEntry={true}
                            placeholder="••••••••"
                            autoCapitalize="none"
                            style={styles.inputDark}
                        />

                        <Button
                            title={isSignUp ? 'Create Account' : 'Sign In'}
                            onPress={isSignUp ? signUpWithEmail : signInWithEmail}
                            loading={loading}
                            style={styles.button}
                        />

                        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleButton}>
                            <Text style={[styles.toggleText, { color: '#FFFFFF' }]}>
                                {isSignUp ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SPACING.l,
    },
    header: {
        marginBottom: SPACING.xl,
        alignItems: 'flex-start',
    },
    brand: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: SPACING.s,
        opacity: 0.9,
    },
    title: {
        fontSize: 30,
        fontWeight: '700',
        marginBottom: SPACING.s,
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: FONT_SIZE.m,
        lineHeight: 22,
        maxWidth: '80%',
    },
    form: {
        width: '100%',
    },
    inputDark: {
        backgroundColor: '#1C1C1E',
        borderColor: 'rgba(255,255,255,0.16)',
        color: '#FFFFFF',
    },
    button: {
        marginTop: SPACING.m,
    },
    toggleButton: {
        marginTop: SPACING.l,
        alignItems: 'center',
    },
    toggleText: {
        fontSize: FONT_SIZE.m,
        fontWeight: '500',
    },
});

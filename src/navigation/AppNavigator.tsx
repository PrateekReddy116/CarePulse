import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useEmergency } from '../context/EmergencyContext';

// Screens
import { WelcomeScreen } from '../screens/WelcomeScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { SOSActivationScreen } from '../screens/SOSActivationScreen';
import { VolunteerMatchingScreen } from '../screens/VolunteerMatchingScreen';
import { HelpStatusScreen } from '../screens/HelpStatusScreen';
import { ProfileHealthScreen } from '../screens/ProfileHealthScreen';
import { IncidentReportScreen } from '../screens/IncidentReportScreen';
import { EvidenceViewerScreen } from '../screens/EvidenceViewerScreen';
import { SafetyToolsScreen } from '../screens/SafetyToolsScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { MainTabsScreen } from '../screens/MainTabsScreen';
import { MonitorMeScreen } from '../screens/MonitorMeScreen';
import { SOSTimerScreen } from '../screens/SOSTimerScreen';
import { GeofencingScreen } from '../screens/GeofencingScreen';
import { SearchUsersScreen } from '../screens/SearchUsersScreen';
import { CommunitiesScreen } from '../screens/CommunitiesScreen';
import { LiveLocationViewerScreen } from '../screens/LiveLocationViewerScreen';

export type RootStackParamList = {
    // Auth Stack
    Welcome: undefined;
    Auth: undefined;

    // Main Stack
    MainTabs: undefined;
    Home: undefined;
    SafetyTools: undefined;
    MonitorMe: undefined;
    SOSTimer: undefined;
    Geofencing: undefined;
    Contacts: undefined;
    SearchUsers: undefined;
    Communities: undefined;
    Chat: { contact: { id: string; name: string; phone?: string; avatar?: string; relationship?: string } };
    LiveLocationViewer: { sessionId: string; volunteerName?: string };
    UserProfile: undefined;
    SOSActivation: undefined;
    VolunteerMatching: undefined;
    HelpStatus: undefined;
    ProfileHealth: undefined;
    IncidentReport: undefined;
    EvidenceViewer: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AuthNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
    );
};

const MainNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="MainTabs">
            <Stack.Screen name="MainTabs" component={MainTabsScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="SafetyTools" component={SafetyToolsScreen} />
            <Stack.Screen name="MonitorMe" component={MonitorMeScreen} />
            <Stack.Screen name="SOSTimer" component={SOSTimerScreen} />
            <Stack.Screen name="Geofencing" component={GeofencingScreen} />
            <Stack.Screen name="Contacts" component={ContactsScreen} />
            <Stack.Screen name="SearchUsers" component={SearchUsersScreen} />
            <Stack.Screen name="Communities" component={CommunitiesScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="LiveLocationViewer" component={LiveLocationViewerScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="SOSActivation" component={SOSActivationScreen} />
            <Stack.Screen name="VolunteerMatching" component={VolunteerMatchingScreen} />
            <Stack.Screen name="HelpStatus" component={HelpStatusScreen} />
            <Stack.Screen name="ProfileHealth" component={ProfileHealthScreen} />
            <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
            <Stack.Screen name="EvidenceViewer" component={EvidenceViewerScreen} />
        </Stack.Navigator>
    );
};

const AppNavigator = () => {
    const { theme } = useTheme();
    const { session, loading } = useAuth();
    const { profileLoading } = useEmergency();

    if (loading || (session && profileLoading)) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {session ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};

export default AppNavigator;

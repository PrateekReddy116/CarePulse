
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import AppNavigator from './src/navigation/AppNavigator';
import { EmergencyProvider } from './src/context/EmergencyContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
    <SafeAreaProvider>
      <ThemeProvider>
        <EmergencyProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </AuthProvider>
        </EmergencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}


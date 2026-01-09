import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { HomeScreen } from './HomeScreen';
import { SafetyToolsScreen } from './SafetyToolsScreen';
import { ContactsScreen } from './ContactsScreen';
import { ProfileHealthScreen } from './ProfileHealthScreen';
import { BottomNav, MainTabKey } from '../components/BottomNav';

type MainTabsNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: MainTabsNavigationProp;
}

export const MainTabsScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<MainTabKey>('Home');

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen navigation={navigation as any} />;
      case 'SafetyTools':
        return <SafetyToolsScreen navigation={navigation as any} />;
      case 'Contacts':
        return <ContactsScreen navigation={navigation as any} />;
      case 'ProfileHealth':
        return <ProfileHealthScreen navigation={navigation as any} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>{renderActiveScreen()}</View>
      <BottomNav
        navigation={navigation as any}
        active={activeTab}
        onTabPress={(key) => setActiveTab(key)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});



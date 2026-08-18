// SAHAY Mobile Application Navigator & Router - Safe Area Status Bar Integration

import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { LandingScreen } from '../screens/landing/LandingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { OfficialLoginScreen } from '../screens/auth/OfficialLoginScreen';
import { CitizenDashboardScreen } from '../screens/citizen/CitizenDashboardScreen';
import { WeatherScreen } from '../screens/citizen/WeatherScreen';
import { AlertsScreen } from '../screens/citizen/AlertsScreen';
import { LiveMapScreen } from '../screens/citizen/LiveMapScreen';
import { EmergencySOSScreen } from '../screens/citizen/EmergencySOSScreen';
import { MyIncidentReportsScreen } from '../screens/citizen/MyIncidentReportsScreen';
import { RiverStatusScreen } from '../screens/citizen/RiverStatusScreen';
import { PreparednessScreen } from '../screens/citizen/PreparednessScreen';
import { ProfileScreen } from '../screens/citizen/ProfileScreen';
import { RescueDashboardScreen } from '../screens/rescue/RescueDashboardScreen';
import { AssignedIncidentsScreen } from '../screens/rescue/AssignedIncidentsScreen';
import { TeamMembersScreen } from '../screens/rescue/TeamMembersScreen';
import { EmergencyRequestScreen } from '../screens/rescue/EmergencyRequestScreen';
import { COLORS } from '../constants/theme';

export const AppNavigator: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<string>('landing');
  const [registerRole, setRegisterRole] = useState<'citizen' | 'official'>('citizen');

  const navigateTo = (screen: string) => {
    setCurrentScreen(screen);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentScreen('landing');
  };

  const userRole = (user?.role || '').toLowerCase();

  const renderScreen = () => {
    // 1. Authenticated Rescue Team Role
    if (user && (userRole === 'rescue_team' || userRole === 'station' || userRole === 'station_admin')) {
      switch (currentScreen) {
        case 'assigned-incidents':
          return <AssignedIncidentsScreen onBack={() => navigateTo('rescue-dashboard')} />;
        case 'team-members':
          return <TeamMembersScreen onBack={() => navigateTo('rescue-dashboard')} />;
        case 'emergency-request':
          return <EmergencyRequestScreen onBack={() => navigateTo('rescue-dashboard')} />;
        case 'alerts':
          return <AlertsScreen onBack={() => navigateTo('rescue-dashboard')} isRescueTeam />;
        case 'profile':
          return <ProfileScreen onBack={() => navigateTo('rescue-dashboard')} onLogout={handleLogout} />;
        default:
          return <RescueDashboardScreen onNavigateTab={navigateTo} onLogout={handleLogout} />;
      }
    }

    // 2. Authenticated Citizen Role
    if (user && userRole === 'citizen') {
      switch (currentScreen) {
        case 'weather':
          return <WeatherScreen onBack={() => navigateTo('citizen-dashboard')} />;
        case 'alerts':
          return <AlertsScreen onBack={() => navigateTo('citizen-dashboard')} />;
        case 'live-map':
          return <LiveMapScreen onBack={() => navigateTo('citizen-dashboard')} />;
        case 'emergency':
          return <EmergencySOSScreen onBack={() => navigateTo('citizen-dashboard')} />;
        case 'my-reports':
          return <MyIncidentReportsScreen onBack={() => navigateTo('citizen-dashboard')} />;
        case 'river-status':
          return <RiverStatusScreen onBack={() => navigateTo('citizen-dashboard')} />;
        case 'preparedness':
          return <PreparednessScreen onBack={() => navigateTo('citizen-dashboard')} />;
        case 'profile':
          return <ProfileScreen onBack={() => navigateTo('citizen-dashboard')} onLogout={handleLogout} />;
        default:
          return <CitizenDashboardScreen onNavigateTab={navigateTo} onLogout={handleLogout} />;
      }
    }

    // 3. Unauthenticated / Landing & Auth Flow
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onNavigateRegister={(role) => {
              setRegisterRole(role);
              navigateTo('register');
            }}
            onNavigateOfficialLogin={() => navigateTo('official-login')}
            onBack={() => navigateTo('landing')}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            initialRole={registerRole}
            onNavigateLogin={() => navigateTo('login')}
            onNavigateOfficialLogin={() => navigateTo('official-login')}
            onBack={() => navigateTo('landing')}
          />
        );
      case 'official-login':
        return (
          <OfficialLoginScreen
            onNavigateCitizenLogin={() => navigateTo('login')}
            onBack={() => navigateTo('landing')}
          />
        );
      case 'weather':
        return <WeatherScreen onBack={() => navigateTo('landing')} />;
      case 'alerts':
        return <AlertsScreen onBack={() => navigateTo('landing')} />;
      case 'live-map':
        return <LiveMapScreen onBack={() => navigateTo('landing')} />;
      case 'emergency':
        return <EmergencySOSScreen onBack={() => navigateTo('landing')} />;
      case 'river-status':
        return <RiverStatusScreen onBack={() => navigateTo('landing')} />;
      case 'landing':
      default:
        return (
          <LandingScreen
            onNavigateLogin={() => navigateTo('login')}
            onNavigateRegister={(role) => {
              setRegisterRole(role);
              navigateTo('register');
            }}
            onNavigateOfficialLogin={() => navigateTo('official-login')}
            onNavigateTab={navigateTo}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.govtHeader} translucent={false} />
      <View style={styles.container}>{renderScreen()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.govtHeader,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.slate50,
  },
});

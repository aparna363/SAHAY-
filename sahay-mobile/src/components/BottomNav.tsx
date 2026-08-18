// SAHAY Mobile Fixed Bottom Navigation Bar - Vector Icons Exact Match

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

interface BottomNavProps {
  activeTab?: string;
  onNavigateTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab = 'home', onNavigateTab }) => {
  const insets = useSafeAreaInsets();
  const { lang } = useLanguage();

  const tabs = [
    {
      id: 'home',
      label: lang === 'ml' ? 'ഹോം' : 'Home',
      renderIcon: (active: boolean) => (
        <Ionicons name={active ? 'home' : 'home-outline'} size={24} color={active ? '#059669' : '#475569'} />
      ),
    },
    {
      id: 'alerts',
      label: lang === 'ml' ? 'അലേർട്ടുകൾ' : 'Alerts',
      renderIcon: (active: boolean) => (
        <Ionicons name={active ? 'notifications' : 'notifications-outline'} size={24} color={active ? '#059669' : '#475569'} />
      ),
    },
    {
      id: 'live-map',
      label: lang === 'ml' ? 'മാപ്പ്' : 'Live Map',
      renderIcon: (active: boolean) => (
        <Ionicons name={active ? 'map' : 'map-outline'} size={24} color={active ? '#059669' : '#475569'} />
      ),
    },
    {
      id: 'emergency',
      label: lang === 'ml' ? 'അടിയന്തിരം' : 'Emergency',
      renderIcon: (active: boolean) => (
        <MaterialCommunityIcons name={active ? 'shield-alert' : 'shield-alert-outline'} size={24} color={active ? '#059669' : '#475569'} />
      ),
    },
    {
      id: 'profile',
      label: lang === 'ml' ? 'പ്രൊഫൈൽ' : 'Profile',
      renderIcon: (active: boolean) => (
        <Ionicons name={active ? 'person' : 'person-outline'} size={24} color={active ? '#059669' : '#475569'} />
      ),
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id || (activeTab === 'landing' && tab.id === 'home');
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => onNavigateTab(tab.id === 'home' ? 'landing' : tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>{tab.renderIcon(isActive)}</View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    ...SHADOWS.medium,
    elevation: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  iconContainer: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#059669',
    fontWeight: '800',
  },
});

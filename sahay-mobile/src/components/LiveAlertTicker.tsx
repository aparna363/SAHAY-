// SAHAY Live Alert Ticker Component - Replicating Web LiveAlertTicker Exactly

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

interface LiveAlertTickerProps {
  onPressAlerts?: () => void;
}

export const LiveAlertTicker: React.FC<LiveAlertTickerProps> = ({ onPressAlerts }) => {
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.container}
      onPress={onPressAlerts}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>⚠️ {t.liveAlerts}</Text>
      </View>
      <Text style={styles.tickerText} numberOfLines={1}>
        {t.ticker1}
      </Text>
      <Text style={styles.arrowIcon}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.tickerBg, // #03291e
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#022c22',
  },
  badge: {
    backgroundColor: COLORS.tickerRedBadge, // #dc2626
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tickerText: {
    flex: 1,
    color: '#ecfdf5',
    fontSize: 11,
    fontWeight: '600',
  },
  arrowIcon: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

// SAHAY Mobile Landing Screen - Exact Web Hero & Weather Card Replica

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import { Header } from '../../components/Header';
import { LiveAlertTicker } from '../../components/LiveAlertTicker';
import { EmergencyContactsModal } from '../../components/EmergencyContactsModal';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useLocation } from '../../context/LocationContext';
import { fetchWeatherData, WeatherData } from '../../api/apiClient';

import { BottomNav } from '../../components/BottomNav';

interface LandingScreenProps {
  onNavigateLogin: () => void;
  onNavigateRegister: (role: 'citizen' | 'official') => void;
  onNavigateOfficialLogin: () => void;
  onNavigateTab: (tabName: string) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onNavigateLogin,
  onNavigateRegister,
  onNavigateOfficialLogin,
  onNavigateTab,
}) => {
  const { lang, t } = useLanguage();
  const location = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTelemetry = async () => {
    try {
      const data = await fetchWeatherData(location.latitude, location.longitude, location.district);
      setWeather(data);
    } catch (err) {
      console.warn('Landing weather load note:', err);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, [location.district]);

  const onRefresh = async () => {
    setRefreshing(true);
    await location.refreshLocation();
    await loadTelemetry();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header
        onOpenContacts={() => setContactsVisible(true)}
        onOpenLogin={onNavigateLogin}
        onOpenRegister={onNavigateRegister}
        onOpenOfficialLogin={onNavigateOfficialLogin}
        onNavigateTab={onNavigateTab}
        activeTab="home"
      />
      <LiveAlertTicker onPressAlerts={() => onNavigateTab('alerts')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 1. Website Cyclone Satellite Hero Section */}
        <ImageBackground
          source={require('../../../assets/cyclone.png')}
          style={styles.heroBackground}
          imageStyle={{ borderRadius: 16 }}
        >
          <View style={styles.heroOverlay}>
            {/* Government Portal Badge */}
            <View style={styles.portalBadge}>
              <Text style={styles.portalBadgeText}>🛡️ {t.portalBadge}</Text>
            </View>

            {/* Main Title */}
            <Text style={styles.heroTitle1}>{t.heroTitle1}</Text>
            <Text style={styles.heroTitle2}>{t.heroTitle2}</Text>

            <Text style={styles.heroDesc}>{t.heroDesc}</Text>

            {/* Hero Action Buttons */}
            <View style={styles.heroButtonRow}>
              <TouchableOpacity
                style={styles.btnLiveAlerts}
                onPress={() => onNavigateTab('alerts')}
              >
                <Text style={styles.btnLiveAlertsText}>🔔 {t.btnLiveAlerts}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnEmergencyContacts}
                onPress={() => setContactsVisible(true)}
              >
                <Text style={styles.btnEmergencyContactsText}>📞 {t.btnEmergencyContacts}</Text>
              </TouchableOpacity>
            </View>

            {/* Status Dot Row */}
            <View style={styles.statusDotRow}>
              <View style={styles.statusPill}>
                <View style={styles.greenPingDot} />
                <Text style={styles.statusPillText}>{t.controlRoomActive}</Text>
              </View>

              <View style={styles.statusPill}>
                <View style={styles.greenDot} />
                <Text style={styles.statusPillText}>{t.ndrfDeployed}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* 2. Website Weather Card Replica */}
        <View style={styles.weatherCard}>
          {/* Card Top Row: Condition Icon Box + Condition & Temp + Refresh */}
          <View style={styles.weatherTopRow}>
            <View style={styles.weatherIconBox}>
              <Text style={styles.weatherIconSvg}>🌧️</Text>
            </View>

            <View style={styles.weatherTempContainer}>
              <Text style={styles.weatherConditionTitle}>{weather?.condition || 'Light Drizzle'}</Text>
              <Text style={styles.weatherTempText}>{weather?.temperature ? `${Math.round(weather.temperature)}°C` : '30°C'}</Text>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Text style={styles.refreshBtnIcon}>↻</Text>
            </TouchableOpacity>
          </View>

          {/* Location Row */}
          <View style={styles.weatherLocationBox}>
            <Text style={styles.weatherLocationLabel}>📍 Location:</Text>
            <Text style={styles.weatherLocationValue}>{weather?.placeName || location.addressName || `${location.district}, Kerala`}</Text>
          </View>

          {/* Humidity Row */}
          <View style={styles.weatherDetailRow}>
            <Text style={styles.weatherDetailLabel}>💧 {t.humidity}</Text>
            <Text style={styles.weatherDetailValue}>{weather?.humidity || 92}%</Text>
          </View>

          {/* Wind Speed Row */}
          <View style={styles.weatherDetailRow}>
            <Text style={styles.weatherDetailLabel}>💨 {t.windSpeed}</Text>
            <Text style={styles.weatherDetailValue}>{weather?.windSpeed || 24} km/h</Text>
          </View>

          {/* Alert Level Row */}
          <View style={styles.weatherDetailRow}>
            <Text style={styles.weatherDetailLabel}>{t.alertLevel}</Text>
            {(() => {
              const officialAlert = (weather?.alert?.officialAlert?.alertLevel || weather?.alert?.alertLevel || 'GREEN').toUpperCase();
              const badgeStyle = officialAlert === 'RED' ? styles.redAlertBadge :
                                officialAlert === 'ORANGE' ? styles.orangeAlertBadge :
                                officialAlert === 'YELLOW' ? styles.yellowAlertBadge :
                                styles.greenAlertBadge;
              const textStyle = officialAlert === 'RED' ? styles.redAlertBadgeText :
                               officialAlert === 'ORANGE' ? styles.orangeAlertBadgeText :
                               officialAlert === 'YELLOW' ? styles.yellowAlertBadgeText :
                               styles.greenAlertBadgeText;
              const label = officialAlert === 'RED' ? '🔴 RED ALERT' :
                            officialAlert === 'ORANGE' ? '🟠 ORANGE ALERT' :
                            officialAlert === 'YELLOW' ? '🟡 YELLOW ALERT' :
                            '🟢 GREEN (NO WARNING)';
              return (
                <View style={badgeStyle}>
                  <Text style={textStyle}>{label}</Text>
                </View>
              );
            })()}
          </View>

          {/* Card Footer */}
          <View style={styles.weatherFooter}>
            <Text style={styles.weatherFooterText}>{t.sourceImd}</Text>
            <Text style={styles.weatherFooterTextEmerald}>{lang === 'ml' ? '5 മിനിറ്റ് മുമ്പ് പുതുക്കി' : 'Updated 5m ago'}</Text>
          </View>
        </View>

        {/* 3. Emergency Action Quick Grid */}
        <Text style={styles.sectionHeader}>⚡ Emergency Services & Telemetry</Text>

        <View style={styles.servicesGrid}>
          <TouchableOpacity
            style={[styles.serviceCard, { borderColor: COLORS.redBorder }]}
            onPress={() => onNavigateTab('emergency')}
          >
            <Text style={styles.serviceTitle}>🚨 Report Emergency / SOS</Text>
            <Text style={styles.serviceDesc}>Instant alert dispatch to KSDMA control room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceCard, { borderColor: COLORS.primary }]}
            onPress={() => onNavigateTab('live-map')}
          >
            <Text style={styles.serviceTitle}>🏕️ Find Relief Camps</Text>
            <Text style={styles.serviceDesc}>Locate active relief camps & capacity</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceCard, { borderColor: COLORS.slate200 }]}
            onPress={() => onNavigateTab('river-status')}
          >
            <Text style={styles.serviceTitle}>🌊 River & Dam Levels</Text>
            <Text style={styles.serviceDesc}>Real-time telemetry water level gauges</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>SAHAY Disaster Management Portal</Text>
          <Text style={styles.footerCopy}>© 2026 Government of Kerala — Department of Disaster Management</Text>
        </View>
      </ScrollView>

      {/* Fixed Modern Bottom Navigation */}
      <BottomNav activeTab="home" onNavigateTab={onNavigateTab} />

      <EmergencyContactsModal visible={contactsVisible} onClose={() => setContactsVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate50,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },

  // Hero Section
  heroBackground: {
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  heroOverlay: {
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    padding: SPACING.lg,
    borderRadius: 16,
  },
  portalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: SPACING.md,
  },
  portalBadgeText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle1: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  heroTitle2: {
    color: '#34d399',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: SPACING.sm,
  },
  heroDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  heroButtonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  btnLiveAlerts: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  btnLiveAlertsText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  btnEmergencyContacts: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  btnEmergencyContactsText: {
    color: '#043e2e',
    fontSize: 13,
    fontWeight: '800',
  },
  statusDotRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  greenPingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
    marginRight: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
    marginRight: 6,
  },
  statusPillText: {
    color: '#a7f3d0',
    fontSize: 10,
    fontWeight: '600',
  },

  // Website Weather Card Replica
  weatherCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.medium,
  },
  weatherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  weatherIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  weatherIconSvg: {
    fontSize: 26,
  },
  weatherTempContainer: {
    flex: 1,
  },
  weatherConditionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.slate900,
  },
  weatherTempText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
  },
  refreshBtn: {
    padding: 8,
  },
  refreshBtnIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.slate400,
  },
  weatherLocationBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: SPACING.sm,
  },
  weatherLocationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate500,
  },
  weatherLocationValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  weatherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  weatherDetailLabel: {
    fontSize: 12,
    color: COLORS.slate600,
    fontWeight: '600',
  },
  weatherDetailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  greenAlertBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenAlertBadgeText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '900',
  },
  yellowAlertBadge: {
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fde047',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  yellowAlertBadgeText: {
    color: '#854d0e',
    fontSize: 10,
    fontWeight: '900',
  },
  orangeAlertBadge: {
    backgroundColor: COLORS.orangeBg,
    borderWidth: 1,
    borderColor: COLORS.orangeBorder,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  orangeAlertBadgeText: {
    color: COLORS.orangeAlert,
    fontSize: 10,
    fontWeight: '900',
  },
  redAlertBadge: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  redAlertBadgeText: {
    color: '#991b1b',
    fontSize: 10,
    fontWeight: '900',
  },
  weatherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.xs,
  },
  weatherFooterText: {
    fontSize: 10,
    color: COLORS.slate400,
  },
  weatherFooterTextEmerald: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Telemetry Grid
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: SPACING.md,
  },
  servicesGrid: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  serviceCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  serviceDesc: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },

  footer: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  footerCopy: {
    fontSize: 10,
    color: COLORS.slate500,
    marginTop: 4,
    textAlign: 'center',
  },
});

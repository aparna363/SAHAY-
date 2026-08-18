// SAHAY Citizen Dashboard Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Header } from '../../components/Header';
import { LiveAlertTicker } from '../../components/LiveAlertTicker';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { fetchWeatherData, fetchMyIncidentReports, IncidentReport, WeatherData, submitIncidentReportApi } from '../../api/apiClient';

import { BottomNav } from '../../components/BottomNav';

interface CitizenDashboardProps {
  onNavigateTab: (tab: string) => void;
  onLogout: () => void;
}

export const CitizenDashboardScreen: React.FC<CitizenDashboardProps> = ({ onNavigateTab, onLogout }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [weatherRes, reportsRes] = await Promise.all([
        fetchWeatherData(location.latitude, location.longitude, user?.district || location.district),
        fetchMyIncidentReports(),
      ]);
      setWeather(weatherRes);
      setReports(reportsRes);
    } catch (err) {
      console.warn('Dashboard load note:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [location.district]);

  const onRefresh = async () => {
    setRefreshing(true);
    await location.refreshLocation();
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleQuickSOS = async () => {
    Alert.alert(
      '🚨 Confirm Emergency SOS',
      `Dispatch instant SOS alert with your GPS coordinates (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}) to KSDMA Control Room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS NOW',
          style: 'destructive',
          onPress: async () => {
            setSosLoading(true);
            try {
              const res = await submitIncidentReportApi({
                incidentTypeName: 'Other',
                severity: 'CRITICAL',
                description: `EMERGENCY SOS Triggered via Mobile App from ${location.addressName}`,
                latitude: location.latitude,
                longitude: location.longitude,
                locationAddress: location.addressName,
              });

              if (res.success) {
                Alert.alert('SOS DISPATCHED', 'Your emergency alert was transmitted to KSDMA Control Room.');
                loadDashboardData();
              } else {
                Alert.alert('SOS Submission Note', res.error || 'SOS logged locally.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Unable to send SOS');
            } finally {
              setSosLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Citizen Dashboard" />
      <LiveAlertTicker onPressAlerts={() => onNavigateTab('alerts')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome Header */}
        <View style={styles.welcomeBanner}>
          <View>
            <Text style={styles.welcomeTitle}>Welcome, {user?.name || 'Citizen'}</Text>
            <Text style={styles.locationText}>
              📍 {location.district} Sector ({location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°)
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>{t.logout}</Text>
          </TouchableOpacity>
        </View>

        {/* SOS Emergency Dispatch Button */}
        <TouchableOpacity style={styles.sosCard} onPress={handleQuickSOS} disabled={sosLoading}>
          <Text style={styles.sosIcon}>🚨</Text>
          <View style={styles.sosInfo}>
            <Text style={styles.sosTitle}>EMERGENCY SOS DISPATCH</Text>
            <Text style={styles.sosSubtitle}>One-tap instant alert to KSDMA Control Room</Text>
          </View>
        </TouchableOpacity>

        {/* Weather Telemetry Summary */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherCardHeader}>
            <Text style={styles.cardTitle}>🌤️ Live Weather — {weather?.district || location.district}</Text>
            <TouchableOpacity onPress={() => onNavigateTab('weather')}>
              <Text style={styles.linkText}>Details ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weatherRow}>
            <Text style={styles.tempText}>{weather?.temperature ? `${weather.temperature}°C` : '28°C'}</Text>
            <View>
              <Text style={styles.conditionText}>{weather?.condition || 'Rain Forecast'}</Text>
              <Text style={styles.humidityText}>Humidity: {weather?.humidity || 85}% | Wind: {weather?.windSpeed || 18} km/h</Text>
            </View>
          </View>
        </View>

        {/* Citizen Quick Actions */}
        <Text style={styles.sectionTitle}>Services & Incident Reporting</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigateTab('emergency')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>{t.reportIncident}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigateTab('alerts')}>
            <Text style={styles.actionIcon}>⚠️</Text>
            <Text style={styles.actionLabel}>{t.viewAlerts}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigateTab('live-map')}>
            <Text style={styles.actionIcon}>🏕️</Text>
            <Text style={styles.actionLabel}>{t.findShelter}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => onNavigateTab('my-reports')}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>{t.navMyReports}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Reports List */}
        <Text style={styles.sectionTitle}>My Recent Disaster Reports ({reports.length})</Text>

        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No disaster incidents reported yet.</Text>
          </View>
        ) : (
          reports.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportCode}>#{item.incidentCode}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.reportType}>{item.incidentTypeName} • {item.severity}</Text>
              <Text style={styles.reportDesc} numberOfLines={2}>{item.description}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeTab="home" onNavigateTab={onNavigateTab} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate50,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 14,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.small,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  locationText: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: COLORS.slate100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  sosCard: {
    backgroundColor: COLORS.redAlert,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  sosIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  sosInfo: {
    flex: 1,
  },
  sosTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sosSubtitle: {
    color: '#fecaca',
    fontSize: 11,
    marginTop: 2,
  },
  weatherCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 14,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.small,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  linkText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  tempText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.slate800,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  humidityText: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: SPACING.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate800,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.slate500,
    fontSize: 13,
  },
  reportCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportCode: {
    fontWeight: '800',
    color: COLORS.slate800,
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  reportType: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
    marginBottom: 4,
  },
  reportDesc: {
    fontSize: 12,
    color: COLORS.slate500,
  },
});

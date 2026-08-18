import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking
} from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useLocation } from '../../context/LocationContext';
import {
  getCurrentWeatherAlert,
  refreshWeatherAlert,
  CurrentWeatherAlertResponse,
  WeatherAlertItem,
  ManualAdvisoryItem
} from '../../api/weatherAlertApi';

const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
  'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
  'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
];

interface Props {
  onBack: () => void;
  isRescueTeam?: boolean;
}

export const AlertsScreen: React.FC<Props> = ({ onBack, isRescueTeam = false }) => {
  const location = useLocation();
  const [selectedDistrict, setSelectedDistrict] = useState(location.district || 'Ernakulam');
  const [alertData, setAlertData] = useState<CurrentWeatherAlertResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<{ [key: string]: boolean }>({});

  const loadAlerts = async (dist: string) => {
    setLoading(true);
    try {
      const res = await getCurrentWeatherAlert({ district: dist });
      setAlertData(res);
    } catch (err) {
      console.warn('Alerts fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts(selectedDistrict);
  }, [selectedDistrict]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshWeatherAlert({ district: selectedDistrict });
      setAlertData(res);
    } catch (err) {
      // Ignore
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSeverityStyle = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'RED':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', label: 'RED ALERT (Severe Threat)' };
      case 'ORANGE':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', label: 'ORANGE ALERT (Moderate Threat)' };
      case 'YELLOW':
        return { bg: '#FEF9C3', border: '#EAB308', text: '#854D0E', label: 'YELLOW ADVISORY (Minor)' };
      case 'GREEN':
        return { bg: '#D1FAE5', border: '#10B981', text: '#065F46', label: 'GREEN (No Active Alert)' };
      default:
        return { bg: '#F1F5F9', border: '#64748B', text: '#334155', label: 'UNVERIFIED STATUS' };
    }
  };

  const sevStyle = getSeverityStyle(alertData?.highestSeverity || 'UNVERIFIED');

  return (
    <View style={styles.container}>
      <Header
        title={isRescueTeam ? "Rescue Team Operational Alerts" : "Disaster Weather Alerts"}
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* District Selector */}
        <View style={styles.districtSection}>
          <Text style={styles.sectionHeader}>
            {isRescueTeam ? '📍 Select Assigned Operational Zone' : '📍 Select District'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
            {KERALA_DISTRICTS.map((dist) => (
              <TouchableOpacity
                key={dist}
                style={[
                  styles.chip,
                  selectedDistrict === dist && styles.chipActive,
                ]}
                onPress={() => setSelectedDistrict(dist)}
              >
                <Text style={[styles.chipText, selectedDistrict === dist && styles.chipTextActive]}>
                  {dist}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.contentSection}>
            {/* Primary Severity Banner */}
            <View style={[styles.bannerCard, { backgroundColor: sevStyle.bg, borderColor: sevStyle.border }]}>
              <View style={styles.bannerHeader}>
                <View style={[styles.badge, { backgroundColor: sevStyle.border }]}>
                  <Text style={styles.badgeText}>{alertData?.highestSeverity || 'UNVERIFIED'}</Text>
                </View>
                <Text style={[styles.updateLabel, { color: sevStyle.text }]}>
                  {alertData?.lastUpdatedLabel || 'Status check'}
                </Text>
              </View>

              <Text style={[styles.bannerTitle, { color: sevStyle.text }]}>
                {alertData?.highestSeverity === 'UNVERIFIED'
                  ? 'Unable to verify current alert status'
                  : alertData?.highestSeverity === 'GREEN'
                  ? `Normal Conditions in ${selectedDistrict}`
                  : `${alertData?.highestSeverity} ALERT IN EFFECT FOR ${selectedDistrict}`}
              </Text>

              {alertData?.isStale && (
                <Text style={styles.staleNotice}>
                  ⚠️ Showing cached status. Last updated {alertData?.lastUpdatedLabel}.
                </Text>
              )}

              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Text style={styles.refreshButtonText}>🔄 Manual Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Active Official Alerts Accordion */}
            <Text style={styles.sectionTitle}>
              Official Alerts ({alertData?.activeAlerts?.length || 0})
            </Text>

            {!alertData?.activeAlerts || alertData.activeAlerts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active official meteorological warnings for {selectedDistrict}.</Text>
              </View>
            ) : (
              alertData.activeAlerts.map((alert: WeatherAlertItem) => {
                const itemSev = getSeverityStyle(alert.mapped_severity);
                const isExpanded = expandedAlerts[alert.alert_id];

                return (
                  <View key={alert.alert_id} style={[styles.alertCard, { borderColor: itemSev.border }]}>
                    <TouchableOpacity onPress={() => toggleExpand(alert.alert_id)} activeOpacity={0.8}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.miniBadge, { backgroundColor: itemSev.border }]}>
                          <Text style={styles.miniBadgeText}>{alert.mapped_severity}</Text>
                        </View>
                        <Text style={styles.hazardType}>{alert.hazard_type}</Text>
                      </View>

                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertDesc} numberOfLines={isExpanded ? undefined : 3}>
                        {alert.description}
                      </Text>

                      <Text style={styles.expandToggle}>
                        {isExpanded ? '▲ Hide Details' : '▼ Expand Active Alerts & Details'}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        {alert.safety_instructions && (
                          <View style={styles.safetyBox}>
                            <Text style={styles.safetyHeader}>🛡️ Safety Instructions:</Text>
                            <Text style={styles.safetyText}>{alert.safety_instructions}</Text>
                          </View>
                        )}

                        {/* Rescue Team Extended Raw Metadata */}
                        {isRescueTeam && (
                          <View style={styles.rescueMetaBox}>
                            <Text style={styles.rescueMetaHeader}>📋 Rescue Operational Metadata:</Text>
                            <Text style={styles.rescueMetaText}>• Issued At: {alert.issued_at ? new Date(alert.issued_at).toLocaleString() : 'N/A'}</Text>
                            <Text style={styles.rescueMetaText}>• Expiry: {alert.expires_at ? new Date(alert.expires_at).toLocaleString() : 'N/A'}</Text>
                            <Text style={styles.rescueMetaText}>• Affected Zones: {alert.affected_zones?.join(', ') || selectedDistrict}</Text>
                            <Text style={styles.rescueMetaText}>• Source Type: {alert.source_type || 'OFFICIAL'}</Text>
                            
                            {alert.source_reference_url && (
                              <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => Linking.openURL(alert.source_reference_url!)}
                              >
                                <Text style={styles.linkButtonText}>🔗 View Source Reference Link</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Local District Collector Advisories */}
            <Text style={styles.sectionTitle}>
              District Collector Local Advisories ({alertData?.activeAdvisories?.length || 0})
            </Text>

            {!alertData?.activeAdvisories || alertData.activeAdvisories.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No local collector advisories active for {selectedDistrict}.</Text>
              </View>
            ) : (
              alertData.activeAdvisories.map((advisory: ManualAdvisoryItem) => (
                <View key={advisory.id} style={styles.advisoryCard}>
                  <View style={styles.advisoryHeader}>
                    <Text style={styles.advisoryTag}>📢 LOCAL BROADCAST</Text>
                    <Text style={styles.advisoryAuthor}>By {advisory.issued_by_name || 'Collector'}</Text>
                  </View>
                  <Text style={styles.advisoryTitle}>{advisory.title}</Text>
                  <Text style={styles.advisoryText}>{advisory.instruction}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
  },
  districtSection: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.slate600,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  districtScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  contentSection: {
    marginTop: 4,
  },
  bannerCard: {
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },
  updateLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  staleNotice: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
    marginBottom: 8,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.slate800,
    marginBottom: 10,
    marginTop: 6,
  },
  emptyCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.slate500,
  },
  alertCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1.5,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  miniBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },
  hazardType: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 12,
    color: COLORS.slate600,
    lineHeight: 18,
    marginBottom: 8,
  },
  expandToggle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  expandedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
  },
  safetyBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 8,
  },
  safetyHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 4,
  },
  safetyText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  rescueMetaBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rescueMetaHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.slate800,
    marginBottom: 4,
  },
  rescueMetaText: {
    fontSize: 11,
    color: COLORS.slate700,
    marginBottom: 2,
  },
  linkButton: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  advisoryCard: {
    backgroundColor: '#FFFBEB',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: SPACING.md,
  },
  advisoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  advisoryTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
  },
  advisoryAuthor: {
    fontSize: 10,
    color: COLORS.slate500,
  },
  advisoryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 2,
  },
  advisoryText: {
    fontSize: 11,
    color: COLORS.slate700,
    lineHeight: 16,
  },
});

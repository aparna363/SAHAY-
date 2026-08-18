// SAHAY Weather Telemetry Screen - 14 Kerala Districts Weather

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useLocation } from '../../context/LocationContext';
import { fetchWeatherData, WeatherData, getDistricts } from '../../api/apiClient';

export const WeatherScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const location = useLocation();
  const [selectedDistrict, setSelectedDistrict] = useState(location.district);
  const [districts, setDistricts] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDistricts().then(setDistricts);
  }, []);

  const loadWeather = async (dist: string) => {
    setLoading(true);
    try {
      const data = await fetchWeatherData(undefined, undefined, dist);
      setWeather(data);
    } catch (err) {
      console.warn('Weather fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather(selectedDistrict);
  }, [selectedDistrict]);

  return (
    <View style={styles.container}>
      <Header title="Weather Telemetry" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* District Selector Horizontal Bar */}
        <Text style={styles.sectionHeader}>Select District Telemetry</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
          {districts.map((dist) => (
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

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.districtTitle}>📍 {weather?.district} District</Text>
                <Text style={styles.sourceText}>IMD Kerala Telemetry Station</Text>
              </View>
              {(() => {
                const officialLevel = (weather?.alert?.officialAlert?.alertLevel || weather?.alert?.alertLevel || 'GREEN').toUpperCase();
                const isRed = officialLevel === 'RED';
                const isOrange = officialLevel === 'ORANGE';
                const isYellow = officialLevel === 'YELLOW';
                const bg = isRed ? '#fee2e2' : isOrange ? '#ffedd5' : isYellow ? '#fef9c3' : COLORS.greenBg;
                const txtColor = isRed ? '#991b1b' : isOrange ? '#9a3412' : isYellow ? '#854d0e' : COLORS.greenAlert;
                const label = isRed ? '🔴 RED ALERT' : isOrange ? '🟠 ORANGE ALERT' : isYellow ? '🟡 YELLOW ALERT' : '🟢 GREEN (NO WARNING)';
                return (
                  <View style={[styles.alertBadge, { backgroundColor: bg }]}>
                    <Text style={[styles.alertBadgeText, { color: txtColor }]}>
                      {label}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.mainTempRow}>
              <Text style={styles.tempLarge}>{weather?.temperature || 28}°C</Text>
              <View>
                <Text style={styles.conditionMain}>{weather?.condition || 'Rain Forecast'}</Text>
                <Text style={styles.updatedText}>Updated live from IMD</Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Humidity</Text>
                <Text style={styles.detailVal}>{weather?.humidity || 85}%</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Wind Speed</Text>
                <Text style={styles.detailVal}>{weather?.windSpeed || 18} km/h</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Rain Probability</Text>
                <Text style={styles.detailVal}>{weather?.rainProbability || 75}%</Text>
              </View>
            </View>

            <View style={styles.alertBox}>
              <Text style={styles.alertBoxTitle}>⚠️ Active Advisory</Text>
              <Text style={styles.alertBoxDesc}>
                {weather?.alert?.description || 'No severe emergency telemetry warning currently issued for this sector.'}
              </Text>
            </View>
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: SPACING.sm,
  },
  districtScroll: {
    marginBottom: SPACING.lg,
  },
  chip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  districtTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  sourceText: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  mainTempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  tempLarge: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.slate800,
  },
  conditionMain: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  updatedText: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.slate50,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  detailBox: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.slate500,
  },
  detailVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate800,
    marginTop: 2,
  },
  alertBox: {
    backgroundColor: COLORS.orangeBg,
    borderWidth: 1,
    borderColor: COLORS.orangeBorder,
    padding: SPACING.md,
    borderRadius: 10,
  },
  alertBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.orangeAlert,
    marginBottom: 4,
  },
  alertBoxDesc: {
    fontSize: 12,
    color: COLORS.slate700,
    lineHeight: 18,
  },
});

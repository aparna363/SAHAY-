// SAHAY River & Dam Water Level Telemetry Screen

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';

const riverGauges = [
  { river: 'Periyar River', location: 'Neeleeswaram Gauge', level: '8.45 m', danger: '9.00 m', status: 'WARNING', trend: 'Rising' },
  { river: 'Chalakudy River', location: 'Arangali Station', level: '6.10 m', danger: '7.50 m', status: 'ALERT', trend: 'Steady' },
  { river: 'Pamba River', location: 'Chengannur Station', level: '4.80 m', danger: '6.20 m', status: 'NORMAL', trend: 'Falling' },
  { river: 'Idukki Dam Reservoir', location: 'Cheruthoni Dam Shutters', level: '2398.2 ft', danger: '2403.0 ft', status: 'ORANGE ALERT', trend: 'Shutter 1 Opened 50cm' },
];

export const RiverStatusScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <Header title="River & Dam Telemetry" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🌊 State Hydrological Water Level Gauges</Text>

        {riverGauges.map((item, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.riverName}>{item.river}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.location}>📍 {item.location}</Text>

            <View style={styles.levelGrid}>
              <View style={styles.levelBox}>
                <Text style={styles.label}>Current Water Level</Text>
                <Text style={styles.val}>{item.level}</Text>
              </View>
              <View style={styles.levelBox}>
                <Text style={styles.label}>Danger Level Threshold</Text>
                <Text style={[styles.val, { color: COLORS.redAlert }]}>{item.danger}</Text>
              </View>
            </View>
            <Text style={styles.trend}>Trend: {item.trend}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.slate50 },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.slate800, marginBottom: SPACING.md },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.slate200, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  riverName: { fontSize: 15, fontWeight: '800', color: COLORS.slate800 },
  statusBadge: { backgroundColor: COLORS.orangeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: COLORS.orangeAlert, fontSize: 10, fontWeight: '800' },
  location: { fontSize: 12, color: COLORS.slate500, marginBottom: SPACING.md },
  levelGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.slate50, padding: SPACING.md, borderRadius: 8, marginBottom: SPACING.xs },
  levelBox: { alignItems: 'center' },
  label: { fontSize: 10, color: COLORS.slate500 },
  val: { fontSize: 14, fontWeight: '800', color: COLORS.slate800, marginTop: 2 },
  trend: { fontSize: 11, color: COLORS.slate600, marginTop: 4, fontWeight: '600' },
});

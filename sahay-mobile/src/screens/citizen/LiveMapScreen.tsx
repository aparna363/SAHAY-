// SAHAY Live Map & Emergency Services Screen

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useLocation } from '../../context/LocationContext';

const mockShelters = [
  { id: 1, name: 'Munnar Higher Secondary School Camp', district: 'Idukki', type: 'Relief Camp', capacity: '450 Citizens', status: 'OPEN', distance: '1.8 km' },
  { id: 2, name: 'Adimali Town Hall Emergency Shelter', district: 'Idukki', type: 'Relief Camp', capacity: '300 Citizens', status: 'OPEN', distance: '4.2 km' },
  { id: 3, name: 'Aluva Government Hospital Relief Wing', district: 'Ernakulam', type: 'Medical Facility', capacity: '120 Beds', status: 'ACTIVE', distance: '12.5 km' },
  { id: 4, name: 'Chalakudy Community Hall Center', district: 'Thrissur', type: 'Relief Camp', capacity: '500 Citizens', status: 'OPEN', distance: '18.0 km' },
];

export const LiveMapScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const location = useLocation();
  const [filter, setFilter] = useState<'all' | 'camps' | 'hospitals'>('all');

  return (
    <View style={styles.container}>
      <Header title="Live Map & Relief Camps" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Map Header Banner */}
        <View style={styles.mapBanner}>
          <Text style={styles.mapBannerTitle}>🗺️ Spatial Disaster Telemetry</Text>
          <Text style={styles.mapBannerLocation}>
            Location: {location.addressName} ({location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°)
          </Text>
        </View>

        {/* Filter Toggle */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, filter === 'all' && styles.filterChipActive]} onPress={() => setFilter('all')}>
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All Services</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterChip, filter === 'camps' && styles.filterChipActive]} onPress={() => setFilter('camps')}>
            <Text style={[styles.filterText, filter === 'camps' && styles.filterTextActive]}>🏕️ Relief Camps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterChip, filter === 'hospitals' && styles.filterChipActive]} onPress={() => setFilter('hospitals')}>
            <Text style={[styles.filterText, filter === 'hospitals' && styles.filterTextActive]}>🏥 Hospitals</Text>
          </TouchableOpacity>
        </View>

        {/* List of Emergency Centers */}
        <Text style={styles.sectionTitle}>Nearest Emergency Relief Centers</Text>

        {mockShelters.map((item) => (
          <View key={item.id} style={styles.shelterCard}>
            <View style={styles.shelterHeader}>
              <Text style={styles.shelterName}>{item.name}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.shelterDetails}>📍 {item.district} • {item.type} • Capacity: {item.capacity}</Text>
            <View style={styles.shelterFooter}>
              <Text style={styles.distanceText}>📏 {item.distance} from your phone GPS</Text>
              <TouchableOpacity style={styles.navigateBtn}>
                <Text style={styles.navigateText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  mapBanner: {
    backgroundColor: COLORS.darkHeader,
    padding: SPACING.lg,
    borderRadius: 14,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  mapBannerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  mapBannerLocation: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  filterChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: SPACING.md,
  },
  shelterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.small,
  },
  shelterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shelterName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate800,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: COLORS.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.greenAlert,
    fontSize: 10,
    fontWeight: '800',
  },
  shelterDetails: {
    fontSize: 12,
    color: COLORS.slate600,
    marginBottom: SPACING.sm,
  },
  shelterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
  },
  distanceText: {
    fontSize: 11,
    color: COLORS.slate500,
    fontWeight: '600',
  },
  navigateBtn: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  navigateText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
});

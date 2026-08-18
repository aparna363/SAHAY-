// SAHAY Emergency SOS & Incident Reporting Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useLocation } from '../../context/LocationContext';
import { submitIncidentReportApi, IncidentSeverity } from '../../api/apiClient';

const incidentCategories = [
  'Flood',
  'Waterlogging',
  'Landslide',
  'Road Blockage',
  'Fallen Tree',
  'Fire',
  'Lightning',
  'Building Damage',
  'Dam/River Issue',
  'Other',
];

export const EmergencySOSScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const location = useLocation();

  const [selectedCategory, setSelectedCategory] = useState('Flood');
  const [severity, setSeverity] = useState<IncidentSeverity>('HIGH');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitReport = async () => {
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please describe the incident or emergency situation.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitIncidentReportApi({
        incidentTypeName: selectedCategory,
        severity: severity,
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        locationAddress: location.addressName,
      });

      if (res.success) {
        Alert.alert(
          'Incident Dispatched',
          'Your incident report has been logged in SAHAY system and dispatched to District Control Room.',
          [{ text: 'OK', onPress: onBack }]
        );
      } else {
        Alert.alert('Report Submission Note', res.error || 'Failed to submit report');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network submission error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Report Incident / SOS" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* GPS Location Banner */}
        <View style={styles.gpsBanner}>
          <Text style={styles.gpsTitle}>📍 Real-Time Phone GPS Attached</Text>
          <Text style={styles.gpsCoords}>
            Lat: {location.latitude.toFixed(4)}°, Lng: {location.longitude.toFixed(4)}° ({location.district})
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>Disaster Incident Details</Text>

          {/* Incident Category Dropdown Grid */}
          <Text style={styles.label}>Select Incident Type *</Text>
          <View style={styles.categoryGrid}>
            {incidentCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Severity Picker */}
          <Text style={styles.label}>Emergency Severity Level *</Text>
          <View style={styles.severityRow}>
            {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as IncidentSeverity[]).map((sev) => (
              <TouchableOpacity
                key={sev}
                style={[
                  styles.severityChip,
                  severity === sev && {
                    backgroundColor:
                      sev === 'CRITICAL'
                        ? COLORS.redAlert
                        : sev === 'HIGH'
                        ? COLORS.orangeAlert
                        : COLORS.primary,
                  },
                ]}
                onPress={() => setSeverity(sev)}
              >
                <Text
                  style={[
                    styles.severityText,
                    severity === sev && { color: COLORS.white },
                  ]}
                >
                  {sev}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.label}>Incident Description & Urgent Needs *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe water level, blocked roads, injured persons, or trapped citizens..."
            placeholderTextColor={COLORS.slate400}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitReport} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>🚨 SUBMIT DISASTER REPORT</Text>
            )}
          </TouchableOpacity>
        </View>
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
  gpsBanner: {
    backgroundColor: COLORS.darkHeader,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  gpsTitle: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '800',
  },
  gpsCoords: {
    color: COLORS.white,
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.medium,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
    marginBottom: 6,
    marginTop: SPACING.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  categoryChip: {
    backgroundColor: COLORS.slate100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.md,
  },
  severityChip: {
    flex: 1,
    backgroundColor: COLORS.slate100,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate700,
  },
  textArea: {
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 10,
    padding: SPACING.md,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 13,
    color: COLORS.slate800,
    marginBottom: SPACING.lg,
  },
  submitBtn: {
    backgroundColor: COLORS.redAlert,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

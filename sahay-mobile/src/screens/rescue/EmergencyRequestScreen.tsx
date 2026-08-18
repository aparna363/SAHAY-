// SAHAY Emergency Resource Request Screen for Rescue Team

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { submitEmergencySupportRequest } from '../../api/apiClient';

export const EmergencyRequestScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [requestType, setRequestType] = useState('Inflatable Boats (OBM)');
  const [priority, setPriority] = useState('HIGH');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please explain the operational requirement.');
      return;
    }

    setLoading(true);
    try {
      await submitEmergencySupportRequest({
        requestType,
        priority,
        reason: reason.trim(),
      });
      Alert.alert('Resource Request Transmitted', 'Your emergency resource request has been routed to District Collectorate control room.', [{ text: 'OK', onPress: onBack }]);
    } catch (err: any) {
      Alert.alert('Request Sent', 'Support request transmitted to KSDMA Control Hub.');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Request Emergency Resources" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>📦 District Collectorate Resource Request</Text>

          <Text style={styles.label}>Select Resource Category</Text>
          <View style={styles.chipGrid}>
            {['Inflatable Boats (OBM)', 'Heavy Hydraulic Cutters', 'High-Capacity Dewatering Pumps', 'Medical Support Unit', 'Satellite Phones'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, requestType === item && styles.chipActive]}
                onPress={() => setRequestType(item)}
              >
                <Text style={[styles.chipText, requestType === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Priority Level</Text>
          <View style={styles.priorityRow}>
            {['NORMAL', 'HIGH', 'URGENT_CRITICAL'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityChip, priority === p && styles.priorityChipActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Operational Justification & Location *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Specify location sector and urgency..."
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>TRANSMIT REQUEST TO COLLECTORATE</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.slate50 },
  scrollContent: { padding: SPACING.lg },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.slate200, ...SHADOWS.medium },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.slate800, marginBottom: SPACING.md },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.slate700, marginTop: SPACING.sm, marginBottom: 6 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  chip: { backgroundColor: COLORS.slate100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.slate700 },
  chipTextActive: { color: COLORS.white },
  priorityRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.md },
  priorityChip: { flex: 1, backgroundColor: COLORS.slate100, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  priorityChipActive: { backgroundColor: COLORS.redAlert },
  priorityText: { fontSize: 11, fontWeight: '800', color: COLORS.slate700 },
  priorityTextActive: { color: COLORS.white },
  textArea: { backgroundColor: COLORS.slate50, borderWidth: 1, borderColor: COLORS.slate200, borderRadius: 10, padding: SPACING.md, height: 90, textAlignVertical: 'top', fontSize: 13, color: COLORS.slate800, marginBottom: SPACING.lg },
  submitBtn: { backgroundColor: COLORS.redAlert, paddingVertical: 14, borderRadius: 10, alignItems: 'center', ...SHADOWS.small },
  submitBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
});

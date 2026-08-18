// SAHAY Rescue Team Assigned Incidents & Operation Status Screen

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { fetchOfficialIncidents, updateRescueOperationStatus, IncidentReport, IncidentStatus } from '../../api/apiClient';

export const AssignedIncidentsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [remarks, setRemarks] = useState('');

  const loadIncidents = async () => {
    const res = await fetchOfficialIncidents(user?.district);
    if (res.incidents && res.incidents.length > 0) {
      setIncidents(res.incidents);
    } else {
      setIncidents([
        {
          id: 101,
          incidentCode: 'INC-2026-089',
          incidentTypeName: 'Flood / Stranded Citizens',
          severity: 'CRITICAL',
          description: '4 citizens trapped near Meenachil Riverbank due to sudden water level rise. High urgency.',
          latitude: 9.591,
          longitude: 76.522,
          locationAddress: 'Meenachil River Sector, Kottayam',
          status: 'RESPONSE_ASSIGNED',
          createdAt: new Date().toISOString(),
          citizen: { name: 'Suresh Kumar', phone: '9447100000', district: 'Kottayam' },
        },
        {
          id: 102,
          incidentCode: 'INC-2026-092',
          incidentTypeName: 'Fallen Tree / Blocked Road',
          severity: 'HIGH',
          description: 'Large banyan tree fallen across State Highway 1 blocking emergency ambulance passage.',
          latitude: 9.585,
          longitude: 76.515,
          locationAddress: 'SH-1 Highway Junction, Kottayam',
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          citizen: { name: 'Anil Varma', phone: '9847123456', district: 'Kottayam' },
        },
      ]);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncidents();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (id: number, newStatus: IncidentStatus) => {
    try {
      await updateRescueOperationStatus(id, newStatus, remarks || 'Status updated by Rescue Team Mobile App');
      Alert.alert('Status Updated', `Operation status updated to ${newStatus}`);
      setSelectedIncident(null);
      setRemarks('');
      loadIncidents();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update operation status');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Assigned Incidents" showBack onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>🚨 Assigned Emergency Incidents ({incidents.length})</Text>

        {incidents.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.code}>#{item.incidentCode}</Text>
              <View
                style={[
                  styles.severityBadge,
                  {
                    backgroundColor:
                      item.severity === 'CRITICAL' ? COLORS.redBg : COLORS.orangeBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.severityText,
                    {
                      color:
                        item.severity === 'CRITICAL' ? COLORS.redAlert : COLORS.orangeAlert,
                    },
                  ]}
                >
                  {item.severity}
                </Text>
              </View>
            </View>

            <Text style={styles.typeName}>{item.incidentTypeName}</Text>
            <Text style={styles.desc}>{item.description}</Text>

            <View style={styles.locBox}>
              <Text style={styles.locText}>📍 {item.locationAddress || 'Sector Location Attached'}</Text>
              {item.citizen && (
                <Text style={styles.citizenText}>👤 Reported by: {item.citizen.name} (📞 {item.citizen.phone})</Text>
              )}
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.currentStatusLabel}>Current Status:</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            {/* Status Change Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: COLORS.orangeAlert }]}
                onPress={() => handleUpdateStatus(item.id, 'IN_PROGRESS')}
              >
                <Text style={styles.statusBtnText}>Set IN PROGRESS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: COLORS.greenAlert }]}
                onPress={() => handleUpdateStatus(item.id, 'RESOLVED')}
              >
                <Text style={styles.statusBtnText}>Set RESOLVED</Text>
              </TouchableOpacity>
            </View>
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
  code: { fontSize: 15, fontWeight: '800', color: COLORS.slate800 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  severityText: { fontSize: 10, fontWeight: '900' },
  typeName: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark, marginBottom: 4 },
  desc: { fontSize: 12, color: COLORS.slate600, lineHeight: 18, marginBottom: SPACING.sm },
  locBox: { backgroundColor: COLORS.slate50, padding: SPACING.sm, borderRadius: 8, marginBottom: SPACING.md },
  locText: { fontSize: 11, fontWeight: '700', color: COLORS.slate700 },
  citizenText: { fontSize: 11, color: COLORS.slate500, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  currentStatusLabel: { fontSize: 12, color: COLORS.slate500, fontWeight: '600' },
  statusBadge: { backgroundColor: COLORS.primaryBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  statusBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
});

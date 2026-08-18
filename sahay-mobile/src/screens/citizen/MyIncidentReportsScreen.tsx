// SAHAY My Incident Reports Screen

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { fetchMyIncidentReports, IncidentReport } from '../../api/apiClient';

export const MyIncidentReportsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = async () => {
    const data = await fetchMyIncidentReports();
    setReports(data);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="My Emergency Reports" showBack onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>📋 Track Reported Incidents ({reports.length})</Text>

        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>You have not submitted any emergency incident reports yet.</Text>
          </View>
        ) : (
          reports.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.code}>#{item.incidentCode}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.typeText}>{item.incidentTypeName} • {item.severity} Severity</Text>
              <Text style={styles.desc}>{item.description}</Text>
              <Text style={styles.date}>Submitted: {new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.slate50 },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.slate800, marginBottom: SPACING.md },
  emptyCard: { backgroundColor: COLORS.white, padding: SPACING.xl, borderRadius: 12, alignItems: 'center' },
  emptyText: { color: COLORS.slate500, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.slate200, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  code: { fontSize: 14, fontWeight: '800', color: COLORS.slate800 },
  statusBadge: { backgroundColor: COLORS.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: COLORS.primaryDark, fontSize: 10, fontWeight: '800' },
  typeText: { fontSize: 12, fontWeight: '700', color: COLORS.slate700, marginBottom: 4 },
  desc: { fontSize: 12, color: COLORS.slate600, lineHeight: 18, marginBottom: 6 },
  date: { fontSize: 10, color: COLORS.slate400 },
});

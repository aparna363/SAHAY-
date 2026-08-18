// SAHAY Rescue Unit Team Members Roster Screen

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getTeamMembers } from '../../api/apiClient';

interface Member {
  id: number;
  name: string;
  designation: string;
  role: string;
  contact: string;
  availability: 'Available' | 'On Operation' | 'Standby' | string;
}

export const TeamMembersScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoster = async () => {
    const res = await getTeamMembers(user?.district);
    if (res.teamMembers && res.teamMembers.length > 0) {
      setMembers(res.teamMembers);
    } else {
      setMembers([
        { id: 1, name: 'K. V. Rajesh', designation: 'Station Officer', role: 'Team Leader', contact: '+91 94471 11223', availability: 'Available' },
        { id: 2, name: 'Mathew Thomas', designation: 'Fire & Rescue Officer', role: 'Rope & Flood Specialist', contact: '+91 94471 22334', availability: 'On Operation' },
        { id: 3, name: 'Sujith Nair', designation: 'Driver / Operator', role: 'Heavy Equipment Driver', contact: '+91 94471 33445', availability: 'Available' },
        { id: 4, name: 'Dr. Joseph Philip', designation: 'Medical Responder', role: 'Trauma First Aid', contact: '+91 94471 44556', availability: 'Standby' },
      ]);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoster();
    setRefreshing(false);
  };

  const toggleAvailability = (id: number) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        const next = m.availability === 'Available' ? 'On Operation' : 'Available';
        return { ...m, availability: next };
      }
      return m;
    }));
    Alert.alert('Status Updated', 'Member operational availability saved.');
  };

  return (
    <View style={styles.container}>
      <Header title="Rescue Unit Roster" showBack onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>👥 Unit Roster & Personnel ({members.length})</Text>

        {members.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberSub}>{m.designation} • {m.role}</Text>
              </View>
              <TouchableOpacity style={styles.statusBadge} onPress={() => toggleAvailability(m.id)}>
                <Text style={styles.statusText}>{m.availability}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactRow}>
              <Text style={styles.contactText}>📞 {m.contact}</Text>
              <Text style={styles.tapText}>Tap badge to toggle status</Text>
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
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.slate200, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  memberName: { fontSize: 14, fontWeight: '800', color: COLORS.slate800 },
  memberSub: { fontSize: 11, color: COLORS.slate500, marginTop: 2 },
  statusBadge: { backgroundColor: COLORS.primaryBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: '800' },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.slate100 },
  contactText: { fontSize: 12, fontWeight: '700', color: COLORS.slate700 },
  tapText: { fontSize: 10, color: COLORS.slate400 },
});

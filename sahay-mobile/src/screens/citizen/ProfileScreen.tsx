// SAHAY Profile & Settings Screen

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';

export const ProfileScreen: React.FC<{ onBack: () => void; onLogout: () => void }> = ({ onBack, onLogout }) => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <View style={styles.container}>
      <Header title="Profile & Settings" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>

          <Text style={styles.userName}>{user?.name || 'Authorized User'}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase() || 'CITIZEN'}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoVal}>{user?.phone || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoVal}>{user?.email || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoVal}>{user?.district || location.district}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Panchayat / Sector</Text>
            <Text style={styles.infoVal}>{user?.panchayat || location.panchayat}</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>🔒 Sign Out of SAHAY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.slate50 },
  scrollContent: { padding: SPACING.lg },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.slate200, ...SHADOWS.medium },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md, borderWidth: 2, borderColor: COLORS.primary },
  avatarText: { fontSize: 28, fontWeight: '800', color: COLORS.primaryDark },
  userName: { fontSize: 18, fontWeight: '800', color: COLORS.slate800 },
  userRole: { fontSize: 11, fontWeight: '800', color: COLORS.primary, backgroundColor: COLORS.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4, marginBottom: SPACING.xl },
  infoRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  infoLabel: { fontSize: 13, color: COLORS.slate500 },
  infoVal: { fontSize: 13, fontWeight: '700', color: COLORS.slate800 },
  logoutBtn: { width: '100%', backgroundColor: COLORS.redBg, borderWidth: 1, borderColor: COLORS.redBorder, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: SPACING.xl },
  logoutText: { color: COLORS.redAlert, fontSize: 14, fontWeight: '800' },
});

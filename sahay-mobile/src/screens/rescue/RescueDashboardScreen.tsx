// SAHAY Rescue Team Dashboard Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Header } from '../../components/Header';
import { LiveAlertTicker } from '../../components/LiveAlertTicker';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getRescueDashboardStats, RescueDashboardStats } from '../../api/apiClient';

interface RescueDashboardProps {
  onNavigateTab: (tab: string) => void;
  onLogout: () => void;
}

export const RescueDashboardScreen: React.FC<RescueDashboardProps> = ({ onNavigateTab, onLogout }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<RescueDashboardStats>({
    newAssignments: 3,
    activeOperations: 2,
    completedOperations: 14,
    teamStatus: 'Available',
    availableMembers: 8,
    totalMembers: 10,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadRescueStats = async () => {
    try {
      const res = await getRescueDashboardStats(user?.district);
      setStats(res.stats);
    } catch (err) {
      console.warn('Rescue stats load note:', err);
    }
  };

  useEffect(() => {
    loadRescueStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRescueStats();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="Rescue Team Control" />
      <LiveAlertTicker onPressAlerts={() => onNavigateTab('alerts')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Official Banner */}
        <View style={styles.officialHeader}>
          <View>
            <Text style={styles.unitName}>{user?.name || 'Kottayam Fire & Rescue Station'}</Text>
            <Text style={styles.unitSub}>
              Official ID: {user?.department_id || user?.departmentId || 'FRS-KTM-001'} • {user?.district || 'Kottayam'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Grid */}
        <Text style={styles.sectionTitle}>Operational Status Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: COLORS.redBg, borderColor: COLORS.redBorder }]}>
            <Text style={[styles.metricVal, { color: COLORS.redAlert }]}>{stats.newAssignments}</Text>
            <Text style={styles.metricLbl}>New Incident Assignments</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: COLORS.orangeBg, borderColor: COLORS.orangeBorder }]}>
            <Text style={[styles.metricVal, { color: COLORS.orangeAlert }]}>{stats.activeOperations}</Text>
            <Text style={styles.metricLbl}>Active Operations</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder }]}>
            <Text style={[styles.metricVal, { color: COLORS.greenAlert }]}>{stats.completedOperations}</Text>
            <Text style={styles.metricLbl}>Completed Operations</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryLight }]}>
            <Text style={[styles.metricVal, { color: COLORS.primaryDark }]}>
              {stats.availableMembers}/{stats.totalMembers}
            </Text>
            <Text style={styles.metricLbl}>Available Roster Members</Text>
          </View>
        </View>

        {/* Rescue Team Actions */}
        <Text style={styles.sectionTitle}>Rescue Team Quick Operations</Text>

        <View style={styles.actionStack}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigateTab('assigned-incidents')}>
            <Text style={styles.actionBtnIcon}>🚨</Text>
            <View style={styles.actionBtnInfo}>
              <Text style={styles.actionBtnTitle}>Assigned Incidents & Operations</Text>
              <Text style={styles.actionBtnSub}>View assigned disaster calls & update operation status</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigateTab('team-members')}>
            <Text style={styles.actionBtnIcon}>👥</Text>
            <View style={styles.actionBtnInfo}>
              <Text style={styles.actionBtnTitle}>Rescue Unit Team Members</Text>
              <Text style={styles.actionBtnSub}>Manage personnel roster & availability status</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigateTab('alerts')}>
            <Text style={styles.actionBtnIcon}>⚡</Text>
            <View style={styles.actionBtnInfo}>
              <Text style={styles.actionBtnTitle}>Operational Weather Alerts</Text>
              <Text style={styles.actionBtnSub}>Assigned zone alerts, raw metadata & source reference links</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigateTab('emergency-request')}>
            <Text style={styles.actionBtnIcon}>📦</Text>
            <View style={styles.actionBtnInfo}>
              <Text style={styles.actionBtnTitle}>Request Emergency Resources</Text>
              <Text style={styles.actionBtnSub}>Submit equipment & support requests to Collectorate</Text>
            </View>
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
  officialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.darkHeader,
    padding: SPACING.lg,
    borderRadius: 14,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  unitName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  unitSub: {
    color: COLORS.primaryLight,
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: SPACING.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  metricCard: {
    width: '47%',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '900',
  },
  metricLbl: {
    fontSize: 11,
    color: COLORS.slate700,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  actionStack: {
    gap: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.small,
  },
  actionBtnIcon: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  actionBtnInfo: {
    flex: 1,
  },
  actionBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  actionBtnSub: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },
});

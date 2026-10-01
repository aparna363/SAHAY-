// SAHAY Profile & Settings Screen - With Full System Settings

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';

export const ProfileScreen: React.FC<{ onBack: () => void; onLogout: () => void }> = ({ onBack, onLogout }) => {
  const { user } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');

  // System Settings State matching specification
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [accentColor, setAccentColor] = useState<'green' | 'blue' | 'purple'>('green');
  const [sidebar, setSidebar] = useState<'expanded' | 'collapsed'>('expanded');
  const [animations, setAnimations] = useState(true);

  // Notifications
  const [emergencyAlerts, setEmergencyAlerts] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [reliefUpdates, setReliefUpdates] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);

  // Language
  const [language, setLanguage] = useState<'English' | 'Malayalam' | 'Hindi'>('English');

  // Accessibility
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Location & Map
  const [autoDetectLocation, setAutoDetectLocation] = useState(true);
  const [shareLocationInSos, setShareLocationInSos] = useState(true);
  const [defaultMap, setDefaultMap] = useState<'Street' | 'Satellite' | 'Terrain'>('Street');

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveChanges = () => {
    setSaveSuccess(true);
    Alert.alert('Settings Saved', 'Your SAHAY System Settings have been updated successfully.');
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <View style={styles.container}>
      <Header title="Profile & Settings" showBack onBack={onBack} />

      {/* Top Segmented Tab Control */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            👤 Profile & Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'system' && styles.tabBtnActive]}
          onPress={() => setActiveTab('system')}
        >
          <Text style={[styles.tabText, activeTab === 'system' && styles.tabTextActive]}>
            ⚙️ System Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'profile' ? (
          /* Profile & Account View */
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
        ) : (
          /* System Settings View */
          <View style={styles.card}>
            <View style={styles.headerBlock}>
              <Text style={styles.settingsTitle}>⚙️ System Settings</Text>
              <Text style={styles.settingsSubtitle}>Configure appearance, notifications & preferences</Text>
            </View>

            {/* SECTION 1: Appearance */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Appearance</Text>
              <View style={styles.divider} />

              <Text style={styles.subHeader}>Theme</Text>
              <View style={styles.radioGroup}>
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.radioRow}
                    onPress={() => setTheme(t)}
                  >
                    <View style={[styles.radioCircle, theme === t && styles.radioCircleActive]}>
                      {theme === t && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.radioLabel}>
                      {t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'System Default'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.subHeader, { marginTop: 12 }]}>Accent Color</Text>
              <View style={styles.accentGroup}>
                {[
                  { id: 'green' as const, label: 'Green', color: '#059669' },
                  { id: 'blue' as const, label: 'Blue', color: '#2563eb' },
                  { id: 'purple' as const, label: 'Purple', color: '#7c3aed' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.accentBtn}
                    onPress={() => setAccentColor(c.id)}
                  >
                    <View style={[styles.radioCircle, accentColor === c.id && styles.radioCircleActive]}>
                      {accentColor === c.id && <View style={[styles.radioDot, { backgroundColor: c.color }]} />}
                    </View>
                    <View style={[styles.colorDot, { backgroundColor: c.color }]} />
                    <Text style={styles.radioLabel}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.subHeader, { marginTop: 12 }]}>Interface</Text>
              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Sidebar</Text>
                <TouchableOpacity
                  style={styles.badgePicker}
                  onPress={() => setSidebar(sidebar === 'expanded' ? 'collapsed' : 'expanded')}
                >
                  <Text style={styles.badgePickerText}>
                    {sidebar === 'expanded' ? 'Expanded ▼' : 'Collapsed ▼'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Animations</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, animations && styles.toggleBadgeOn]}
                  onPress={() => setAnimations(!animations)}
                >
                  <Text style={[styles.toggleBadgeText, animations && styles.toggleBadgeTextOn]}>
                    {animations ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 2: 🔔 Notifications */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🔔 Notifications</Text>
              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Emergency Alerts</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, emergencyAlerts && styles.toggleBadgeOn]}
                  onPress={() => setEmergencyAlerts(!emergencyAlerts)}
                >
                  <Text style={[styles.toggleBadgeText, emergencyAlerts && styles.toggleBadgeTextOn]}>
                    {emergencyAlerts ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Weather Alerts</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, weatherAlerts && styles.toggleBadgeOn]}
                  onPress={() => setWeatherAlerts(!weatherAlerts)}
                >
                  <Text style={[styles.toggleBadgeText, weatherAlerts && styles.toggleBadgeTextOn]}>
                    {weatherAlerts ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Relief Updates</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, reliefUpdates && styles.toggleBadgeOn]}
                  onPress={() => setReliefUpdates(!reliefUpdates)}
                >
                  <Text style={[styles.toggleBadgeText, reliefUpdates && styles.toggleBadgeTextOn]}>
                    {reliefUpdates ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Notification Sound</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, notificationSound && styles.toggleBadgeOn]}
                  onPress={() => setNotificationSound(!notificationSound)}
                >
                  <Text style={[styles.toggleBadgeText, notificationSound && styles.toggleBadgeTextOn]}>
                    {notificationSound ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 3: 🌐 Language */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🌐 Language</Text>
              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>{language}</Text>
                <TouchableOpacity
                  style={styles.badgePicker}
                  onPress={() => {
                    if (language === 'English') setLanguage('Malayalam');
                    else if (language === 'Malayalam') setLanguage('Hindi');
                    else setLanguage('English');
                  }}
                >
                  <Text style={styles.badgePickerText}>[▼]</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 4: ♿ Accessibility */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>♿ Accessibility</Text>
              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>High Contrast</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, highContrast && styles.toggleBadgeOn]}
                  onPress={() => setHighContrast(!highContrast)}
                >
                  <Text style={[styles.toggleBadgeText, highContrast && styles.toggleBadgeTextOn]}>
                    {highContrast ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Large Text</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, largeText && styles.toggleBadgeOn]}
                  onPress={() => setLargeText(!largeText)}
                >
                  <Text style={[styles.toggleBadgeText, largeText && styles.toggleBadgeTextOn]}>
                    {largeText ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Reduced Motion</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, reducedMotion && styles.toggleBadgeOn]}
                  onPress={() => setReducedMotion(!reducedMotion)}
                >
                  <Text style={[styles.toggleBadgeText, reducedMotion && styles.toggleBadgeTextOn]}>
                    {reducedMotion ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 5: 📍 Location & Map */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>📍 Location & Map</Text>
              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Auto Detect Location</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, autoDetectLocation && styles.toggleBadgeOn]}
                  onPress={() => setAutoDetectLocation(!autoDetectLocation)}
                >
                  <Text style={[styles.toggleBadgeText, autoDetectLocation && styles.toggleBadgeTextOn]}>
                    {autoDetectLocation ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Share Location in SOS</Text>
                <TouchableOpacity
                  style={[styles.toggleBadge, shareLocationInSos && styles.toggleBadgeOn]}
                  onPress={() => setShareLocationInSos(!shareLocationInSos)}
                >
                  <Text style={[styles.toggleBadgeText, shareLocationInSos && styles.toggleBadgeTextOn]}>
                    {shareLocationInSos ? '● ON' : '○ OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.rowLabel}>Default Map</Text>
                <TouchableOpacity
                  style={styles.badgePicker}
                  onPress={() => {
                    if (defaultMap === 'Street') setDefaultMap('Satellite');
                    else if (defaultMap === 'Satellite') setDefaultMap('Terrain');
                    else setDefaultMap('Street');
                  }}
                >
                  <Text style={styles.badgePickerText}>{defaultMap} [▼]</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.slate50 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.slate200, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.slate500 },
  tabTextActive: { color: COLORS.primaryDark, fontWeight: '800' },
  scrollContent: { padding: SPACING.lg },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.slate200, ...SHADOWS.medium },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md, borderWidth: 2, borderColor: COLORS.primary, alignSelf: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: COLORS.primaryDark },
  userName: { fontSize: 18, fontWeight: '800', color: COLORS.slate800, alignSelf: 'center' },
  userRole: { fontSize: 11, fontWeight: '800', color: COLORS.primary, backgroundColor: COLORS.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4, marginBottom: SPACING.xl, alignSelf: 'center' },
  infoRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  infoLabel: { fontSize: 13, color: COLORS.slate500 },
  infoVal: { fontSize: 13, fontWeight: '700', color: COLORS.slate800 },
  logoutBtn: { width: '100%', backgroundColor: COLORS.redBg, borderWidth: 1, borderColor: COLORS.redBorder, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: SPACING.xl },
  logoutText: { color: COLORS.redAlert, fontSize: 14, fontWeight: '800' },

  // System Settings styles
  headerBlock: { marginBottom: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.slate100, paddingBottom: SPACING.md },
  settingsTitle: { fontSize: 20, fontWeight: '900', color: COLORS.slate900 },
  settingsSubtitle: { fontSize: 12, color: COLORS.slate500, marginTop: 2 },
  section: { marginBottom: SPACING.lg },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: COLORS.slate800, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: COLORS.slate200, marginVertical: 8 },
  subHeader: { fontSize: 12, fontWeight: '700', color: COLORS.slate600, marginBottom: 6 },
  radioGroup: { flexDirection: 'column', gap: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.slate400, justifyContent: 'center', alignItems: 'center' },
  radioCircleActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  radioLabel: { fontSize: 13, color: COLORS.slate800, fontWeight: '600' },
  accentGroup: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  accentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 13, color: COLORS.slate700, fontWeight: '600' },
  badgePicker: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.slate100, borderRadius: 8, borderWidth: 1, borderColor: COLORS.slate300 },
  badgePickerText: { fontSize: 12, fontWeight: '700', color: COLORS.slate800 },
  toggleBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.slate200, borderRadius: 8 },
  toggleBadgeOn: { backgroundColor: COLORS.primary },
  toggleBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.slate600 },
  toggleBadgeTextOn: { color: COLORS.white },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: SPACING.md, ...SHADOWS.small },
  saveBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});

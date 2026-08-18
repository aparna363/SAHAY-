// SAHAY Official / Rescue Team Login Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface OfficialLoginScreenProps {
  onNavigateCitizenLogin: () => void;
  onBack: () => void;
}

export const OfficialLoginScreen: React.FC<OfficialLoginScreenProps> = ({
  onNavigateCitizenLogin,
  onBack,
}) => {
  const { t } = useLanguage();
  const { login } = useAuth();

  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOfficialLogin = async () => {
    if (!phoneOrEmail.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter your official ID / Email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login({
        phoneOrEmail: phoneOrEmail.trim(),
        password: password.trim(),
        role: 'rescue_team',
      });

      if (user.status !== 'approved' && user.status !== 'active') {
        Alert.alert(
          'Pending Approval',
          `Station account is PENDING APPROVAL by District Collector of ${user.district || 'your district'}.`
        );
      }
    } catch (err: any) {
      Alert.alert('Official Login Failed', err.message || 'Invalid official credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Rescue Team & Official Login" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>GOVERNMENT DISASTER RESPONSE</Text>
          </View>

          <Text style={styles.title}>🛡️ {t.officialLoginTitle}</Text>
          <Text style={styles.subtitle}>
            Authorized portal for Fire & Rescue, NDRF, Police Disaster Wing, and KSDMA Officials.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Official Unit ID / Email / Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. FRS-KTM-001 or rescue@kerala.gov.in"
              placeholderTextColor={COLORS.slate400}
              value={phoneOrEmail}
              onChangeText={setPhoneOrEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.password}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter official password"
              placeholderTextColor={COLORS.slate400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleOfficialLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginBtnText}>Sign In as Rescue Official</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: SPACING.xl }} onPress={onNavigateCitizenLogin}>
            <Text style={styles.citizenLinkText}>👤 Switch to Citizen Login</Text>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  badge: {
    backgroundColor: COLORS.redBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: SPACING.md,
  },
  badgeText: {
    color: COLORS.redAlert,
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.slate500,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 18,
  },
  inputGroup: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.slate800,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: COLORS.redAlert,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.small,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  citizenLinkText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
});

// SAHAY Citizen Login Screen - Connects to Real SAHAY Node.js Backend

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
  Image,
} from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onNavigateRegister: (role: 'citizen' | 'official') => void;
  onNavigateOfficialLogin: () => void;
  onBack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateRegister,
  onNavigateOfficialLogin,
  onBack,
}) => {
  const { t } = useLanguage();
  const { login } = useAuth();

  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneOrEmail.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number/email and password.');
      return;
    }

    setLoading(true);
    try {
      await login({
        phoneOrEmail: phoneOrEmail.trim(),
        password: password.trim(),
        role: 'citizen',
      });
      // Successful login automatically updates AuthContext -> routes to Citizen Dashboard
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Invalid credentials or connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t.citizenLogin} showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Image
            source={require('../../../assets/logo_sahay.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t.citizenLogin}</Text>
          <Text style={styles.subtitle}>Enter your credentials to access citizen disaster services.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.phoneOrEmail}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210 or email@kerala.gov.in"
              placeholderTextColor={COLORS.slate400}
              value={phoneOrEmail}
              onChangeText={setPhoneOrEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.password}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={COLORS.slate400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginBtnText}>{t.signInBtn}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => onNavigateRegister('citizen')}>
              <Text style={styles.linkText}>{t.donthaveAccount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: SPACING.md }} onPress={onNavigateOfficialLogin}>
              <Text style={styles.officialLinkText}>🛡️ Switch to Rescue Team / Official Login</Text>
            </TouchableOpacity>
          </View>
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
    borderColor: COLORS.slate200,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.slate500,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
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
    backgroundColor: COLORS.primary,
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
  footerLinks: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  officialLinkText: {
    color: COLORS.redAlert,
    fontSize: 13,
    fontWeight: '700',
  },
});

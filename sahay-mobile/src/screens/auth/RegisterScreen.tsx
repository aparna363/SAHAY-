// SAHAY Registration Screen - Citizen & Official Registration Flow

import React, { useState, useEffect } from 'react';
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
import { getDistricts } from '../../api/apiClient';

interface RegisterScreenProps {
  initialRole?: 'citizen' | 'official';
  onNavigateLogin: () => void;
  onNavigateOfficialLogin: () => void;
  onBack: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  initialRole = 'citizen',
  onNavigateLogin,
  onNavigateOfficialLogin,
  onBack,
}) => {
  const { t } = useLanguage();
  const { register } = useAuth();

  const [role, setRole] = useState<'citizen' | 'rescue_team'>(
    initialRole === 'official' ? 'rescue_team' : 'citizen'
  );
  const [districts, setDistricts] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Idukki');
  const [panchayat, setPanchayat] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDistricts().then(setDistricts);
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please fill in required fields (Name, Phone, Password).');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password: password.trim(),
        role: role,
        district: selectedDistrict,
        panchayat: panchayat.trim() || undefined,
        departmentId: departmentId.trim() || undefined,
        designation: designation.trim() || undefined,
      });

      if (role === 'rescue_team') {
        Alert.alert(
          'Registration Submitted',
          `Your official station registration is PENDING APPROVAL by District Collector of ${selectedDistrict}.`,
          [{ text: 'OK', onPress: onNavigateOfficialLogin }]
        );
      }
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Error creating account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t.register} showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>{t.register}</Text>
          <Text style={styles.subtitle}>Create a SAHAY disaster response account.</Text>

          {/* Account Role Toggle */}
          <View style={styles.roleToggleContainer}>
            <TouchableOpacity
              style={[styles.roleOption, role === 'citizen' && styles.roleOptionActive]}
              onPress={() => setRole('citizen')}
            >
              <Text style={[styles.roleText, role === 'citizen' && styles.roleTextActive]}>
                👤 Citizen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, role === 'rescue_team' && styles.roleOptionActive]}
              onPress={() => setRole('rescue_team')}
            >
              <Text style={[styles.roleText, role === 'rescue_team' && styles.roleTextActive]}>
                🛡️ Rescue Team
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.fullName} *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.password} *</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* District Picker Buttons */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.selectDistrict} *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
              {districts.map((dist) => (
                <TouchableOpacity
                  key={dist}
                  style={[
                    styles.districtChip,
                    selectedDistrict === dist && styles.districtChipActive,
                  ]}
                  onPress={() => setSelectedDistrict(dist)}
                >
                  <Text
                    style={[
                      styles.districtChipText,
                      selectedDistrict === dist && styles.districtChipTextActive,
                    ]}
                  >
                    {dist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {role === 'citizen' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.panchayat}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Munnar Grama Panchayat"
                value={panchayat}
                onChangeText={setPanchayat}
              />
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Station / Unit ID *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. FRS-KTM-001 or NDRF-10-BN"
                  value={departmentId}
                  onChangeText={setDepartmentId}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Official Designation</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Station Officer / Team Leader"
                  value={designation}
                  onChangeText={setDesignation}
                />
              </View>
            </>
          )}

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.registerBtnText}>{t.registerBtn}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: SPACING.lg }} onPress={onNavigateLogin}>
            <Text style={styles.linkText}>{t.alreadyHaveAccount}</Text>
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
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    ...SHADOWS.medium,
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
    marginBottom: SPACING.lg,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate100,
    borderRadius: 10,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleOptionActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  roleTextActive: {
    color: COLORS.primaryDark,
  },
  inputGroup: {
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
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.slate800,
  },
  districtScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  districtChip: {
    backgroundColor: COLORS.slate100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 6,
  },
  districtChipActive: {
    backgroundColor: COLORS.primary,
  },
  districtChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  districtChipTextActive: {
    color: COLORS.white,
  },
  registerBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.small,
  },
  registerBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  linkText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});

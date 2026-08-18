// SAHAY Header Component - Replicating Web TopHeader & Navbar Exactly

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';

interface HeaderProps {
  onOpenContacts?: () => void;
  onOpenLogin?: () => void;
  onOpenRegister?: (role: 'citizen' | 'official') => void;
  onOpenOfficialLogin?: () => void;
  onNavigateTab?: (tab: string) => void;
  activeTab?: string;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenContacts,
  onOpenLogin,
  onOpenRegister,
  onOpenOfficialLogin,
  onNavigateTab,
  activeTab = 'home',
  title,
  showBack,
  onBack,
}) => {
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();

  return (
    <View style={styles.container}>
      {/* 1. Top Government Banner (#043e2e) */}
      <View style={styles.topGovtHeader}>
        {/* Left: Emblem Box + Government Text */}
        <View style={styles.govtLeftBox}>
          <View style={styles.shieldIconBox}>
            <Text style={styles.shieldIconText}>🛡️</Text>
          </View>
          <View>
            <Text style={styles.govtTitleText}>{t.govtKerala}</Text>
            <Text style={styles.govtSubText}>{t.deptDisaster}</Text>
          </View>
        </View>

        {/* Right: Badges Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
          {/* Location Badge */}
          <View style={styles.locationPill}>
            <Text style={styles.locationPillText}>📍 {location.addressName || `${location.district}, Kerala`}</Text>
          </View>



          {/* Emergency 112 */}
          <TouchableOpacity style={styles.emergencyPill} onPress={onOpenContacts}>
            <Text style={styles.emergencyPillText}>📞 {t.emergency}: <Text style={{ color: COLORS.white, fontWeight: '900' }}>112</Text></Text>
          </TouchableOpacity>

          {/* Helpline 1077 */}
          <TouchableOpacity style={styles.helplinePill} onPress={onOpenContacts}>
            <Text style={styles.helplinePillText}>((·)) {t.helpline}: <Text style={{ color: COLORS.white, fontWeight: '900' }}>1077</Text></Text>
          </TouchableOpacity>

          {/* Language Selector Dropdown */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setLang(lang === 'en' ? 'ml' : 'en')}
          >
            <Text style={styles.langPillText}>🌐 {lang === 'en' ? 'English (EN) ▾' : 'മലയാളം (ML) ▾'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 2. Main White Navbar Bar (#ffffff) */}
      <View style={styles.mainNavbar}>
        <View style={styles.brandRow}>
          {showBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}

          {/* Circular Logo Wrapper */}
          <TouchableOpacity
            style={styles.logoCircleWrapper}
            onPress={() => onNavigateTab && onNavigateTab('home')}
            activeOpacity={0.8}
          >
            <Image
              source={require('../../assets/logo_sahay.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Title & Tagline */}
          <TouchableOpacity onPress={() => onNavigateTab && onNavigateTab('home')}>
            <Text style={styles.brandTitle}>SAHAY</Text>
            <Text style={styles.brandTagline}>
              {lang === 'ml' ? 'ഒരുമിച്ച് ശക്തർ, എന്നേക്കും സുരക്ഷിതർ' : 'Stronger Together, Safer Forever'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons: Login & Register */}
        <View style={styles.navActionsRow}>
          {onOpenLogin && (
            <TouchableOpacity style={styles.loginBtnOutline} onPress={onOpenLogin}>
              <Text style={styles.loginBtnOutlineText}>➔ {t.login}</Text>
            </TouchableOpacity>
          )}

          {onOpenRegister && (
            <TouchableOpacity
              style={styles.registerBtnSolid}
              onPress={() => onOpenRegister('citizen')}
            >
              <Text style={styles.registerBtnSolidText}>{t.register} ▾</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Navigation Pill Bar (#f0fdf4) */}
      {onNavigateTab && (
        <View style={styles.navPillContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navPillScroll}>
            {[
              { id: 'home', label: t.navHome },
              { id: 'alerts', label: t.navAlerts },
              { id: 'live-map', label: t.navLiveMap },
              { id: 'emergency', label: t.navEmergency },
              { id: 'river-status', label: t.navRiverStatus },
              { id: 'news', label: t.navNews },
              { id: 'preparedness', label: t.navPreparedness },
              { id: 'contacts', label: t.navContacts },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navPillChip,
                    isActive && styles.navPillChipActive,
                  ]}
                  onPress={() => onNavigateTab(item.id)}
                >
                  <Text
                    style={[
                      styles.navPillChipText,
                      isActive && styles.navPillChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  topGovtHeader: {
    backgroundColor: COLORS.govtHeader,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.govtHeaderBorder,
  },
  govtLeftBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  shieldIconBox: {
    backgroundColor: '#065f46',
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  shieldIconText: {
    fontSize: 14,
  },
  govtTitleText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  govtSubText: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '600',
  },
  badgesScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  locationPillText: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '700',
  },
  officialPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  officialPillText: {
    color: '#fcd34d',
    fontSize: 10,
    fontWeight: '900',
  },
  emergencyPill: {
    backgroundColor: 'rgba(6, 95, 70, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  emergencyPillText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  helplinePill: {
    backgroundColor: 'rgba(6, 95, 70, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  helplinePillText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  langPill: {
    backgroundColor: '#032e22',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langPillText: {
    color: '#a7f3d0',
    fontSize: 10,
    fontWeight: '700',
  },

  // Main White Navbar
  mainNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    marginRight: 4,
    padding: 2,
  },
  backIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate800,
  },
  logoCircleWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  logoImage: {
    width: '110%',
    height: '110%',
  },
  brandTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  brandTagline: {
    color: COLORS.primaryDark,
    fontSize: 9,
    fontWeight: '700',
  },
  navActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loginBtnOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  loginBtnOutlineText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  registerBtnSolid: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  registerBtnSolidText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },

  // Navigation Pill Bar
  navPillContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  navPillScroll: {
    paddingHorizontal: SPACING.md,
    gap: 4,
  },
  navPillChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  navPillChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  navPillChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  navPillChipTextActive: {
    color: COLORS.white,
  },
});

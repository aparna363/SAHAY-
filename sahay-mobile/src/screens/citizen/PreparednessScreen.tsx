// SAHAY Disaster Preparedness Guide Screen

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Header } from '../../components/Header';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';

export const PreparednessScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <Header title="Disaster Preparedness" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🛡️ Official Disaster Safety Guidelines</Text>

        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>🌊 Flood Safety Protocol</Text>
          <Text style={styles.bullet}>• Pack Emergency Go-Bag: Essential documents, medicines, flashlight, power bank.</Text>
          <Text style={styles.bullet}>• Move to higher ground immediately when water levels rise near home.</Text>
          <Text style={styles.bullet}>• Do not walk or drive through moving flood waters.</Text>
          <Text style={styles.bullet}>• Switch off main electric power supply and gas cylinders before evacuating.</Text>
        </View>

        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>⛰️ Landslide Preparedness</Text>
          <Text style={styles.bullet}>• Avoid travel on steep slopes during heavy rain warnings.</Text>
          <Text style={styles.bullet}>• Watch for unusual sounds like cracking trees or rolling boulders.</Text>
          <Text style={styles.bullet}>• Evacuate promptly if ordered by KSDMA or District Collectorate.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.slate50 },
  scrollContent: { padding: SPACING.lg },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.slate800, marginBottom: SPACING.md },
  guideCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.slate200, ...SHADOWS.small },
  guideTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primaryDark, marginBottom: SPACING.sm },
  bullet: { fontSize: 13, color: COLORS.slate700, lineHeight: 20, marginBottom: 6 },
});

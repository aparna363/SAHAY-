// SAHAY Emergency Contacts Modal Overlay

import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

interface EmergencyContactsModalProps {
  visible: boolean;
  onClose: () => void;
}

const emergencyNumbers = [
  { name: 'Disaster Control Room (KSDMA)', number: '1077', desc: 'Toll-free 24/7 disaster helpline', icon: '🚨' },
  { name: 'State Emergency Response', number: '112', desc: 'Unified national emergency hotline', icon: '📞' },
  { name: 'Fire & Rescue Force', number: '101', desc: 'Fire, flood & rescue operations', icon: '🚒' },
  { name: 'Medical Emergency & Ambulance', number: '108', desc: 'Kerala state emergency ambulance', icon: '🚑' },
  { name: 'Police Control Room', number: '100', desc: 'State police emergency dispatch', icon: '👮' },
  { name: 'Women Safety Helpline', number: '1091', desc: '24/7 women assistance', icon: '🛡️' },
];

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({ visible, onClose }) => {
  const { t } = useLanguage();

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>📞 {t.btnEmergencyContacts}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {emergencyNumbers.map((item, index) => (
              <View key={index} style={styles.card}>
                <Text style={styles.icon}>{item.icon}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>
                <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item.number)}>
                  <Text style={styles.callText}>Call {item.number}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  closeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.slate500,
  },
  list: {
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate50,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  icon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  cardDesc: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: COLORS.redAlert,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
});

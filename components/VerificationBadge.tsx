import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Shield, X, CheckCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';

type VerificationBadgeProps = {
  isVerified?: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
};

export default function VerificationBadge({ 
  isVerified = false, 
  size = 'medium', 
  showLabel = false 
}: VerificationBadgeProps) {
  const [showModal, setShowModal] = useState<boolean>(false);

  if (!isVerified) {
    return null;
  }

  const sizeConfig = {
    small: { iconSize: 16, fontSize: 12, padding: 4 },
    medium: { iconSize: 20, fontSize: 14, padding: 6 },
    large: { iconSize: 24, fontSize: 16, padding: 8 },
  };

  const config = sizeConfig[size];

  return (
    <>
      <TouchableOpacity 
        style={[styles.badge, { padding: config.padding }]} 
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Shield size={config.iconSize} color={theme.colors.blue[600]} />
        {showLabel && (
          <Text style={[styles.badgeText, { fontSize: config.fontSize }]}>
            RevoVend Verified
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <CheckCircle size={24} color={theme.colors.green[600]} />
                <Text style={styles.modalTitle}>RevoVend Verified Account</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.gray[600]} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                A RevoVend Verified Account indicates that this business has provided legitimate 
                government tax information and is a verified, tax-paying business in good standing.
              </Text>
              
              <View style={styles.verificationDetails}>
                <Text style={styles.detailsTitle}>Verification includes:</Text>
                <View style={styles.detailsList}>
                  <Text style={styles.detailItem}>• Business type (LLC, Corporation, etc.)</Text>
                  <Text style={styles.detailItem}>• Federal EIN (Employer Identification Number)</Text>
                  <Text style={styles.detailItem}>• DUNS number (when applicable)</Text>
                  <Text style={styles.detailItem}>• Government business registration verification</Text>
                </View>
              </View>
              
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>Verified businesses receive:</Text>
                <View style={styles.benefitsList}>
                  <Text style={styles.benefitItem}>• 5% discount on yearly subscriptions</Text>
                  <Text style={styles.benefitItem}>• Enhanced profile visibility</Text>
                  <Text style={styles.benefitItem}>• Increased trust from contractors and hosts</Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.blue[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.blue[200],
    gap: 4,
  },
  badgeText: {
    color: theme.colors.blue[700],
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text.primary,
  },
  verificationDetails: {
    backgroundColor: theme.colors.gray[50],
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  detailsList: {
    gap: 4,
  },
  detailItem: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  benefitsSection: {
    backgroundColor: theme.colors.green[50],
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.green[800],
  },
  benefitsList: {
    gap: 4,
  },
  benefitItem: {
    fontSize: 14,
    color: theme.colors.green[700],
    lineHeight: 20,
  },
});
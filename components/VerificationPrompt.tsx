import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Shield, AlertTriangle, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { router } from 'expo-router';

interface VerificationPromptProps {
  visible: boolean;
  onClose: () => void;
  userType: 'contractor' | 'business_owner' | 'event_host';
  action: 'apply_to_job' | 'hire_contractor' | 'accept_payment' | 'send_proposal';
  message: string;
}

function getActionText(action: string): string {
  switch (action) {
    case 'apply_to_job':
      return 'apply for this position';
    case 'hire_contractor':
      return 'hire contractors';
    case 'accept_payment':
      return 'accept payments';
    case 'send_proposal':
      return 'send proposals';
    default:
      return 'continue';
  }
}

function getUserTypeText(userType: string): string {
  switch (userType) {
    case 'contractor':
      return 'Contractor';
    case 'business_owner':
      return 'Business Owner';
    case 'event_host':
      return 'Event Host';
    default:
      return 'User';
  }
}

export default function VerificationPrompt({ 
  visible, 
  onClose, 
  userType, 
  action, 
  message 
}: VerificationPromptProps) {
  const handleStartVerification = () => {
    onClose();
    router.push('/id-verification');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={theme.colors.gray[500]} />
          </TouchableOpacity>
          
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color={theme.colors.orange[500]} />
            </View>
            
            <Text style={styles.title}>ID Verification Required</Text>
            
            <Text style={styles.subtitle}>
              {getUserTypeText(userType)} Verification Needed
            </Text>
            
            <Text style={styles.message}>
              {message}
            </Text>
            
            <Text style={styles.description}>
              You need to verify your identity to {getActionText(action)}. This helps maintain trust and security on the platform.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleStartVerification}
              >
                <Shield size={20} color={theme.colors.white} />
                <Text style={styles.primaryButtonText}>Start Verification</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onClose}
              >
                <Text style={styles.secondaryButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.orange[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.orange[600],
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blue[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
});
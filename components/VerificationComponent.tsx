import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { Shield, CheckCircle, AlertCircle, ExternalLink, Loader } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/auth-store';

type VerificationStatus = 'not_started' | 'in_progress' | 'verified' | 'failed' | 'requires_input';

function getVerificationMessage(userType?: string, action?: string): string {
  if (userType === 'contractor' && action === 'apply_to_job') {
    return 'ID verification is required to apply for contractor positions. This helps build trust with business owners and increases your chances of being selected.';
  }
  if (userType === 'business_owner' && (action === 'hire_contractor' || action === 'send_proposal')) {
    return 'ID verification is required to hire contractors and send proposals. This ensures secure transactions and builds trust in the platform.';
  }
  if (userType === 'event_host' && action === 'accept_payment') {
    return 'ID verification is required to accept payments from business owners. This protects both parties and ensures secure financial transactions.';
  }
  return 'Verify your identity with a government-issued ID to increase trust and unlock premium features.';
}

function getBenefitsList(userType?: string): string[] {
  if (userType === 'contractor') {
    return [
      'Enhanced profile visibility',
      'Higher priority in contractor selection',
      'Access to premium events',
      'Increased earning potential',
      'Trusted contractor badge'
    ];
  }
  if (userType === 'business_owner') {
    return [
      'Ability to hire verified contractors',
      'Send proposals to event hosts',
      'Enhanced business credibility',
      'Access to premium features',
      'Verified business badge'
    ];
  }
  if (userType === 'event_host') {
    return [
      'Accept payments from business owners',
      'Enhanced host credibility',
      'Access to verified contractors',
      'Premium event features',
      'Verified host badge'
    ];
  }
  return [
    'Enhanced profile visibility',
    'Access to premium features',
    'Increased platform trust',
    'Verified user badge'
  ];
}

interface VerificationComponentProps {
  onVerificationComplete?: () => void;
  userType?: 'contractor' | 'business_owner' | 'event_host';
  action?: 'apply_to_job' | 'hire_contractor' | 'accept_payment' | 'send_proposal';
}

export default function VerificationComponent({ onVerificationComplete, userType, action }: VerificationComponentProps) {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_started');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  const createSessionMutation = trpc.verification.createSession.useMutation();
  const checkStatusQuery = trpc.verification.checkStatus.useQuery(
    { sessionId: sessionId || '' },
    { 
      enabled: !!sessionId,
      refetchInterval: 3000, // Poll every 3 seconds
    }
  );

  useEffect(() => {
    if (checkStatusQuery.data) {
      const data = checkStatusQuery.data;
      
      if (data.isSuccessful) {
        setVerificationStatus('verified');
        onVerificationComplete?.();
      } else if (data.status === 'requires_input') {
        setVerificationStatus('requires_input');
      } else if (data.status === 'canceled') {
        setVerificationStatus('failed');
      } else if (data.status === 'processing') {
        setVerificationStatus('in_progress');
      }
    }
  }, [checkStatusQuery.data, onVerificationComplete]);

  const handleStartVerification = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const returnUrl = Platform.select({
        web: `${window.location.origin}/verification-return`,
        default: 'revovend://verification-return'
      });

      const result = await createSessionMutation.mutateAsync({
        returnUrl: returnUrl || 'revovend://verification-return'
      });

      setSessionId(result.sessionId);
      setVerificationUrl(result.url);
      setVerificationStatus('in_progress');

      // Open verification URL
      if (result.url) {
        if (Platform.OS === 'web') {
          window.open(result.url, '_blank');
        } else {
          await Linking.openURL(result.url);
        }
      }
    } catch (error) {
      console.error('Failed to start verification:', error);
      Alert.alert(
        'Verification Error',
        'Failed to start ID verification. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryVerification = () => {
    if (verificationUrl) {
      if (Platform.OS === 'web') {
        window.open(verificationUrl, '_blank');
      } else {
        Linking.openURL(verificationUrl);
      }
    }
  };

  const renderVerificationStatus = () => {
    switch (verificationStatus) {
      case 'not_started':
        return (
          <View style={styles.statusContainer}>
            <Shield size={48} color={theme.colors.gray[400]} />
            <Text style={styles.statusTitle}>ID Verification Required</Text>
            <Text style={styles.statusDescription}>
              {getVerificationMessage(userType, action)}
            </Text>
            <View style={styles.benefitsList}>
              {getBenefitsList(userType).map((benefit, index) => (
                <Text key={index} style={styles.benefitItem}>• {benefit}</Text>
              ))}
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartVerification}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader size={20} color={theme.colors.white} />
              ) : (
                <>
                  <Shield size={20} color={theme.colors.white} />
                  <Text style={styles.primaryButtonText}>Start ID Verification</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'in_progress':
        return (
          <View style={styles.statusContainer}>
            <Loader size={48} color={theme.colors.blue[600]} />
            <Text style={styles.statusTitle}>Verification in Progress</Text>
            <Text style={styles.statusDescription}>
              Please complete the verification process in the opened window/app. This may take a few minutes.
            </Text>
            {verificationUrl && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleRetryVerification}
              >
                <ExternalLink size={20} color={theme.colors.blue[600]} />
                <Text style={styles.secondaryButtonText}>Open Verification Again</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'requires_input':
        return (
          <View style={styles.statusContainer}>
            <AlertCircle size={48} color={theme.colors.orange[500]} />
            <Text style={styles.statusTitle}>Additional Input Required</Text>
            <Text style={styles.statusDescription}>
              Your verification needs additional information. Please complete the process.
            </Text>
            {verificationUrl && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRetryVerification}
              >
                <ExternalLink size={20} color={theme.colors.white} />
                <Text style={styles.primaryButtonText}>Continue Verification</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'verified':
        return (
          <View style={styles.statusContainer}>
            <CheckCircle size={48} color={theme.colors.green[600]} />
            <Text style={styles.statusTitle}>ID Verified Successfully!</Text>
            <Text style={styles.statusDescription}>
              Your identity has been verified. You now have access to premium features and enhanced visibility.
            </Text>
            <View style={styles.verifiedBadge}>
              <Shield size={16} color={theme.colors.blue[600]} />
              <Text style={styles.verifiedBadgeText}>RevoVend Verified</Text>
            </View>
          </View>
        );

      case 'failed':
        return (
          <View style={styles.statusContainer}>
            <AlertCircle size={48} color={theme.colors.red[500]} />
            <Text style={styles.statusTitle}>Verification Failed</Text>
            <Text style={styles.statusDescription}>
              ID verification was unsuccessful. Please try again with a different document or contact support.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartVerification}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader size={20} color={theme.colors.white} />
              ) : (
                <>
                  <Shield size={20} color={theme.colors.white} />
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderVerificationStatus()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  benefitsList: {
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 16,
  },
  benefitItem: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.blue[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.blue[50],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.blue[200],
    gap: 8,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: theme.colors.blue[600],
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.blue[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.blue[200],
    gap: 6,
    marginTop: 16,
  },
  verifiedBadgeText: {
    color: theme.colors.blue[700],
    fontSize: 14,
    fontWeight: '600',
  },
});
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Crown } from 'lucide-react-native';
import { useSubscription } from '@/hooks/subscription-store';

interface UpgradePromptProps {
  feature: 'proposals' | 'hiring';
  onPress?: () => void;
  style?: object;
}

export function UpgradePrompt({ feature, onPress, style }: UpgradePromptProps): JSX.Element {
  const router = useRouter();
  const { subscription, isTrialExpired } = useSubscription();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/subscription');
    }
  };

  const getFeatureText = () => {
    switch (feature) {
      case 'proposals':
        return 'Send Proposals';
      case 'hiring':
        return 'Hire Contractors';
      default:
        return 'Premium Feature';
    }
  };

  const getMessage = () => {
    if (subscription?.status === 'trialing') {
      return `${getFeatureText()} is disabled during the free trial`;
    }
    if (isTrialExpired) {
      return 'Your free trial has expired';
    }
    return `Upgrade to unlock ${getFeatureText().toLowerCase()}`;
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {subscription?.status === 'trialing' ? (
            <Lock size={16} color="#fff" />
          ) : (
            <Crown size={16} color="#fff" />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{getFeatureText()}</Text>
          <Text style={styles.subtitle}>{getMessage()}</Text>
        </View>
        <View style={styles.upgradeButton}>
          <Text style={styles.upgradeText}>Upgrade</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  upgradeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6366f1',
  },
});
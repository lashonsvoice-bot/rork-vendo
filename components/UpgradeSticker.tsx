import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { ArrowUp, X, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useSubscription } from '@/hooks/subscription-store';
import { useAuth } from '@/hooks/auth-store';

type UpgradeStickerProps = {
  visible?: boolean;
  onDismiss?: () => void;
};

export default function UpgradeSticker({ visible = true, onDismiss }: UpgradeStickerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { subscription, canCreateEvent, remainingEvents, isTrialExpired } = useSubscription();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [bounceAnim] = useState(new Animated.Value(1));

  const shouldShow = useMemo(() => {
    const isBiz = user?.role === 'business_owner';
    const isTrialing = subscription?.status === 'trialing';
    const reachedLimit = !canCreateEvent && (remainingEvents === 0);
    const expired = isTrialExpired;
    return visible && !dismissed && isBiz && (isTrialing || reachedLimit || expired);
  }, [visible, dismissed, user?.role, subscription?.status, canCreateEvent, remainingEvents, isTrialExpired]);

  React.useEffect(() => {
    if (shouldShow) {
      // Bounce animation to draw attention
      const bounce = () => {
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Repeat bounce every 3 seconds
          setTimeout(bounce, 3000);
        });
      };
      bounce();
    }
  }, [shouldShow, bounceAnim]);

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (!shouldShow) {
    return null;
  }

  const getMessage = () => {
    if (subscription?.status === 'trialing') {
      return 'Free Trial';
    }
    if (isTrialExpired) {
      return 'Trial Expired';
    }
    if (remainingEvents === 0) {
      return 'Event Limit Reached';
    }
    return 'Upgrade Now';
  };

  const getSubMessage = () => {
    if (subscription?.status === 'trialing') {
      const used = subscription?.eventsUsed ?? 0;
      const limit = subscription?.eventsLimit ?? 5;
      return `${used}/${limit} events used`;
    }
    if (isTrialExpired) {
      return 'Upgrade to continue';
    }
    if (remainingEvents === 0) {
      return `${subscription?.eventsUsed || 0}/${subscription?.eventsLimit || 0} events used`;
    }
    return 'Get more events';
  };

  return (
    <Animated.View 
      testID="upgrade-sticker"
      style={[
        styles.container,
        {
          transform: [{ scale: bounceAnim }],
          bottom: Platform.OS === 'web' ? 20 : 100,
        }
      ]}
    >
      <TouchableOpacity 
        testID="upgrade-sticker-button"
        style={styles.sticker} 
        onPress={handleUpgrade}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Crown size={20} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.mainText}>{getMessage()}</Text>
            <Text style={styles.subText}>{getSubMessage()}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <ArrowUp size={16} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        testID="upgrade-sticker-dismiss"
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <X size={14} color={theme.colors.gray[500]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    elevation: 10,
  },
  sticker: {
    backgroundColor: theme.colors.orange[500],
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: theme.colors.orange[400],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  textContainer: {
    flex: 1,
  },
  mainText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    lineHeight: 13,
  },
  arrowContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 2,
  },
  dismissButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
});
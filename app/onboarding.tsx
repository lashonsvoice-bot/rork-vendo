import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
} from 'react-native';
import { useTheme } from '@/hooks/theme-store';

import { Sparkles, Users, ShieldCheck, ArrowRight, LogIn } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  image: string;
  Icon: React.ComponentType<{ color?: string; size?: number }>;
}

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState<number>(0);

  const slides: Slide[] = useMemo(() => [
    {
      key: 'connect',
      title: 'Hire or Get Hired, Seamlessly',
      subtitle: 'Connect hosts, contractors, and vendors with a modern workflow built for real events.',
      image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=1600&auto=format&fit=crop',
      Icon: Users,
    },
    {
      key: 'secure',
      title: 'Secure • Verified • Compliant',
      subtitle: 'ID checks, W-9 / 1099 flows, and tracked payments give everyone peace of mind.',
      image: 'https://images.unsplash.com/photo-1542744173-05336fcc7ad4?q=80&w=1600&auto=format&fit=crop',
      Icon: ShieldCheck,
    },
    {
      key: 'grow',
      title: 'Grow With Referrals',
      subtitle: 'Share opportunities and earn commission as an ambassador. Help businesses thrive.',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1600&auto=format&fit=crop',
      Icon: Sparkles,
    },
  ], []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    if (newIndex !== index) {
      setIndex(newIndex);
    }
  }, [index]);

  const next = useCallback(() => {
    const nextIdx = Math.min(index + 1, slides.length - 1);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: nextIdx * width, animated: true });
    }
  }, [index, slides.length]);

  const getStarted = useCallback(async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.push('/auth/role-selection');
    } catch (err) {
      console.error('[Onboarding] Navigation error (getStarted):', (err as Error)?.message);
    }
  }, [router]);

  const enterApp = useCallback(async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/');
    } catch (err) {
      console.error('[Onboarding] Navigation error (enterApp):', (err as Error)?.message);
    }
  }, [router]);

  const ambassadorLogin = useCallback(async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.push('/ambassador-login');
    } catch (err) {
      console.error('[Onboarding] Navigation error (ambassadorLogin):', (err as Error)?.message);
    }
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="onboarding-screen">
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 8) : 8 }]}> 
        <Text style={[styles.brand, { color: theme.textPrimary }]} testID="onboarding-title">Event Contractor</Text>
        <TouchableOpacity accessibilityRole="button" onPress={enterApp} style={styles.skipBtn} testID="skip-button">
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        ref={scrollRef}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID="onboarding-scroll"
        accessibilityRole="scrollbar"
      >
        {slides.map((s, i) => (
          <View key={s.key} style={[styles.slide, { width }]}>            
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: s.image }}
                resizeMode="cover"
                style={styles.image}
                accessibilityIgnoresInvertColors
              />
              <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
            </View>

            <View style={styles.content}>
              <s.Icon size={28} color={theme.accentCyan} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>{s.title}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{s.subtitle}</Text>

              <View style={styles.ctaRow}>
                {i < slides.length - 1 ? (
                  <TouchableOpacity
                    onPress={next}
                    style={[styles.primaryBtn, { backgroundColor: theme.accentCyan }]}
                    testID={`next-button-${i}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryText}>Next</Text>
                    <ArrowRight size={18} color="#001018" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={getStarted}
                    style={[styles.primaryBtn, { backgroundColor: theme.accentCyan }]}
                    testID="get-started-button"
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryText}>Get Started</Text>
                    <ArrowRight size={18} color="#001018" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={enterApp}
                  style={[styles.secondaryBtn, { borderColor: theme.border }]}
                  testID={`enter-app-${i}`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.secondaryText, { color: theme.textPrimary }]}>Explore</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={ambassadorLogin}
                style={styles.linkRow}
                accessibilityRole="button"
                testID="ambassador-login-link"
              >
                <LogIn size={16} color={theme.textSecondary} />
                <Text style={[styles.linkText, { color: theme.textSecondary }]}>Ambassador Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} pointerEvents="none">
        {slides.map((_, i) => {
          const active = i === index;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: active ? theme.accentCyan : theme.border,
                  width: active ? 22 : 8,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.bottomPad} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 0.3,
  },
  skipBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  skipText: { fontSize: 14, fontWeight: '600' as const },
  slide: {
    flex: 1,
  },
  imageWrap: {
    height: Platform.OS === 'ios' ? 360 : 340,
    width: '100%',
  },
  image: { height: '100%', width: '100%', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800' as const,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    opacity: 0.9,
  },
  ctaRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryText: { color: '#001018', fontWeight: '800' as const, fontSize: 15 },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryText: { fontSize: 15, fontWeight: '700' as const },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  linkText: { fontSize: 14, fontWeight: '600' as const },
  dots: { position: 'absolute', bottom: 28, left: 22, right: 22, flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 999, },
  bottomPad: { height: 6 },
});

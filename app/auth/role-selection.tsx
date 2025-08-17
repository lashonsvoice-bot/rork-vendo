import React, { useMemo, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, UserCheck, Store, ArrowRight, Users } from 'lucide-react-native';

type RoleKey = 'business_owner' | 'contractor' | 'event_host' | 'guest';

interface RoleOption {
  key: RoleKey;
  title: string;
  subtitle: string;
  colors: [string, string];
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

export default function RoleSelectionScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<RoleKey | null>(null);

  const roles = useMemo<RoleOption[]>(() => ([
    {
      key: 'business_owner',
      title: 'Business Owner',
      subtitle: 'Hire local contractors and scale nationwide',
      colors: ['#10B981', '#34D399'],
      icon: Building2,
    },
    {
      key: 'contractor',
      title: 'Contractor',
      subtitle: 'Work events, represent brands, build your career',
      colors: ['#0EA5E9', '#22D3EE'],
      icon: UserCheck,
    },
    {
      key: 'event_host',
      title: 'Event Host',
      subtitle: 'List events and attract nationwide vendors',
      colors: ['#F59E0B', '#FBBF24'],
      icon: Store,
    },
    {
      key: 'guest',
      title: 'Browse as Guest',
      subtitle: 'View public directories with limited access',
      colors: ['#6B7280', '#9CA3AF'],
      icon: Users,
    },
  ]), []);

  const onContinue = () => {
    if (!selected) return;
    
    console.log('[RoleSelection] Selected role:', selected);
    
    if (selected === 'guest') {
      router.push('/auth/login?mode=guest');
    } else {
      // For other roles, go to login with role context
      router.push(`/auth/login?role=${selected}`);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'RevoVend', headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#10B981", "#34D399"]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.heroTitle}>RevoVend</Text>
          <Text style={styles.heroSubtitle}>Choose how you want to use the platform</Text>
        </LinearGradient>

        <View style={styles.cards}>
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selected === role.key;
            return (
              <TouchableOpacity
                key={role.key}
                activeOpacity={0.9}
                onPress={() => setSelected(role.key)}
                style={[styles.card, isSelected ? styles.cardSelected : null]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                testID={`role-${role.key}`}
              >
                <LinearGradient colors={role.colors} style={styles.cardBadge}>
                  <Icon size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{role.title}</Text>
                  <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
                </View>
                <ArrowRight size={20} color={isSelected ? '#10B981' : '#9CA3AF'} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.cta, !selected && styles.ctaDisabled]}
          onPress={onContinue}
          disabled={!selected}
          testID="continue-btn"
        >
          <LinearGradient colors={selected ? ["#10B981", "#34D399"] : ["#9CA3AF", "#9CA3AF"]} style={styles.ctaInner}>
            <Text style={styles.ctaText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 24 },
  hero: { paddingTop: Platform.OS === 'ios' ? 48 : 28, paddingBottom: 24, paddingHorizontal: 20 },
  heroTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginBottom: 6 },
  heroSubtitle: { color: '#ECFDF5', fontSize: 16 },
  cards: { paddingHorizontal: 20, marginTop: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  cardBadge: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  cta: { paddingHorizontal: 20, marginTop: 20 },
  ctaDisabled: { opacity: 0.7 },
  ctaInner: { alignItems: 'center', paddingVertical: 16, borderRadius: 12 },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
});
import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, UserCheck, Store, Users, Mail } from 'lucide-react-native';
import { useAuth, type AuthRole } from '@/hooks/auth-store';

type RoleKey = 'business_owner' | 'contractor' | 'event_host' | 'guest';

interface RoleOption {
  key: RoleKey;
  title: string;
  subtitle: string;
  colors: [string, string];
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const roles: RoleOption[] = [
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
];

export default function RoleSelectionScreen() {
  const { login, isLoading } = useAuth();
  const [selected, setSelected] = useState<RoleKey | null>(null);
  const [email, setEmail] = useState<string>('');

  const onContinue = async () => {
    if (!selected) {
      Alert.alert('Error', 'Please select a role');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    try {
      console.log('[RoleSelection] Logging in with role:', selected);
      await login(email.trim(), selected as AuthRole);
    } catch (e: any) {
      console.error('[RoleSelection] Login failed:', e);
      Alert.alert('Error', e?.message ?? 'Login failed');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'RevoVend', headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#10B981", "#34D399"]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.heroTitle}>RevoVend</Text>
          <Text style={styles.heroSubtitle}>Choose your role and enter your email</Text>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Mail size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

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
                testID={`role-${role.key}`}
              >
                <LinearGradient colors={role.colors} style={styles.cardBadge}>
                  <Icon size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{role.title}</Text>
                  <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
                </View>
                <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                  {isSelected && <View style={styles.radioButtonInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.cta, (!selected || !email.trim() || isLoading) && styles.ctaDisabled]}
          onPress={onContinue}
          disabled={!selected || !email.trim() || isLoading}
          testID="continue-btn"
        >
          <LinearGradient colors={selected && email.trim() ? ["#10B981", "#34D399"] : ["#9CA3AF", "#9CA3AF"]} style={styles.ctaInner}>
            <Text style={styles.ctaText}>{isLoading ? 'Signing in...' : 'Continue'}</Text>
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
  form: { paddingHorizontal: 20, marginTop: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, paddingVertical: 10, color: '#111827', fontSize: 16 },
  cards: { paddingHorizontal: 20, marginTop: 20, gap: 12 },
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
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#10B981',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  cta: { paddingHorizontal: 20, marginTop: 20 },
  ctaDisabled: { opacity: 0.7 },
  ctaInner: { alignItems: 'center', paddingVertical: 16, borderRadius: 12 },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
});
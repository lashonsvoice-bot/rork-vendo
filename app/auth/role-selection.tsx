import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, UserCheck, Store, Users, Mail, Key } from 'lucide-react-native';
import { useAuth, type AuthRole } from '@/hooks/auth-store';
import { trpcClient } from '@/lib/trpc';

type RoleKey = 'business_owner' | 'contractor' | 'event_host' | 'guest' | 'local_vendor';

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
    colors: ['#8B5CF6', '#A78BFA'],
    icon: UserCheck,
  },
  {
    key: 'local_vendor',
    title: 'Local Vendors',
    subtitle: 'Resource for Small local crafters and businesses • increase local clientele • build your network',
    colors: ['#3B82F6', '#60A5FA'],
    icon: Store,
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
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [proposalPreview, setProposalPreview] = useState<any>(null);
  const [isCheckingCode, setIsCheckingCode] = useState<boolean>(false);

  const checkInvitationCode = async (code: string) => {
    if (!code.trim()) {
      setProposalPreview(null);
      return;
    }
    
    setIsCheckingCode(true);
    try {
      const result = await trpcClient.proposals.findByCode.query({ invitationCode: code.trim() });
      if (result.found) {
        setProposalPreview(result.proposal);
      } else {
        setProposalPreview(null);
        Alert.alert('Invalid Code', result.message);
      }
    } catch (error) {
      console.error('[RoleSelection] Error checking invitation code:', error);
      setProposalPreview(null);
    } finally {
      setIsCheckingCode(false);
    }
  };

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
      const user = await login(email.trim(), selected as AuthRole);
      
      // If event host with invitation code, connect them to the proposal
      if (selected === 'event_host' && invitationCode.trim() && user) {
        try {
          const connectResult = await trpcClient.proposals.connectHost.mutate({
            invitationCode: invitationCode.trim(),
            hostId: user.id,
          });
          
          if (connectResult.success) {
            Alert.alert(
              'Connected Successfully!',
              `You've been connected to the proposal from ${connectResult.proposal.businessName}. You can now manage this event in your dashboard.`,
              [{ text: 'Great!', style: 'default' }]
            );
          }
        } catch (error) {
          console.error('[RoleSelection] Error connecting host:', error);
          Alert.alert('Connection Error', 'Failed to connect to the proposal, but your account was created successfully.');
        }
      }
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
          
          {selected === 'event_host' && (
            <View style={styles.invitationSection}>
              <Text style={styles.invitationLabel}>Have an invitation code? (Optional)</Text>
              <View style={styles.inputRow}>
                <Key size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter invitation code"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  value={invitationCode}
                  onChangeText={(text) => {
                    setInvitationCode(text);
                    if (text.length >= 8) {
                      checkInvitationCode(text);
                    } else {
                      setProposalPreview(null);
                    }
                  }}
                />
              </View>
              
              {isCheckingCode && (
                <Text style={styles.checkingText}>Checking invitation code...</Text>
              )}
              
              {proposalPreview && (
                <View style={styles.proposalPreview}>
                  <Text style={styles.previewTitle}>✅ Invitation Found!</Text>
                  <Text style={styles.previewText}>
                    <Text style={styles.previewBold}>{proposalPreview.businessName}</Text> wants to participate in your event 
                    <Text style={styles.previewBold}>&quot;{proposalPreview.eventTitle}&quot;</Text>
                  </Text>
                  <Text style={styles.previewDetails}>
                    📅 {proposalPreview.eventDate} • 💰 ${proposalPreview.proposedAmount} • 👥 {proposalPreview.contractorsNeeded} contractors
                  </Text>
                </View>
              )}
            </View>
          )}
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
  invitationSection: { marginTop: 16 },
  invitationLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  checkingText: { fontSize: 12, color: '#6B7280', marginTop: 8, fontStyle: 'italic' },
  proposalPreview: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 4,
  },
  previewBold: {
    fontWeight: '600',
  },
  previewDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
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
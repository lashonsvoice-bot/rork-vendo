import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { FooterLinks } from '@/components/FooterLinks';

export default function PrivacyScreen() {
  const sections = useMemo(
    () => [
      {
        title: 'Overview',
        content:
          'This Privacy Policy explains how RevoVend collects, uses, and shares information when you use our application and services.'
      },
      {
        title: 'Information We Collect',
        content:
          'Account data (name, email, role), profile details, event listings, messages, purchase history, device and usage info, and payment-related metadata processed by third‑party providers. We do not store full payment card details.'
      },
      {
        title: 'How We Use Information',
        content:
          'To operate and improve the platform, facilitate messaging within permitted roles, process table purchases and bookings, detect and prevent fraud, provide support, and comply with legal obligations.'
      },
      {
        title: 'Sharing',
        content:
          'We share data with service providers for payments, messaging, analytics, and infrastructure. Public profile fields and listings you choose to post may be visible to other users. We may share information to comply with law or protect rights.'
      },
      {
        title: 'Fees, Payments, and Records',
        content:
          'We record transactions to apply applicable platform fees (e.g., 15% host commission for Local Vendor bookings and 5% host fee on table sales) and for reconciliation and support.'
      },
      {
        title: 'Your Choices',
        content:
          'You can update your profile, manage notifications, and request account deletion where permitted. Some data may be retained for legal, security, or accounting purposes.'
      },
      {
        title: 'Security',
        content:
          'We use reasonable safeguards appropriate to the nature of the data. No method of transmission or storage is 100% secure.'
      },
      {
        title: 'Children',
        content:
          'The service is not intended for individuals under 13 (or the minimum age in your jurisdiction).'
      },
      {
        title: 'International Transfers',
        content:
          'Your information may be transferred and processed in jurisdictions with different data protection laws.'
      },
      {
        title: 'Changes to this Policy',
        content:
          'We may update this policy. Changes take effect upon posting in the app. Continued use after changes means you accept the updated policy.'
      },
      {
        title: 'Contact',
        content:
          'Questions about privacy? Contact support at the email on our support page.'
      }
    ],
    []
  );

  return (
    <View style={styles.container} testID="privacy-screen">
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>RevoVend Privacy Policy</Text>
        {sections.map((s, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.content}</Text>
          </View>
        ))}
        <Text style={styles.updated}>Last updated: {new Date().toISOString().slice(0, 10)}</Text>
        <FooterLinks align="center" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  updated: {
    marginTop: 16,
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center' as const,
  },
});
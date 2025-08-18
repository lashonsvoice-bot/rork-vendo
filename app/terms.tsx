import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

export default function TermsScreen() {
  const sections = useMemo(
    () => [
      {
        title: 'Overview',
        content:
          'These Terms and Conditions ("Terms") govern your access to and use of the RevoVend application and services. By using the app, you agree to these Terms.'
      },
      {
        title: 'Roles and Access',
        content:
          'RevoVend supports multiple roles: Business Owners, Event Hosts, Contractors, Local Vendors, and Guests. Features vary by role. Local Vendors are intended for micro businesses and crafters local to an event area.'
      },
      {
        title: 'Fees and Commissions',
        content:
          '1) Host Booking Fee: A 15% commission is charged to Event Hosts on booking transactions involving Local Vendors. 2) Table Sale Fee: RevoVend charges Event Hosts a 5% fee on all event table sales, regardless of whether the buyer is a Business or a Local Vendor. 3) Processing Fees: Third‑party payment processing and banking fees may apply in addition to RevoVend fees. 4) Taxes: You are responsible for any applicable taxes. Fees may be updated and will apply to transactions after the update effective date.'
      },
      {
        title: 'Messaging Rules',
        content:
          'Local Vendors may message Event Hosts. Local Vendors cannot message Contractors or Business Owners. RevoVend may limit or suspend messaging to protect users from spam, abuse, or policy violations.'
      },
      {
        title: 'Purchases of Event Tables',
        content:
          'Local Vendors and Businesses may purchase event tables listed by Event Hosts directly in the app. Table purchases are subject to Host policies (availability, pricing, refund/cancellation rules) and RevoVend platform fees.'
      },
      {
        title: 'Cancellations and No‑Shows',
        content:
          'Event cancellations, contractor cancellations, and no‑show handling are managed by Event Hosts within their policies. Where supported in‑app, the relevant screen will guide the steps. Platform fees and third‑party processing fees may be non‑refundable unless required by law.'
      },
      {
        title: 'Account Suspension',
        content:
          'We may suspend or terminate access for violations of these Terms, fraud, abuse, non‑payment, or as required by law. Suspended users may see limited or restricted screens until the issue is resolved.'
      },
      {
        title: 'Content and Conduct',
        content:
          'You agree not to post illegal, infringing, or harmful content and not to engage in harassment, spam, or other abusive behavior. You are responsible for the accuracy of your listings, profiles, and messages.'
      },
      {
        title: 'Disclaimers',
        content:
          'RevoVend is a marketplace and is not a party to agreements between users. Listings, availability, and pricing are provided by Hosts and vendors. Services are provided “as is.” To the fullest extent permitted by law, we disclaim warranties of any kind and limit liability as permitted by law.'
      },
      {
        title: 'Changes to Terms',
        content:
          'We may update these Terms from time to time. Changes are effective upon posting in the app. Continued use after changes means you accept the updated Terms.'
      },
      {
        title: 'Contact',
        content:
          'Questions about these Terms? Contact support at the email on our support page.'
      }
    ],
    []
  );

  return (
    <View style={styles.container} testID="terms-screen">
      <Stack.Screen options={{ title: 'Terms & Conditions' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>RevoVend Terms & Conditions</Text>
        {sections.map((s, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.content}</Text>
          </View>
        ))}
        <Text style={styles.updated}>Last updated: {new Date().toISOString().slice(0, 10)}</Text>
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
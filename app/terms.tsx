import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { FooterLinks } from '@/components/FooterLinks';

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
        title: 'Contractor Agreements',
        content:
          'Contractors agree to: 1) Arrive on time and fulfill all scheduled commitments. 2) Maintain professional conduct and appearance as specified by event requirements. 3) Follow all venue rules, safety protocols, and local regulations. 4) Complete assigned tasks to the satisfaction of the Business Owner and Event Host. 5) Report any issues or incidents immediately. Contractors may be subject to background checks and must provide valid identification. Payment is contingent upon satisfactory completion of services.'
      },
      {
        title: 'Business Owner Responsibilities',
        content:
          'Business Owners agree to: 1) Provide accurate event details, requirements, and expectations. 2) Pay agreed-upon contractor fees and supervision fees promptly. 3) Provide necessary materials, training, or instructions for successful event execution. 4) Maintain appropriate insurance coverage for their business activities. 5) Comply with all applicable business licenses and permits. 6) Treat contractors professionally and provide a safe working environment.'
      },
      {
        title: 'Event Host Obligations',
        content:
          'Event Hosts agree to: 1) Provide accurate venue information, setup requirements, and event details. 2) Ensure venue compliance with safety regulations and accessibility requirements. 3) Coordinate with Business Owners and Contractors for smooth event execution. 4) Handle table sales, vendor management, and on-site logistics. 5) Maintain appropriate event insurance and venue permits. 6) Provide clear parking, loading, and setup instructions to all parties.'
      },
      {
        title: 'Payment and Escrow Terms',
        content:
          'Payment processing: 1) All payments are processed through secure third-party providers. 2) Escrow services may be used to hold funds until service completion. 3) Refunds are subject to cancellation policies and may incur processing fees. 4) Disputed payments will be reviewed on a case-by-case basis. 5) Tax reporting (1099 forms) will be provided as required by law. 6) Payment methods include credit cards, ACH transfers, and digital wallets as available.'
      },
      {
        title: 'Insurance and Liability',
        content:
          'Insurance requirements: 1) Business Owners must maintain general liability insurance for their operations. 2) Event Hosts should carry event insurance covering venue activities. 3) Contractors may be required to have personal liability coverage. 4) RevoVend provides platform insurance but users are responsible for their own activities. 5) All parties must report incidents immediately. 6) Insurance verification may be required for high-value or high-risk events.'
      },
      {
        title: 'Intellectual Property and Confidentiality',
        content:
          'Intellectual property: 1) Users retain ownership of their content, business information, and trade secrets. 2) RevoVend has limited rights to use content for platform operations and marketing. 3) Users must respect others\' intellectual property rights. 4) Confidential business information shared through the platform must be protected. 5) Non-disclosure agreements may be required for sensitive events or proprietary information.'
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
        title: 'Shipping & Deliverables Policy',
        content:
          '1) Signature Confirmation Required: All product shipments and deliverables sent to event Hosts must include signature confirmation. This ensures accountability and protects both Business Owners and Contractors from disputes. Hosts are required to confirm receipt inside the RevoVend app. Tracking numbers can be entered into the app for recordkeeping. RevoVend strongly recommends that Business Owners pay Hosts an additional fee for inventory verification before and after the event. 2) App Recording (Not Fulfillment): RevoVend does not handle shipping logistics directly. Business Owners are responsible for arranging their own shipping (UPS, FedEx, USPS, DHL, etc.). Tracking numbers and proof of signature are uploaded to the app by the Business Owner. The app provides a permanent log of deliveries tied to each event. 3) Liability & Risk: RevoVend is not responsible for lost or delayed packages. Responsibility rests with the chosen shipping carrier and the Business Owner. RevoVend acts only as a neutral recordkeeping platform. 4) Future Expansion: RevoVend is exploring potential partnerships with major carriers (FedEx, UPS, USPS, DHL) to offer discounted rates to Business Owners, enable optional real-time tracking API integration, and provide automated updates within the app. These features may be rolled out in later phases of development depending on scale and demand.'
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
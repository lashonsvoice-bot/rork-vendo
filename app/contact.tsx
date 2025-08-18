import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { theme as themeObj } from '@/constants/theme';
import { Mail, MessageSquare, Globe } from 'lucide-react-native';

export default function ContactScreen() {
  const theme = themeObj.colors;
  const supportEmail = 'support@revovend.app';
  const website = 'https://revovend.app';

  const openEmail = () => {
    const mailto = `mailto:${supportEmail}`;
    Linking.openURL(mailto).catch((err) => console.error('[Contact] open email error', err));
  };

  const openWebsite = () => {
    Linking.openURL(website).catch((err) => console.error('[Contact] open website error', err));
  };

  return (
    <View style={styles.container} testID="contact-screen">
      <Stack.Screen options={{ title: 'Contact' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Contact RevoVend</Text>
        <Text style={styles.subheader}>We're here to help. Reach us via email or our website.</Text>

        <TouchableOpacity style={styles.card} onPress={openEmail} testID="contact-email">
          <View style={[styles.iconWrap, { backgroundColor: theme.info + '20' }]}>
            <Mail size={22} color={theme.info} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Email Support</Text>
            <Text style={styles.cardDesc}>{supportEmail}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={openWebsite} testID="contact-website">
          <View style={[styles.iconWrap, { backgroundColor: theme.secondary + '20' }]}>
            <Globe size={22} color={theme.secondary} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Visit Website</Text>
            <Text style={styles.cardDesc}>{website.replace('https://', '')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.note}>
          <MessageSquare size={16} color={theme.text.secondary} />
          <Text style={styles.noteText}>For account or billing issues, please include your registered email.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeObj.colors.background },
  content: { padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: themeObj.colors.text.primary,
    marginBottom: 6,
  },
  subheader: {
    fontSize: 14,
    color: themeObj.colors.text.secondary,
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: themeObj.colors.card,
    borderWidth: 1,
    borderColor: themeObj.colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextWrap: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: themeObj.colors.text.primary,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 14,
    color: themeObj.colors.text.secondary,
  },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  noteText: { fontSize: 12, color: themeObj.colors.text.secondary, flex: 1 },
});

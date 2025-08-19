import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/auth-store';
import { theme } from '@/constants/theme';

export default function LinkStripeScreen() {
  const { user } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const linkByEmail = trpc.subscription.stripe.linkByEmail.useMutation();

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && email.includes('@');
  }, [email]);

  const onLink = async () => {
    if (!canSubmit) return;
    try {
      setBusy(true);
      const res = await linkByEmail.mutateAsync({ email: email.trim() });
      if (res?.subscription) {
        Alert.alert('Linked', 'Your Stripe subscription was linked successfully.', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        Alert.alert('Notice', 'We could not link a subscription. Please double-check the billing email.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Link failed', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Link Stripe Subscription' }} />
      <View style={styles.header}>
        <Text style={styles.title} testID="linkStripeTitle">Link existing subscription</Text>
        <Text style={styles.subtitle} testID="linkStripeSubtitle">
          Enter the billing email you used on Stripe. We will automatically find and link your active subscription to your account.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Billing email</Text>
        <TextInput
          testID="billingEmailInput"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType={Platform.OS === 'ios' ? 'email-address' : 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@company.com"
        />

        <TouchableOpacity
          testID="linkStripeButton"
          style={[styles.button, (!canSubmit || busy) && styles.buttonDisabled]}
          onPress={onLink}
          disabled={!canSubmit || busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Link Subscription</Text>
          )}
        </TouchableOpacity>
      </View>

      {linkByEmail.isError && (
        <View style={styles.errorBox} testID="linkStripeError">
          <Text style={styles.errorText}>{linkByEmail.error?.message ?? 'Something went wrong'}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  form: {
    marginTop: 12,
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  button: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.gray[300],
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: theme.colors.red[50],
    borderColor: theme.colors.red[200],
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: theme.colors.red[700],
    fontSize: 13,
  },
});

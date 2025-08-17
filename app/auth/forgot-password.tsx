import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, ArrowLeft, Send } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getBaseUrl } from '@/lib/trpc';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const onSubmit = async () => {
    if (!email) {
      Alert.alert('Forgot Password', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsSubmitted(true);
      } else {
        Alert.alert('Error', data.error || 'Failed to send reset email');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <Stack.Screen options={{ title: 'Check Your Email' }} />
        <View style={styles.container}>
          <LinearGradient colors={["#10B981", "#34D399"]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>We've sent password reset instructions to {email}</Text>
          </LinearGradient>
          
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <LinearGradient colors={["#10B981", "#34D399"]} style={styles.iconBg}>
                <Mail size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            
            <Text style={styles.message}>
              If an account with that email exists, we've sent you a password reset link. 
              Please check your email and follow the instructions.
            </Text>
            
            <Text style={styles.note}>
              Didn't receive the email? Check your spam folder or try again with a different email address.
            </Text>
            
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => router.back()}
              testID="back-to-login"
            >
              <ArrowLeft size={18} color="#10B981" />
              <Text style={styles.backText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Forgot Password' }} />
      <View style={styles.container}>
        <LinearGradient colors={["#10B981", "#34D399"]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>Enter your email to reset your password</Text>
        </LinearGradient>
        
        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Mail size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              testID="email-input"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.btn, isLoading && { opacity: 0.7 }]} 
            disabled={isLoading} 
            onPress={onSubmit}
            testID="send-reset-email"
          >
            <LinearGradient colors={["#10B981", "#34D399"]} style={styles.btnInner}>
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.btnText}>{isLoading ? 'Sending...' : 'Send Reset Link'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.linkRow} 
          onPress={() => router.back()}
          testID="back-to-login-link"
        >
          <ArrowLeft size={16} color="#10B981" />
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 30, paddingHorizontal: 20 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#ECFDF5', fontSize: 16 },
  form: { padding: 20, gap: 16 },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    gap: 8, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  input: { flex: 1, paddingVertical: 10, color: '#111827' },
  btn: { marginTop: 8 },
  btnInner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 14, 
    borderRadius: 12 
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  linkRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6, 
    paddingVertical: 14 
  },
  linkText: { color: '#10B981', fontWeight: '600' },
  content: { padding: 20, alignItems: 'center' },
  iconContainer: { marginBottom: 24 },
  iconBg: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  message: { 
    fontSize: 16, 
    color: '#374151', 
    textAlign: 'center', 
    lineHeight: 24, 
    marginBottom: 16 
  },
  note: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 20, 
    marginBottom: 32 
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingVertical: 12, 
    paddingHorizontal: 16 
  },
  backText: { color: '#10B981', fontWeight: '600', fontSize: 16 },
});
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getBaseUrl } from '@/lib/trpc';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/verify-reset-token/${token}`);
      const data = await response.json();
      
      if (data.valid) {
        setIsValidToken(true);
        setUserEmail(data.email || '');
      } else {
        setIsValidToken(false);
      }
    } catch (error) {
      setIsValidToken(false);
    }
  };

  const onSubmit = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Reset Password', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Reset Password', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Reset Password', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsSuccess(true);
      } else {
        Alert.alert('Error', data.error || 'Failed to reset password');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <>
        <Stack.Screen options={{ title: 'Reset Password' }} />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Verifying reset link...</Text>
          </View>
        </View>
      </>
    );
  }

  if (isValidToken === false) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invalid Link' }} />
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <AlertCircle size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Invalid or Expired Link</Text>
            <Text style={styles.errorMessage}>
              This password reset link is invalid or has expired. Please request a new one.
            </Text>
            <TouchableOpacity 
              style={styles.errorBtn}
              onPress={() => router.push('/auth/forgot-password')}
              testID="request-new-link"
            >
              <Text style={styles.errorBtnText}>Request New Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  if (isSuccess) {
    return (
      <>
        <Stack.Screen options={{ title: 'Password Reset' }} />
        <View style={styles.container}>
          <LinearGradient colors={["#10B981", "#34D399"]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.title}>Password Reset</Text>
            <Text style={styles.subtitle}>Your password has been successfully reset</Text>
          </LinearGradient>
          
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <LinearGradient colors={["#10B981", "#34D399"]} style={styles.iconBg}>
                <CheckCircle size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            
            <Text style={styles.message}>
              Your password has been successfully reset. You can now sign in with your new password.
            </Text>
            
            <TouchableOpacity 
              style={styles.successBtn} 
              onPress={() => router.push('/auth/login')}
              testID="go-to-login"
            >
              <LinearGradient colors={["#10B981", "#34D399"]} style={styles.btnInner}>
                <Text style={styles.btnText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Reset Password' }} />
      <View style={styles.container}>
        <LinearGradient colors={["#10B981", "#34D399"]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password for {userEmail}</Text>
        </LinearGradient>
        
        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Lock size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              testID="password-input"
            />
          </View>
          
          <View style={styles.inputRow}>
            <Lock size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              testID="confirm-password-input"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.btn, isLoading && { opacity: 0.7 }]} 
            disabled={isLoading} 
            onPress={onSubmit}
            testID="reset-password-submit"
          >
            <LinearGradient colors={["#10B981", "#34D399"]} style={styles.btnInner}>
              <Text style={styles.btnText}>{isLoading ? 'Resetting...' : 'Reset Password'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  loadingContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20 
  },
  loadingText: { fontSize: 16, color: '#6B7280' },
  errorContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20 
  },
  errorTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#111827', 
    marginTop: 16, 
    marginBottom: 8 
  },
  errorMessage: { 
    fontSize: 16, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 24, 
    marginBottom: 24 
  },
  errorBtn: { 
    backgroundColor: '#EF4444', 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 8 
  },
  errorBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
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
    marginBottom: 32 
  },
  successBtn: { width: '100%' },
});
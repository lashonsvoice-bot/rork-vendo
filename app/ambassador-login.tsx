/**
 * Ambassador Login Page
 * Separate login for ambassador program
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAmbassador } from '@/hooks/ambassador-store';
import { UserPlus, LogIn, DollarSign, Users, TrendingUp } from 'lucide-react-native';

export default function AmbassadorLoginScreen() {
  const router = useRouter();
  const { login, signup, isLoggingIn, isSigningUp } = useAmbassador();
  
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    console.log('[AmbassadorLogin] handleSubmit called');
    console.log('[AmbassadorLogin] isSignupMode:', isSignupMode);
    console.log('[AmbassadorLogin] email:', email);
    console.log('[AmbassadorLogin] password:', password ? '***' : 'empty');
    console.log('[AmbassadorLogin] name:', name);
    
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isSignupMode && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      if (isSignupMode) {
        console.log('[AmbassadorLogin] Attempting signup...');
        const result = await signup({ email, password, name, phone: phone || undefined });
        console.log('[AmbassadorLogin] Signup result:', result);
        if (result?.success) {
          Alert.alert('Success', 'Ambassador account created successfully!');
          router.push('/ambassador-dashboard' as any);
        } else {
          Alert.alert('Error', 'Signup failed. Please try again.');
        }
      } else {
        console.log('[AmbassadorLogin] Attempting login with email:', email);
        const result = await login(email, password);
        console.log('[AmbassadorLogin] Login result:', result);
        if (result?.success) {
          console.log('[AmbassadorLogin] Login successful, navigating to dashboard...');
          router.push('/ambassador-dashboard' as any);
        } else {
          console.log('[AmbassadorLogin] Login failed - result not successful');
          Alert.alert(
            'Login Failed', 
            'Invalid email or password. Please check your credentials and try again.\n\nExpected credentials:\nEmail: lashonsvoice@gmail.com\nPassword: Welcome123!'
          );
        }
      }
    } catch (error: any) {
      console.error('[AmbassadorLogin] Error details:', {
        message: error?.message,
        code: error?.code,
        data: error?.data,
        stack: error?.stack
      });
      
      let errorMessage = 'An error occurred while logging in.';
      
      if (error?.message?.includes('UNAUTHORIZED')) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error?.message?.includes('FORBIDDEN')) {
        errorMessage = 'Your ambassador account has been suspended.';
      } else if (error?.message?.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Login Error',
        `${errorMessage}\n\nIf you continue to have issues:\n1. Ensure the backend is running\n2. Run: node backend/scripts/verify-ambassador-login.js\n3. Try again with:\nEmail: lashonsvoice@gmail.com\nPassword: Welcome123!`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <DollarSign size={40} color="#8B4513" />
            </View>
            <Text style={styles.title}>Ambassador Program</Text>
            <Text style={styles.subtitle}>
              Earn 20% commission on every successful referral
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <TrendingUp size={24} color="#8B4513" />
              <Text style={styles.benefitText}>20% Commission</Text>
            </View>
            <View style={styles.benefitItem}>
              <Users size={24} color="#8B4513" />
              <Text style={styles.benefitText}>Unlimited Referrals</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignupMode && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ambassador@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry
              />
            </View>

            {isSignupMode && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, (isLoggingIn || isSigningUp) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoggingIn || isSigningUp}
            >
              {(isLoggingIn || isSigningUp) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  {isSignupMode ? (
                    <UserPlus size={20} color="#fff" style={styles.buttonIcon} />
                  ) : (
                    <LogIn size={20} color="#fff" style={styles.buttonIcon} />
                  )}
                  <Text style={styles.submitButtonText}>
                    {isSignupMode ? 'Create Ambassador Account' : 'Login to Dashboard'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() => setIsSignupMode(!isSignupMode)}
            >
              <Text style={styles.switchModeText}>
                {isSignupMode
                  ? 'Already have an account? Login'
                  : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How It Works</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>1</Text>
              <Text style={styles.infoText}>
                Sign up as an ambassador and get your unique referral links
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>2</Text>
              <Text style={styles.infoText}>
                Share links with businesses, hosts, and contractors
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>3</Text>
              <Text style={styles.infoText}>
                Earn up to 20% when they subscribe or pay out
              </Text>
            </View>
          </View>

          {/* Back to Main App */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back to Main App</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B451333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  benefitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  benefitItem: {
    alignItems: 'center',
  },
  benefitText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B4513',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    fontWeight: 'bold',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
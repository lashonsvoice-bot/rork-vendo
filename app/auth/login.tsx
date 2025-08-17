import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, Lock, LogIn, Users, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const { mode, prefill, role } = useLocalSearchParams<{ mode?: string; prefill?: string; role?: string }>();
  const { signin, guestSignin, isLoading } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isGuestMode, setIsGuestMode] = useState<boolean>(mode === 'guest');
  const [agreeToNewsletter, setAgreeToNewsletter] = useState<boolean>(false);


  useEffect(() => {
    if (mode === 'guest') {
      setIsGuestMode(true);
    }
    if (prefill && typeof prefill === 'string') {
      setEmail(prefill);
    }
  }, [mode, prefill]);

  const onSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      if (isGuestMode) {
        console.log('[Login] Starting guest signin for:', email);
        const result = await guestSignin({ email, agreeToNewsletter });
        console.log('[Login] Guest signin successful:', result);
        // AuthGuard will handle the redirect
      } else {
        if (!password) {
          Alert.alert('Sign in', 'Please enter your password');
          return;
        }
        console.log('[Login] Starting regular signin for:', email);
        const result = await signin({ email, password });
        console.log('[Login] Regular signin successful:', result);
        // AuthGuard will handle the redirect
      }
    } catch (e: any) {
      console.error('[Login] Signin failed:', e);
      Alert.alert(
        isGuestMode ? 'Guest access failed' : 'Sign in failed', 
        e?.message ?? (isGuestMode ? 'Unable to access as guest' : 'Invalid credentials')
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sign in', headerShown: true }} />
      <View style={styles.container}>
        <LinearGradient colors={["#10B981", "#34D399"]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.title}>{isGuestMode ? 'Browse as Guest' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {isGuestMode ? 'Access public directories with limited info' : 'Sign in to continue'}
          </Text>
        </LinearGradient>
        
        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Mail size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          {!isGuestMode && (
            <View style={styles.inputRow}>
              <Lock size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          )}
          
          <View style={styles.guestModeContainer}>
            <TouchableOpacity 
              style={styles.guestModeToggle}
              onPress={() => setIsGuestMode(!isGuestMode)}
            >
              <View style={styles.guestModeRow}>
                <Eye size={20} color={isGuestMode ? "#10B981" : "#6B7280"} />
                <Text style={[styles.guestModeText, isGuestMode && styles.guestModeTextActive]}>
                  Browse as Guest (Limited Access)
                </Text>
              </View>
              <Switch
                value={isGuestMode}
                onValueChange={setIsGuestMode}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={isGuestMode ? '#FFFFFF' : '#F3F4F6'}
              />
            </TouchableOpacity>
          </View>
          
          {isGuestMode && (
            <View style={styles.newsletterContainer}>
              <TouchableOpacity 
                style={styles.newsletterToggle}
                onPress={() => setAgreeToNewsletter(!agreeToNewsletter)}
              >
                <View style={styles.newsletterRow}>
                  <Switch
                    value={agreeToNewsletter}
                    onValueChange={setAgreeToNewsletter}
                    trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                    thumbColor={agreeToNewsletter ? '#FFFFFF' : '#F3F4F6'}
                  />
                  <Text style={styles.newsletterText}>
                    Subscribe to newsletters and updates
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.btn, isLoading && { opacity: 0.7 }]} 
            disabled={isLoading} 
            onPress={onSubmit} 
            testID="signin-submit"
          >
            <LinearGradient colors={["#10B981", "#34D399"]} style={styles.btnInner}>
              {isGuestMode ? <Users size={18} color="#FFFFFF" /> : <LogIn size={18} color="#FFFFFF" />}
              <Text style={styles.btnText}>
                {isLoading 
                  ? (isGuestMode ? 'Accessing...' : 'Signing in...') 
                  : (isGuestMode ? 'Browse as Guest' : 'Sign in')
                }
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.linksContainer}>
          {!isGuestMode && (
            <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/auth/forgot-password')} testID="forgot-password-link">
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.linkRow} onPress={() => {
            if (role) {
              router.push(`/auth/signup?role=${role}`);
            } else {
              router.push('/auth/signup');
            }
          }} testID="link-unified-auth">
            <Text style={styles.linkText}>Need to create an account? Sign up</Text>
          </TouchableOpacity>
          

          
          {isGuestMode && (
            <View style={styles.guestInfo}>
              <Text style={styles.guestInfoText}>
                As a guest, you can view business names, host names, venue names, registration dates, and states only. 
                Sign up for full access to contact information and detailed profiles.
              </Text>
            </View>
          )}
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
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, paddingVertical: 10, color: '#111827' },
  btn: { marginTop: 8 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  linksContainer: { gap: 8 },
  linkRow: { alignItems: 'center', paddingVertical: 14 },
  linkText: { color: '#10B981', fontWeight: '600' },
  guestModeContainer: { marginTop: 16, marginBottom: 8 },
  guestModeToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  guestModeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  guestModeText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  guestModeTextActive: { color: '#10B981' },
  newsletterContainer: { marginTop: 8 },
  newsletterToggle: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  newsletterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  newsletterText: { fontSize: 14, color: '#6B7280', flex: 1 },
  guestInfo: { backgroundColor: '#F0F9FF', padding: 16, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: '#BAE6FD' },
  guestInfoText: { fontSize: 13, color: '#0369A1', lineHeight: 18, textAlign: 'center' },
});

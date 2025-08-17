import React, { useState, useEffect } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, UserCheck, Store, Mail, Lock, User, Phone, MapPin, Globe } from 'lucide-react-native';
import { useAuth } from '@/hooks/auth-store';

type RoleKey = 'business_owner' | 'contractor' | 'event_host';

export default function SignUpScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { signup } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleKey>(role as RoleKey || 'business_owner');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    // Business Owner fields
    businessName: '',
    phone: '',
    website: '',
    state: '',
    // Contractor fields
    location: '',
    skills: [] as string[],
    // Event Host fields
    organizationName: '',
  });
  
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (role) {
      setSelectedRole(role as RoleKey);
    } else {
      // If no role is provided, redirect to role selection
      router.replace('/auth/role-selection');
    }
  }, [role, router]);

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const handleSignUp = async () => {
    console.log('[SignUp] Starting signup process for role:', selectedRole);
    
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Role-specific validation
    if (selectedRole === 'business_owner' && (!formData.businessName || !formData.phone || !formData.state)) {
      Alert.alert('Error', 'Please fill in business name, phone, and state');
      return;
    }
    
    if (selectedRole === 'contractor' && !formData.location) {
      Alert.alert('Error', 'Please fill in your location');
      return;
    }
    
    if (selectedRole === 'event_host' && (!formData.organizationName || !formData.location)) {
      Alert.alert('Error', 'Please fill in organization name and location');
      return;
    }

    setIsLoading(true);
    try {
      let profile: any = { role: selectedRole };
      
      if (selectedRole === 'business_owner') {
        profile = {
          role: 'business_owner',
          companyName: formData.businessName,
          phone: formData.phone,
          companyWebsite: formData.website || null,
          location: formData.state,
        };
      } else if (selectedRole === 'contractor') {
        profile = {
          role: 'contractor',
          skills: formData.skills,
          location: formData.location,
        };
      } else if (selectedRole === 'event_host') {
        profile = {
          role: 'event_host',
          organizationName: formData.organizationName,
          location: formData.location,
        };
      }
      
      const user = await signup({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: selectedRole,
        profile
      });
      
      console.log('[SignUp] Signup successful, user:', user);
      
      // Let AuthGuard handle the redirect
    } catch (e: any) {
      console.error('[SignUp] Signup error:', e);
      const msg = e?.message ?? 'Failed to create account. Please check your information and try again.';
      if (typeof msg === 'string' && msg.toLowerCase().includes('email already in use')) {
        Alert.alert(
          'Email already in use',
          'An account with this email exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.replace(`/auth/login?prefill=${encodeURIComponent(formData.email)}`) },
          ]
        );
      } else {
        Alert.alert('Signup Failed', msg, [{ text: 'OK' }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch (selectedRole) {
      case 'business_owner': return Building2;
      case 'contractor': return UserCheck;
      case 'event_host': return Store;
      default: return Building2;
    }
  };

  const getRoleTitle = () => {
    switch (selectedRole) {
      case 'business_owner': return 'Business Owner';
      case 'contractor': return 'Contractor';
      case 'event_host': return 'Event Host';
      default: return 'Business Owner';
    }
  };

  const getRoleColors = (): [string, string] => {
    switch (selectedRole) {
      case 'business_owner': return ['#10B981', '#34D399'];
      case 'contractor': return ['#0EA5E9', '#22D3EE'];
      case 'event_host': return ['#F59E0B', '#FBBF24'];
      default: return ['#10B981', '#34D399'];
    }
  };

  const Icon = getRoleIcon();
  const colors = getRoleColors();

  return (
    <>
      <Stack.Screen options={{ title: `Create ${getRoleTitle()} Account` }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={colors}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Icon size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>{getRoleTitle()}</Text>
            <Text style={styles.headerSubtitle}>
              {selectedRole === 'business_owner' && 'Expand your business nationwide by hiring local contractors'}
              {selectedRole === 'contractor' && 'Work events nationwide, represent brands, and build your career'}
              {selectedRole === 'event_host' && 'Upload your events for free and sell vendor spots to businesses nationwide'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Create Your Account</Text>
          


          {/* Basic Info */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <User size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Mail size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address *"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password *"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Role-specific fields */}
            {selectedRole === 'business_owner' && (
              <>
                <View style={styles.inputWrapper}>
                  <Building2 size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Business Name *"
                    value={formData.businessName}
                    onChangeText={(text) => setFormData({ ...formData, businessName: text })}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Phone size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number *"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Globe size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Website (Optional)"
                    value={formData.website}
                    onChangeText={(text) => setFormData({ ...formData, website: text })}
                    keyboardType="url"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <MapPin size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="State (e.g., CA, NY, TX) *"
                    value={formData.state}
                    onChangeText={(text) => setFormData({ ...formData, state: text.toUpperCase() })}
                    maxLength={2}
                    autoCapitalize="characters"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </>
            )}

            {selectedRole === 'contractor' && (
              <>
                <View style={styles.inputWrapper}>
                  <MapPin size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Location (City, State) *"
                    value={formData.location}
                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                
                <View style={styles.skillsContainer}>
                  <Text style={styles.skillsLabel}>Skills (Optional)</Text>
                  <View style={styles.skillInputWrapper}>
                    <TextInput
                      style={styles.skillInput}
                      placeholder="Add a skill"
                      value={skillInput}
                      onChangeText={setSkillInput}
                      onSubmitEditing={addSkill}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity style={styles.addSkillButton} onPress={addSkill}>
                      <Text style={styles.addSkillButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  {formData.skills.length > 0 && (
                    <View style={styles.skillsList}>
                      {formData.skills.map((skill, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.skillTag}
                          onPress={() => removeSkill(skill)}
                        >
                          <Text style={styles.skillTagText}>{skill}</Text>
                          <Text style={styles.skillTagRemove}>×</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {selectedRole === 'event_host' && (
              <>
                <View style={styles.inputWrapper}>
                  <Building2 size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Organization Name *"
                    value={formData.organizationName}
                    onChangeText={(text) => setFormData({ ...formData, organizationName: text })}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <MapPin size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Location (City, State) *"
                    value={formData.location}
                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
            testID="signup-submit"
          >
            <LinearGradient
              colors={isLoading ? ['#9CA3AF', '#9CA3AF'] : colors}
              style={styles.signUpGradient}
            >
              <Text style={styles.signUpButtonText}>
                {isLoading ? 'Creating Account...' : `Create ${getRoleTitle()} Account`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/auth/login')}
            testID="link-to-login"
          >
            <Text style={[styles.backButtonText, { color: colors[0], fontWeight: '600' }]}>Already have an account? Sign in</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/auth/role-selection')}
          >
            <Text style={styles.backButtonText}>← Back to role selection</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  roleSelection: {
    marginBottom: 30,
  },
  roleSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  roleButtonSelected: {
    backgroundColor: '#EBF8FF',
    borderColor: '#10B981',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  roleButtonTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  inputContainer: {
    gap: 16,
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 16,
  },
  skillsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  skillInputWrapper: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  skillInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  addSkillButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addSkillButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  skillTagText: {
    fontSize: 14,
    color: '#374151',
  },
  skillTagRemove: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  signUpButton: {
    marginBottom: 16,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpGradient: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});
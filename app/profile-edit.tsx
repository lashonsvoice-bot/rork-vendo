import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Save, User, Building2, MapPin, Phone, Globe, DollarSign, Star, Mail, Shield, FileText, Calendar } from 'lucide-react-native';
import FileUpload from '@/components/FileUpload';
import { useAuth } from '@/hooks/auth-store';
import { trpc } from '@/lib/trpc';
import { neonTheme } from '@/constants/theme';

type BusinessOwnerData = {
  companyName: string;
  companyWebsite?: string;
  description?: string;
  location?: string;
  phone?: string;
  contactEmail?: string;
  needs?: string[];
  companyLogoUrl?: string;
  portfolioUrls?: string[];
  businessType?: 'llc' | 'sole_proprietor' | 'corporation' | 'partnership' | 'other';
  einNumber?: string;
  dunsNumber?: string;
  businessStartDate?: string;
};

type ContractorData = {
  skills: string[];
  ratePerHour?: number;
  bio?: string;
  portfolioUrl?: string;
  location?: string;
  availability?: 'full_time' | 'part_time' | 'contract';
  resumeUrl?: string;
  trainingMaterialsUrls?: string[];
  profilePhotos?: string[];
};

type EventHostData = {
  organizationName?: string;
  eventsHosted?: number;
  interests?: string[];
  bio?: string;
  location?: string;
  flyerPhotosUrls?: string[];
  businessType?: 'llc' | 'sole_proprietor' | 'corporation' | 'partnership' | 'other';
  einNumber?: string;
  dunsNumber?: string;
  businessStartDate?: string;
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const profileQuery = trpc.profile.get.useQuery(
    { userId: user?.id },
    { enabled: !!user?.id }
  );

  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Profile updated successfully!');
      profileQuery.refetch();
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  // Form state based on role
  const [businessOwnerData, setBusinessOwnerData] = useState<BusinessOwnerData>({
    companyName: '',
    companyWebsite: '',
    description: '',
    location: '',
    phone: '',
    contactEmail: '',
    needs: [],
    companyLogoUrl: '',
    portfolioUrls: [],
    businessType: undefined,
    einNumber: '',
    dunsNumber: '',
    businessStartDate: '',
  });

  const [contractorData, setContractorData] = useState<ContractorData>({
    skills: [],
    ratePerHour: undefined,
    bio: '',
    portfolioUrl: '',
    location: '',
    availability: undefined,
    resumeUrl: '',
    trainingMaterialsUrls: [],
    profilePhotos: [],
  });

  const [eventHostData, setEventHostData] = useState<EventHostData>({
    organizationName: '',
    eventsHosted: undefined,
    interests: [],
    bio: '',
    location: '',
    flyerPhotosUrls: [],
    businessType: undefined,
    einNumber: '',
    dunsNumber: '',
    businessStartDate: '',
  });

  // Initialize form data when profile loads
  React.useEffect(() => {
    if (profileQuery.data && user?.role) {
      const profile = profileQuery.data;
      
      if (user.role === 'business_owner' && profile.role === 'business_owner') {
        setBusinessOwnerData({
          companyName: profile.companyName || '',
          companyWebsite: profile.companyWebsite || '',
          description: profile.description || '',
          location: profile.location || '',
          phone: profile.phone || '',
          contactEmail: profile.contactEmail || '',
          needs: profile.needs || [],
          companyLogoUrl: profile.companyLogoUrl || '',
          portfolioUrls: profile.portfolioUrls || [],
          businessType: profile.businessType || undefined,
          einNumber: profile.einNumber || '',
          dunsNumber: profile.dunsNumber || '',
          businessStartDate: profile.businessStartDate || '',
        });
      } else if (user.role === 'contractor' && profile.role === 'contractor') {
        setContractorData({
          skills: profile.skills || [],
          ratePerHour: profile.ratePerHour || undefined,
          bio: profile.bio || '',
          portfolioUrl: profile.portfolioUrl || '',
          location: profile.location || '',
          availability: profile.availability || undefined,
          resumeUrl: profile.resumeUrl || '',
          trainingMaterialsUrls: profile.trainingMaterialsUrls || [],
          profilePhotos: profile.profilePhotos || [],
        });
      } else if (user.role === 'event_host' && profile.role === 'event_host') {
        setEventHostData({
          organizationName: profile.organizationName || '',
          eventsHosted: profile.eventsHosted || undefined,
          interests: profile.interests || [],
          bio: profile.bio || '',
          location: profile.location || '',
          flyerPhotosUrls: profile.flyerPhotosUrls || [],
          businessType: profile.businessType || undefined,
          einNumber: profile.einNumber || '',
          dunsNumber: profile.dunsNumber || '',
          businessStartDate: profile.businessStartDate || '',
        });
      }
    }
  }, [profileQuery.data, user?.role]);

  const handleSave = useCallback(async () => {
    if (!user?.role) return;

    setIsLoading(true);
    try {
      let profileData: any;

      if (user.role === 'business_owner') {
        if (!businessOwnerData.companyName.trim()) {
          Alert.alert('Error', 'Company name is required');
          return;
        }
        profileData = {
          role: 'business_owner' as const,
          ...businessOwnerData,
          needs: businessOwnerData.needs?.filter(n => n.trim()) || [],
        };
      } else if (user.role === 'contractor') {
        profileData = {
          role: 'contractor' as const,
          ...contractorData,
          skills: contractorData.skills?.filter(s => s.trim()) || [],
        };
      } else if (user.role === 'event_host') {
        profileData = {
          role: 'event_host' as const,
          ...eventHostData,
          interests: eventHostData.interests?.filter(i => i.trim()) || [],
        };
      }

      await updateProfileMutation.mutateAsync(profileData);
    } catch (error) {
      console.error('[ProfileEdit] Save error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role, businessOwnerData, contractorData, eventHostData, updateProfileMutation]);

  const addArrayItem = useCallback((type: 'needs' | 'skills' | 'interests', value: string) => {
    if (!value.trim()) return;

    if (type === 'needs') {
      setBusinessOwnerData(prev => ({
        ...prev,
        needs: [...(prev.needs || []), value.trim()],
      }));
    } else if (type === 'skills') {
      setContractorData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), value.trim()],
      }));
    } else if (type === 'interests') {
      setEventHostData(prev => ({
        ...prev,
        interests: [...(prev.interests || []), value.trim()],
      }));
    }
  }, []);

  const removeArrayItem = useCallback((type: 'needs' | 'skills' | 'interests', index: number) => {
    if (type === 'needs') {
      setBusinessOwnerData(prev => ({
        ...prev,
        needs: prev.needs?.filter((_, i) => i !== index) || [],
      }));
    } else if (type === 'skills') {
      setContractorData(prev => ({
        ...prev,
        skills: prev.skills?.filter((_, i) => i !== index) || [],
      }));
    } else if (type === 'interests') {
      setEventHostData(prev => ({
        ...prev,
        interests: prev.interests?.filter((_, i) => i !== index) || [],
      }));
    }
  }, []);

  if (profileQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ 
        title: 'Edit Profile',
        headerRight: () => (
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isLoading}
            style={[styles.saveButton, isLoading && { opacity: 0.6 }]}
          >
            <Save size={20} color={neonTheme.accentCyan} />
          </TouchableOpacity>
        ),
      }} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <LinearGradient
          colors={neonTheme.gradientHeader as unknown as any}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <User size={32} color="#FFFFFF" />
            <Text style={styles.headerTitle}>
              {user?.role === 'business_owner' ? 'Business Profile' :
               user?.role === 'contractor' ? 'Contractor Profile' :
               'Event Host Profile'}
            </Text>
            <Text style={styles.headerSubtitle}>{user?.name} • {user?.email}</Text>
          </View>
        </LinearGradient>

        <View style={styles.form}>
          {user?.role === 'business_owner' && (
            <BusinessOwnerForm 
              data={businessOwnerData}
              setData={setBusinessOwnerData}
              addArrayItem={addArrayItem}
              removeArrayItem={removeArrayItem}
            />
          )}
          
          {user?.role === 'contractor' && (
            <ContractorForm 
              data={contractorData}
              setData={setContractorData}
              addArrayItem={addArrayItem}
              removeArrayItem={removeArrayItem}
            />
          )}
          
          {user?.role === 'event_host' && (
            <EventHostForm 
              data={eventHostData}
              setData={setEventHostData}
              addArrayItem={addArrayItem}
              removeArrayItem={removeArrayItem}
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}

// Business Owner Form Component
function BusinessOwnerForm({ 
  data, 
  setData, 
  addArrayItem, 
  removeArrayItem 
}: {
  data: BusinessOwnerData;
  setData: React.Dispatch<React.SetStateAction<BusinessOwnerData>>;
  addArrayItem: (type: 'needs' | 'skills' | 'interests', value: string) => void;
  removeArrayItem: (type: 'needs' | 'skills' | 'interests', index: number) => void;
}) {
  const [newNeed, setNewNeed] = useState<string>('');

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Company Name *</Text>
          <View style={styles.inputRow}>
            <Building2 size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.companyName}
              onChangeText={(text) => setData(prev => ({ ...prev, companyName: text }))}
              placeholder="Enter company name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website</Text>
          <View style={styles.inputRow}>
            <Globe size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.companyWebsite}
              onChangeText={(text) => setData(prev => ({ ...prev, companyWebsite: text }))}
              placeholder="https://yourcompany.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="url"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputRow}>
            <MapPin size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.location}
              onChangeText={(text) => setData(prev => ({ ...prev, location: text }))}
              placeholder="City, State"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <View style={styles.inputRow}>
            <Phone size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.phone}
              onChangeText={(text) => setData(prev => ({ ...prev, phone: text }))}
              placeholder="(555) 123-4567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Email</Text>
          <View style={styles.inputRow}>
            <Mail size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.contactEmail}
              onChangeText={(text) => setData(prev => ({ ...prev, contactEmail: text }))}
              placeholder="contact@yourcompany.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <Text style={styles.helperText}>
            This email will be used for external communications and proposal replies
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={data.description}
            onChangeText={(text) => setData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your business..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Needs</Text>
        <View style={styles.arrayInput}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newNeed}
              onChangeText={setNewNeed}
              placeholder="Add a business need..."
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={() => {
                addArrayItem('needs', newNeed);
                setNewNeed('');
              }}
            />
            <TouchableOpacity
              onPress={() => {
                addArrayItem('needs', newNeed);
                setNewNeed('');
              }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tags}>
          {data.needs?.map((need, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => removeArrayItem('needs', index)}
              style={styles.tag}
            >
              <Text style={styles.tagText}>{need} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.verificationHeader}>
          <Shield size={24} color="#10B981" />
          <Text style={styles.sectionTitle}>Business Verification</Text>
        </View>
        <Text style={styles.verificationSubtitle}>
          Provide business information to get verified and receive a 5% discount on yearly subscriptions
        </Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Type</Text>
          <View style={styles.businessTypeOptions}>
            {(['llc', 'sole_proprietor', 'corporation', 'partnership', 'other'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setData(prev => ({ ...prev, businessType: type }))}
                style={[
                  styles.businessTypeOption,
                  data.businessType === type && styles.businessTypeOptionActive
                ]}
              >
                <Text style={[
                  styles.businessTypeText,
                  data.businessType === type && styles.businessTypeTextActive
                ]}>
                  {type === 'llc' ? 'LLC' :
                   type === 'sole_proprietor' ? 'Sole Proprietor' :
                   type === 'corporation' ? 'Corporation' :
                   type === 'partnership' ? 'Partnership' : 'Other'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>EIN Number</Text>
          <View style={styles.inputRow}>
            <FileText size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.einNumber}
              onChangeText={(text) => setData(prev => ({ ...prev, einNumber: text }))}
              placeholder="12-3456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.helperText}>
            Federal Employer Identification Number (required for verification)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>DUNS Number (Required for Verification)</Text>
          <View style={styles.inputRow}>
            <FileText size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.dunsNumber}
              onChangeText={(text) => setData(prev => ({ ...prev, dunsNumber: text }))}
              placeholder="123456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.helperText}>
            Data Universal Numbering System identifier (required for verification)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Start Date (Required for Verification)</Text>
          <View style={styles.inputRow}>
            <Calendar size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.businessStartDate}
              onChangeText={(text) => setData(prev => ({ ...prev, businessStartDate: text }))}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <Text style={styles.helperText}>
            Date when your business was officially established (required for verification)
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Assets</Text>
        
        <FileUpload
          label="Company Logo"
          description="Upload your company logo (JPG, PNG, GIF, WebP)"
          fileType="images"
          currentFiles={data.companyLogoUrl ? [data.companyLogoUrl] : []}
          onUpload={(fileUrl) => setData(prev => ({ ...prev, companyLogoUrl: fileUrl }))}
          onRemove={() => setData(prev => ({ ...prev, companyLogoUrl: '' }))}
        />
        
        <FileUpload
          label="Portfolio Images"
          description="Upload portfolio images to showcase your work"
          fileType="images"
          multiple
          currentFiles={data.portfolioUrls || []}
          onUpload={(fileUrl) => setData(prev => ({ 
            ...prev, 
            portfolioUrls: [...(prev.portfolioUrls || []), fileUrl] 
          }))}
          onRemove={(fileUrl) => setData(prev => ({ 
            ...prev, 
            portfolioUrls: prev.portfolioUrls?.filter(url => url !== fileUrl) || [] 
          }))}
        />
      </View>
    </>
  );
}

// Contractor Form Component
function ContractorForm({ 
  data, 
  setData, 
  addArrayItem, 
  removeArrayItem 
}: {
  data: ContractorData;
  setData: React.Dispatch<React.SetStateAction<ContractorData>>;
  addArrayItem: (type: 'needs' | 'skills' | 'interests', value: string) => void;
  removeArrayItem: (type: 'needs' | 'skills' | 'interests', index: number) => void;
}) {
  const [newSkill, setNewSkill] = useState<string>('');

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hourly Rate</Text>
          <View style={styles.inputRow}>
            <DollarSign size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.ratePerHour?.toString() || ''}
              onChangeText={(text) => setData(prev => ({ 
                ...prev, 
                ratePerHour: text ? parseFloat(text) : undefined 
              }))}
              placeholder="25.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputRow}>
            <MapPin size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.location}
              onChangeText={(text) => setData(prev => ({ ...prev, location: text }))}
              placeholder="City, State"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Portfolio URL</Text>
          <View style={styles.inputRow}>
            <Globe size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.portfolioUrl}
              onChangeText={(text) => setData(prev => ({ ...prev, portfolioUrl: text }))}
              placeholder="https://yourportfolio.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="url"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Availability</Text>
          <View style={styles.availabilityOptions}>
            {(['full_time', 'part_time', 'contract'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setData(prev => ({ ...prev, availability: option }))}
                style={[
                  styles.availabilityOption,
                  data.availability === option && styles.availabilityOptionActive
                ]}
              >
                <Text style={[
                  styles.availabilityText,
                  data.availability === option && styles.availabilityTextActive
                ]}>
                  {option.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={data.bio}
            onChangeText={(text) => setData(prev => ({ ...prev, bio: text }))}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.arrayInput}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newSkill}
              onChangeText={setNewSkill}
              placeholder="Add a skill..."
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={() => {
                addArrayItem('skills', newSkill);
                setNewSkill('');
              }}
            />
            <TouchableOpacity
              onPress={() => {
                addArrayItem('skills', newSkill);
                setNewSkill('');
              }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tags}>
          {data.skills?.map((skill, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => removeArrayItem('skills', index)}
              style={styles.tag}
            >
              <Text style={styles.tagText}>{skill} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Documents</Text>
        
        <FileUpload
          label="Resume"
          description="Upload your resume (PDF, DOC, DOCX)"
          fileType="documents"
          currentFiles={data.resumeUrl ? [data.resumeUrl] : []}
          onUpload={(fileUrl) => setData(prev => ({ ...prev, resumeUrl: fileUrl }))}
          onRemove={() => setData(prev => ({ ...prev, resumeUrl: '' }))}
        />
        
        <FileUpload
          label="Training Materials"
          description="Upload certificates, training materials, or other documents"
          fileType="documents"
          multiple
          currentFiles={data.trainingMaterialsUrls || []}
          onUpload={(fileUrl) => setData(prev => ({ 
            ...prev, 
            trainingMaterialsUrls: [...(prev.trainingMaterialsUrls || []), fileUrl] 
          }))}
          onRemove={(fileUrl) => setData(prev => ({ 
            ...prev, 
            trainingMaterialsUrls: prev.trainingMaterialsUrls?.filter(url => url !== fileUrl) || [] 
          }))}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Photos</Text>
        <Text style={styles.sectionSubtitle}>
          Add photos to showcase your work and build trust with potential clients
        </Text>
        
        <FileUpload
          label="Profile Photos"
          description="Upload photos of your work, certifications, or professional headshots (JPG, PNG, GIF)"
          fileType="images"
          multiple
          currentFiles={data.profilePhotos || []}
          onUpload={(fileUrl) => setData(prev => ({ 
            ...prev, 
            profilePhotos: [...(prev.profilePhotos || []), fileUrl] 
          }))}
          onRemove={(fileUrl) => setData(prev => ({ 
            ...prev, 
            profilePhotos: prev.profilePhotos?.filter(url => url !== fileUrl) || [] 
          }))}
        />
      </View>
    </>
  );
}

// Event Host Form Component
function EventHostForm({ 
  data, 
  setData, 
  addArrayItem, 
  removeArrayItem 
}: {
  data: EventHostData;
  setData: React.Dispatch<React.SetStateAction<EventHostData>>;
  addArrayItem: (type: 'needs' | 'skills' | 'interests', value: string) => void;
  removeArrayItem: (type: 'needs' | 'skills' | 'interests', index: number) => void;
}) {
  const [newInterest, setNewInterest] = useState<string>('');

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Organization Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Organization Name</Text>
          <View style={styles.inputRow}>
            <Building2 size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.organizationName}
              onChangeText={(text) => setData(prev => ({ ...prev, organizationName: text }))}
              placeholder="Enter organization name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Events Hosted</Text>
          <View style={styles.inputRow}>
            <Star size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.eventsHosted?.toString() || ''}
              onChangeText={(text) => setData(prev => ({ 
                ...prev, 
                eventsHosted: text ? parseInt(text) : undefined 
              }))}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputRow}>
            <MapPin size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.location}
              onChangeText={(text) => setData(prev => ({ ...prev, location: text }))}
              placeholder="City, State"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={data.bio}
            onChangeText={(text) => setData(prev => ({ ...prev, bio: text }))}
            placeholder="Tell us about your organization..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <View style={styles.arrayInput}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newInterest}
              onChangeText={setNewInterest}
              placeholder="Add an interest..."
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={() => {
                addArrayItem('interests', newInterest);
                setNewInterest('');
              }}
            />
            <TouchableOpacity
              onPress={() => {
                addArrayItem('interests', newInterest);
                setNewInterest('');
              }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tags}>
          {data.interests?.map((interest, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => removeArrayItem('interests', index)}
              style={styles.tag}
            >
              <Text style={styles.tagText}>{interest} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.verificationHeader}>
          <Shield size={24} color="#10B981" />
          <Text style={styles.sectionTitle}>Business Verification</Text>
        </View>
        <Text style={styles.verificationSubtitle}>
          Provide business information to get verified and receive a 5% discount on yearly subscriptions
        </Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Type</Text>
          <View style={styles.businessTypeOptions}>
            {(['llc', 'sole_proprietor', 'corporation', 'partnership', 'other'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setData(prev => ({ ...prev, businessType: type }))}
                style={[
                  styles.businessTypeOption,
                  data.businessType === type && styles.businessTypeOptionActive
                ]}
              >
                <Text style={[
                  styles.businessTypeText,
                  data.businessType === type && styles.businessTypeTextActive
                ]}>
                  {type === 'llc' ? 'LLC' :
                   type === 'sole_proprietor' ? 'Sole Proprietor' :
                   type === 'corporation' ? 'Corporation' :
                   type === 'partnership' ? 'Partnership' : 'Other'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>EIN Number</Text>
          <View style={styles.inputRow}>
            <FileText size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.einNumber}
              onChangeText={(text) => setData(prev => ({ ...prev, einNumber: text }))}
              placeholder="12-3456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.helperText}>
            Federal Employer Identification Number (required for verification)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>DUNS Number (Required for Verification)</Text>
          <View style={styles.inputRow}>
            <FileText size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.dunsNumber}
              onChangeText={(text) => setData(prev => ({ ...prev, dunsNumber: text }))}
              placeholder="123456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.helperText}>
            Data Universal Numbering System identifier (required for verification)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Start Date (Required for Verification)</Text>
          <View style={styles.inputRow}>
            <Calendar size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={data.businessStartDate}
              onChangeText={(text) => setData(prev => ({ ...prev, businessStartDate: text }))}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <Text style={styles.helperText}>
            Date when your business was officially established (required for verification)
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Materials</Text>
        
        <FileUpload
          label="Flyer Photos"
          description="Upload event flyers, photos, or promotional materials"
          fileType="images"
          multiple
          currentFiles={data.flyerPhotosUrls || []}
          onUpload={(fileUrl) => setData(prev => ({ 
            ...prev, 
            flyerPhotosUrls: [...(prev.flyerPhotosUrls || []), fileUrl] 
          }))}
          onRemove={(fileUrl) => setData(prev => ({ 
            ...prev, 
            flyerPhotosUrls: prev.flyerPhotosUrls?.filter(url => url !== fileUrl) || [] 
          }))}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neonTheme.background,
  },
  content: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: neonTheme.background,
  },
  loadingText: {
    color: neonTheme.textSecondary,
    fontSize: 16,
  },
  saveButton: {
    padding: 8,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: neonTheme.textSecondary,
  },
  form: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: neonTheme.textPrimary,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: neonTheme.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neonTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: neonTheme.border,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: neonTheme.textPrimary,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: neonTheme.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: neonTheme.border,
    textAlignVertical: 'top',
  },
  availabilityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  availabilityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: neonTheme.surface,
    borderWidth: 1,
    borderColor: neonTheme.border,
    alignItems: 'center',
  },
  availabilityOptionActive: {
    backgroundColor: neonTheme.accentCyan + '20',
    borderColor: neonTheme.accentCyan,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
    color: neonTheme.textSecondary,
  },
  availabilityTextActive: {
    color: neonTheme.accentCyan,
  },
  arrayInput: {
    gap: 8,
  },
  addButton: {
    backgroundColor: neonTheme.accentCyan,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: neonTheme.accentCyan + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neonTheme.accentCyan,
  },
  tagText: {
    color: neonTheme.accentCyan,
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: neonTheme.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: neonTheme.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  businessTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  businessTypeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: neonTheme.surface,
    borderWidth: 1,
    borderColor: neonTheme.border,
    minWidth: 80,
    alignItems: 'center',
  },
  businessTypeOptionActive: {
    backgroundColor: '#10B981' + '20',
    borderColor: '#10B981',
  },
  businessTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: neonTheme.textSecondary,
  },
  businessTypeTextActive: {
    color: '#10B981',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: neonTheme.textSecondary,
    marginTop: -8,
    marginBottom: 12,
    lineHeight: 20,
  },
});
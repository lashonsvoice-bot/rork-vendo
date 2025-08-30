import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import {
  Plus,
  FileText,
  Play,
  Link,
  Upload,
  Edit3,
  Trash2,
  CheckCircle,
  X,
  Save,
  AlertTriangle,
  FolderOpen,
  Video,
  DollarSign,
  Square,
  CheckSquare,
} from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useUser, TrainingDocument, QuizQuestion } from '@/hooks/user-store';

export default function TrainingMaterialsScreen() {
  const { 
    userRole, 
    trainingMaterials, 
    trainingProgress, 
    createTrainingMaterial, 
    updateTrainingMaterial, 
    deleteTrainingMaterial 
  } = useUser();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<TrainingDocument | null>(null);
  const [formData, setFormData] = useState<Partial<TrainingDocument & { zoomLink?: string; minEventValue?: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isAcknowledgmentModalVisible, setIsAcknowledgmentModalVisible] = useState(false);
  const [acknowledgments, setAcknowledgments] = useState({
    noShow: false,
    notEmployee: false,
  });

  // Show acknowledgment modal for contractors
  if (userRole === 'contractor' && !isAcknowledgmentModalVisible) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Training & Acknowledgments' }} />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Contractor Training & Acknowledgments</Text>
            <Text style={styles.subtitle}>
              Please review and acknowledge the following terms before accessing training materials.
            </Text>
          </View>

          <View style={styles.acknowledgmentContainer}>
            <Text style={styles.acknowledgmentTitle}>Required Acknowledgments</Text>
            
            {/* No-Show Policy Acknowledgment */}
            <TouchableOpacity
              style={styles.acknowledgmentItem}
              onPress={() => setAcknowledgments(prev => ({ ...prev, noShow: !prev.noShow }))}
            >
              <View style={styles.checkboxContainer}>
                {acknowledgments.noShow ? (
                  <CheckSquare size={24} color="#10B981" />
                ) : (
                  <Square size={24} color="#EF4444" />
                )}
              </View>
              <View style={styles.acknowledgmentTextContainer}>
                <Text style={styles.acknowledgmentText}>
                  <Text style={styles.boldText}>I acknowledge that no-shows for events will result in immediate account suspension.</Text>
                </Text>
                <Text style={styles.acknowledgmentSubtext}>
                  This policy ensures reliability and professionalism for all events.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Independent Contractor Acknowledgment */}
            <TouchableOpacity
              style={styles.acknowledgmentItem}
              onPress={() => setAcknowledgments(prev => ({ ...prev, notEmployee: !prev.notEmployee }))}
            >
              <View style={styles.checkboxContainer}>
                {acknowledgments.notEmployee ? (
                  <CheckSquare size={24} color="#10B981" />
                ) : (
                  <Square size={24} color="#EF4444" />
                )}
              </View>
              <View style={styles.acknowledgmentTextContainer}>
                <Text style={styles.acknowledgmentText}>
                  <Text style={styles.boldText}>I understand that I am not a RevoVend employee. I am contracting as a service provider for the hiring company I applied to.</Text>
                </Text>
                <Text style={styles.acknowledgmentSubtext}>
                  You are an independent contractor working directly with event hosts and businesses.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Warning if not all acknowledged */}
            {(!acknowledgments.noShow || !acknowledgments.notEmployee) && (
              <View style={styles.warningBox}>
                <AlertTriangle size={20} color="#EF4444" />
                <Text style={styles.warningText}>
                  You must acknowledge all terms to proceed to training materials.
                </Text>
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                (!acknowledgments.noShow || !acknowledgments.notEmployee) && styles.continueButtonDisabled
              ]}
              onPress={() => {
                if (acknowledgments.noShow && acknowledgments.notEmployee) {
                  setIsAcknowledgmentModalVisible(true);
                  Alert.alert(
                    'Acknowledgments Accepted',
                    'Thank you for acknowledging the terms. You can now access training materials.',
                    [{ text: 'Continue', style: 'default' }]
                  );
                } else {
                  Alert.alert(
                    'Acknowledgments Required',
                    'Please acknowledge all terms before continuing.',
                    [{ text: 'OK', style: 'default' }]
                  );
                }
              }}
              disabled={!acknowledgments.noShow || !acknowledgments.notEmployee}
            >
              <Text style={styles.continueButtonText}>
                {acknowledgments.noShow && acknowledgments.notEmployee
                  ? 'Continue to Training Materials'
                  : 'Please Acknowledge All Terms'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    );
  }

  // Show contractor view of training materials
  if (userRole === 'contractor') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Training Materials' }} />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Training Materials</Text>
            <Text style={styles.subtitle}>
              Complete all required training materials and pass the quizzes to qualify for events.
            </Text>
          </View>

          {trainingMaterials.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Training Materials Available</Text>
              <Text style={styles.emptyText}>
                Training materials will appear here once they are created by business owners.
              </Text>
            </View>
          ) : (
            <View style={styles.materialsContainer}>
              <Text style={styles.sectionTitle}>
                Available Training ({trainingMaterials.length})
              </Text>
              {trainingMaterials.map(material => {
                const userProgress = trainingProgress.find(p => p.trainingId === material.id);
                const isCompleted = userProgress?.completed || false;
                const attempts = userProgress?.attempts || 0;
                
                return (
                  <TouchableOpacity
                    key={material.id}
                    style={[styles.materialCard, isCompleted && styles.completedCard]}
                    onPress={() => {
                      // Navigate to training viewer
                      Alert.alert(
                        material.title,
                        `${material.type === 'pdf' ? 'PDF Document' : 'Video Training'}\n\n` +
                        `Status: ${isCompleted ? 'Completed ✅' : 'Not Completed'}\n` +
                        `Attempts: ${attempts}/3\n\n` +
                        `${material.required ? 'This is required training.' : 'This is optional training.'}`,
                        [{ text: 'View Training', style: 'default' }]
                      );
                    }}
                  >
                    <View style={styles.materialHeader}>
                      <View style={[styles.materialIcon, isCompleted && styles.completedIcon]}>
                        {isCompleted ? (
                          <CheckCircle size={20} color="#10B981" />
                        ) : material.type === 'video_link' || material.type === 'video_upload' ? (
                          <Play size={20} color="#6366F1" />
                        ) : (
                          <FileText size={20} color="#6366F1" />
                        )}
                      </View>
                      <View style={styles.materialInfo}>
                        <Text style={styles.materialTitle}>{material.title}</Text>
                        <Text style={styles.materialType}>
                          {material.type === 'pdf' && 'PDF Document'}
                          {material.type === 'video_link' && 'Video Link'}
                          {material.type === 'video_upload' && 'Video Upload'}
                          {material.required && ' • Required'}
                        </Text>
                        <Text style={[styles.materialProgress, isCompleted && styles.completedProgress]}>
                          {isCompleted ? 'Completed ✅' : `Attempts: ${attempts}/3`}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.quizInfo}>
                      <Text style={styles.quizText}>
                        Quiz: {material.questions?.length || 0} questions • Perfect score required
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    );
  }

  if (userRole !== 'business_owner') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Training Materials' }} />
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            Only business owners and contractors can access training materials.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCreateMaterial = () => {
    setFormData({
      title: '',
      type: 'pdf',
      url: '',
      questions: [],
      required: false,
    });
    setUploadedFile(null);
    setIsCreateModalVisible(true);
  };

  const handleEditMaterial = (material: TrainingDocument) => {
    setEditingMaterial(material);
    setFormData({ ...material });
    setUploadedFile(null);
    setIsEditModalVisible(true);
  };

  const handleDeleteMaterial = (materialId: string) => {
    Alert.alert(
      'Delete Training Material',
      'Are you sure you want to delete this training material? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTrainingMaterial(materialId);
          },
        },
      ]
    );
  };

  const handleSaveMaterial = async () => {
    if (!formData.title || !formData.type) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (formData.questions && formData.questions.length !== 5) {
      Alert.alert('Error', 'Please add exactly 5 quiz questions.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingMaterial) {
        await updateTrainingMaterial(editingMaterial.id, {
          title: formData.title!,
          type: formData.type!,
          url: formData.url,
          questions: formData.questions || [],
          required: formData.required || false,
        });
      } else {
        await createTrainingMaterial({
          title: formData.title!,
          type: formData.type!,
          url: formData.url || '',
          questions: formData.questions || [],
          required: formData.required || false,
        });
      }

      setIsCreateModalVisible(false);
      setIsEditModalVisible(false);
      setEditingMaterial(null);
      setFormData({});
      setUploadedFile(null);
      Alert.alert('Success', 'Training material saved successfully!');
    } catch {
      Alert.alert('Error', 'Failed to save training material. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    };
    setFormData(prev => ({
      ...prev,
      questions: [...(prev.questions || []), newQuestion],
    }));
  };

  const updateQuestion = (questionId: string, field: keyof QuizQuestion, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions?.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      ) || [],
    }));
  };

  const removeQuestion = (questionId: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions?.filter(q => q.id !== questionId) || [],
    }));
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setUploadedFile(file);
        
        // For demo purposes, we'll use the file URI as the URL
        // In a real app, you'd upload this to a server and get back a URL
        setFormData(prev => ({ 
          ...prev, 
          url: file.uri,
          title: prev.title || file.name.replace('.pdf', '')
        }));
        
        Alert.alert(
          'PDF Selected', 
          `Selected: ${file.name}\nSize: ${(file.size! / 1024 / 1024).toFixed(2)} MB`
        );
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select PDF file. Please try again.');
    }
  };

  const getProgressStats = (materialId: string) => {
    const progress = trainingProgress.filter(p => p.trainingId === materialId);
    const completed = progress.filter(p => p.completed).length;
    const total = progress.length;
    return { completed, total };
  };

  const renderMaterialCard = (material: TrainingDocument) => {
    const { completed, total } = getProgressStats(material.id);
    
    return (
      <View key={material.id} style={styles.materialCard}>
        <View style={styles.materialHeader}>
          <View style={styles.materialIcon}>
            {material.type === 'video_link' || material.type === 'video_upload' ? (
              <Play size={20} color="#6366F1" />
            ) : (
              <FileText size={20} color="#6366F1" />
            )}
          </View>
          <View style={styles.materialInfo}>
            <Text style={styles.materialTitle}>{material.title}</Text>
            <Text style={styles.materialType}>
              {material.type === 'pdf' && 'PDF Document'}
              {material.type === 'video_link' && 'Video Link'}
              {material.type === 'video_upload' && 'Video Upload'}
              {material.type === 'video' && 'Video Training'}
              {material.type === 'document' && 'Document'}
              {material.required && ' • Required'}
            </Text>
            <Text style={styles.materialProgress}>
              Progress: {completed}/{total} contractors completed
            </Text>
          </View>
          <View style={styles.materialActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditMaterial(material)}
            >
              <Edit3 size={16} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteMaterial(material.id)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        {material.url && (
          <View style={styles.materialUrl}>
            <Link size={14} color="#6B7280" />
            <Text style={styles.urlText} numberOfLines={1}>{material.url}</Text>
          </View>
        )}
        
        <View style={styles.quizInfo}>
          <Text style={styles.quizText}>
            Quiz: {material.questions?.length || 0} questions • Perfect score required • 3 attempts max
          </Text>
        </View>
      </View>
    );
  };

  const renderQuestionForm = (question: QuizQuestion, index: number) => {
    return (
      <View key={question.id} style={styles.questionContainer}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionLabel}>Question {index + 1}</Text>
          <TouchableOpacity
            style={styles.removeQuestionButton}
            onPress={() => removeQuestion(question.id)}
          >
            <X size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.questionInput}
          value={question.question}
          onChangeText={(text) => updateQuestion(question.id, 'question', text)}
          placeholder="Enter your question"
          multiline
        />
        
        <Text style={styles.optionsLabel}>Answer Options:</Text>
        {question.options.map((option, optionIndex) => (
          <View key={optionIndex} style={styles.optionContainer}>
            <TouchableOpacity
              style={[
                styles.correctAnswerButton,
                question.correctAnswer === optionIndex && styles.correctAnswerButtonSelected
              ]}
              onPress={() => updateQuestion(question.id, 'correctAnswer', optionIndex)}
            >
              <CheckCircle 
                size={16} 
                color={question.correctAnswer === optionIndex ? '#10B981' : '#D1D5DB'} 
              />
            </TouchableOpacity>
            <TextInput
              style={styles.optionInput}
              value={option}
              onChangeText={(text) => {
                const newOptions = [...question.options];
                newOptions[optionIndex] = text;
                updateQuestion(question.id, 'options', newOptions);
              }}
              placeholder={`Option ${optionIndex + 1}`}
            />
          </View>
        ))}
        
        <Text style={styles.correctAnswerHint}>
          Tap the circle next to the correct answer
        </Text>
      </View>
    );
  };

  const renderModal = (isVisible: boolean, onClose: () => void) => {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingMaterial ? 'Edit Training Material' : 'Create Training Material'}
            </Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveMaterial}
              disabled={isLoading}
            >
              <Save size={20} color="#10B981" />
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Enter training material title"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Type *</Text>
              <View style={styles.typeContainer}>
                {[
                  { key: 'pdf', label: 'PDF Document', icon: FileText },
                  { key: 'video_link', label: 'Video Link', icon: Link },
                  { key: 'video_upload', label: 'Video Upload', icon: Upload },
                ].map(({ key, label, icon: Icon }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.typeOption,
                      formData.type === key && styles.typeOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type: key as any }))}
                  >
                    <Icon size={16} color={formData.type === key ? '#6366F1' : '#6B7280'} />
                    <Text style={[
                      styles.typeOptionText,
                      formData.type === key && styles.typeOptionTextSelected
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {formData.type === 'pdf' && 'PDF File'}
                {formData.type === 'video_link' && 'Video URL'}
                {formData.type === 'video_upload' && 'Video File URL'}
              </Text>
              
              {formData.type === 'pdf' ? (
                <View style={styles.fileUploadContainer}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handlePickDocument}
                  >
                    <FolderOpen size={20} color="#6366F1" />
                    <Text style={styles.uploadButtonText}>
                      {uploadedFile ? 'Change PDF' : 'Select PDF File'}
                    </Text>
                  </TouchableOpacity>
                  
                  {uploadedFile && (
                    <View style={styles.selectedFileInfo}>
                      <FileText size={16} color="#10B981" />
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName}>{uploadedFile.name}</Text>
                        <Text style={styles.fileSize}>
                          {(uploadedFile.size! / 1024 / 1024).toFixed(2)} MB
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeFileButton}
                        onPress={() => {
                          setUploadedFile(null);
                          setFormData(prev => ({ ...prev, url: '' }));
                        }}
                      >
                        <X size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <Text style={styles.uploadHint}>
                    Select a PDF file from your device. Maximum size: 50MB
                  </Text>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={formData.url || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, url: text }))}
                  placeholder="Enter URL or file path"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Required Training</Text>
              <TouchableOpacity
                style={[
                  styles.requiredToggle,
                  formData.required && styles.requiredToggleSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, required: !prev.required }))}
              >
                <CheckCircle 
                  size={20} 
                  color={formData.required ? '#10B981' : '#D1D5DB'} 
                />
                <Text style={[
                  styles.requiredToggleText,
                  formData.required && styles.requiredToggleTextSelected
                ]}>
                  Mark as required training
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Zoom Link for High-Value Events</Text>
              <View style={styles.inputRow}>
                <Video size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  value={formData.zoomLink || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, zoomLink: text }))}
                  placeholder="https://zoom.us/j/..."
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.helperText}>
                Provide a Zoom link for virtual training sessions (recommended for high-paying events)
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Minimum Event Value for Zoom Training</Text>
              <View style={styles.inputRow}>
                <DollarSign size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  value={formData.minEventValue?.toString() || ''}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    minEventValue: text ? parseFloat(text) : undefined 
                  }))}
                  placeholder="500.00"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.helperText}>
                Events with value above this amount will have access to Zoom training sessions
              </Text>
            </View>

            <View style={styles.quizSection}>
              <View style={styles.quizHeader}>
                <Text style={styles.quizTitle}>Quiz Questions (5 required)</Text>
                <TouchableOpacity
                  style={styles.addQuestionButton}
                  onPress={addQuestion}
                  disabled={(formData.questions?.length || 0) >= 5}
                >
                  <Plus size={16} color={(formData.questions?.length || 0) >= 5 ? '#D1D5DB' : '#6366F1'} />
                  <Text style={[
                    styles.addQuestionText,
                    (formData.questions?.length || 0) >= 5 && styles.addQuestionTextDisabled
                  ]}>
                    Add Question
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.quizDescription}>
                Create exactly 5 multiple choice questions. Contractors must get a perfect score (5/5) to pass.
                They have 3 attempts maximum.
              </Text>

              {formData.questions?.map((question, index) => renderQuestionForm(question, index))}
            </View>

            <View style={styles.modalBottomSpacing} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Training Materials',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreateMaterial}
            >
              <Plus size={20} color="#6366F1" />
              <Text style={styles.headerButtonText}>Create</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Training Materials Management</Text>
          <Text style={styles.subtitle}>
            Create and manage training materials for contractors. Each material includes a 5-question quiz
            that contractors must pass with a perfect score.
          </Text>
        </View>

        {trainingMaterials.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Training Materials</Text>
            <Text style={styles.emptyText}>
              Create your first training material to get started. You can add PDFs, video links,
              or upload videos with custom quizzes.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateMaterial}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Training Material</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.materialsContainer}>
            <Text style={styles.sectionTitle}>
              Training Materials ({trainingMaterials.length})
            </Text>
            {trainingMaterials.map(renderMaterialCard)}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {renderModal(isCreateModalVisible, () => setIsCreateModalVisible(false))}
      {renderModal(isEditModalVisible, () => setIsEditModalVisible(false))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  materialsContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  materialIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  materialInfo: {
    flex: 1,
  },
  materialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  materialType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  materialProgress: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  materialActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  materialUrl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
  },
  urlText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  quizInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quizText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeContainer: {
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeOptionSelected: {
    backgroundColor: '#EBF8FF',
    borderColor: '#6366F1',
  },
  typeOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  typeOptionTextSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  requiredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requiredToggleSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  requiredToggleText: {
    fontSize: 16,
    color: '#374151',
  },
  requiredToggleTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  quizSection: {
    marginTop: 8,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
  },
  addQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  addQuestionTextDisabled: {
    color: '#D1D5DB',
  },
  quizDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  questionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeQuestionButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  questionInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  correctAnswerButton: {
    padding: 4,
  },
  correctAnswerButtonSelected: {
    backgroundColor: '#F0FDF4',
    borderRadius: 4,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  correctAnswerHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalBottomSpacing: {
    height: 40,
  },
  bottomSpacing: {
    height: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fileUploadContainer: {
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeFileButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  uploadHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  acknowledgmentContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  acknowledgmentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  acknowledgmentItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  acknowledgmentTextContainer: {
    flex: 1,
  },
  acknowledgmentText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#111827',
  },
  acknowledgmentSubtext: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedCard: {
    borderColor: '#10B981',
    borderWidth: 1,
  },
  completedIcon: {
    backgroundColor: '#F0FDF4',
  },
  completedProgress: {
    color: '#10B981',
  },
});
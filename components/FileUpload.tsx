import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

type FileUploadProps = {
  onUpload: (fileUrl: string) => void;
  onRemove?: (fileUrl: string) => void;
  fileType: 'images' | 'documents' | 'all';
  multiple?: boolean;
  currentFiles?: string[];
  label: string;
  description?: string;
};

type UploadedFile = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export default function FileUpload({
  onUpload,
  onRemove,
  fileType,
  multiple = false,
  currentFiles = [],
  label,
  description
}: FileUploadProps) {
  const [uploading, setUploading] = useState<boolean>(false);

  const uploadFile = async (file: { uri: string; name?: string; type?: string }) => {
    try {
      setUploading(true);
      
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name || 'file');
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name || 'file',
          type: file.type || 'application/octet-stream'
        } as any);
      }
      
      formData.append('type', fileType);
      
      const uploadResponse = await fetch('/api/uploads/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result: UploadedFile = await uploadResponse.json();
      onUpload(result.fileUrl);
      
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: fileType === 'documents' ? ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] : '*/*',
        multiple: false,
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream'
        });
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadFile({
          uri: asset.uri,
          name: `image_${Date.now()}.jpg`,
          type: 'image/jpeg'
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpload = () => {
    if (fileType === 'images') {
      pickImage();
    } else if (fileType === 'documents') {
      pickDocument();
    } else {
      Alert.alert(
        'Choose File Type',
        'What type of file would you like to upload?',
        [
          { text: 'Image', onPress: pickImage },
          { text: 'Document', onPress: pickDocument },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleRemove = (fileUrl: string) => {
    Alert.alert(
      'Remove File',
      'Are you sure you want to remove this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove?.(fileUrl) }
      ]
    );
  };

  const getFileIcon = (fileUrl: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
    return isImage ? ImageIcon : FileText;
  };

  const getFileName = (fileUrl: string) => {
    return fileUrl.split('/').pop() || 'Unknown file';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      
      {currentFiles.length > 0 && (
        <View style={styles.filesContainer}>
          {currentFiles.map((fileUrl, index) => {
            const FileIcon = getFileIcon(fileUrl);
            return (
              <View key={index} style={styles.fileItem}>
                <FileIcon size={20} color="#666" />
                <Text style={styles.fileName} numberOfLines={1}>
                  {getFileName(fileUrl)}
                </Text>
                {onRemove && (
                  <TouchableOpacity
                    onPress={() => handleRemove(fileUrl)}
                    style={styles.removeButton}
                  >
                    <X size={16} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
      
      {(multiple || currentFiles.length === 0) && (
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          <Upload size={20} color={uploading ? "#999" : "#007AFF"} />
          <Text style={[styles.uploadText, uploading && styles.uploadTextDisabled]}>
            {uploading ? 'Uploading...' : `Upload ${fileType === 'images' ? 'Image' : fileType === 'documents' ? 'Document' : 'File'}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  filesContainer: {
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
  },
  uploadButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  uploadText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  uploadTextDisabled: {
    color: '#999',
  },
});
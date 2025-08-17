import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { 
  MessageCircle, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  Building2,
  Store,
  UserCheck,
  DollarSign,
  Mail,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download
} from 'lucide-react-native';
import FileUpload from '@/components/FileUpload';
import { useCommunication } from '@/hooks/communication-store';
import { useUser } from '@/hooks/user-store';
import { Stack } from 'expo-router';

export default function MessagesScreen() {
  const { currentUser, userRole } = useUser();
  const { 
    getMessagesForUser, 
    getProposalsForUser, 
    respondToMessage, 
    respondToProposal,
    sendCoordinationMessage,
    createBusinessProposal,
    getPendingEmailNotifications,
    getEmailNotificationHistory
  } = useCommunication();
  
  const [activeTab, setActiveTab] = useState<'messages' | 'proposals' | 'email-demo'>('messages');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState<string | null>(null);
  
  // Email demo form state
  const [demoForm, setDemoForm] = useState({
    hostName: '',
    hostEmail: '',
    eventTitle: '',
    proposedAmount: '',
    contractorsNeeded: '',
    message: ''
  });

  if (!currentUser || !userRole) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to view messages</Text>
      </View>
    );
  }
  
  // Prevent guests from accessing messages
  if (userRole === 'guest') {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Messages & Coordination',
            headerStyle: { backgroundColor: '#10B981' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }} 
        />
        <View style={styles.guestAccessDenied}>
          <MessageCircle size={64} color="#D1D5DB" />
          <Text style={styles.guestAccessTitle}>Sign Up Required</Text>
          <Text style={styles.guestAccessText}>
            Create an account to access messages, send proposals, and coordinate with other users.
          </Text>
          <TouchableOpacity 
            style={styles.guestSignUpButton}
            onPress={() => {
              Alert.alert(
                'Sign Up Required',
                'Create an account to access full messaging features.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Up', onPress: () => console.log('Navigate to signup') }
                ]
              );
            }}
          >
            <Text style={styles.guestSignUpButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const messages = getMessagesForUser(currentUser.id);
  const proposals = getProposalsForUser(currentUser.id, userRole as 'business_owner' | 'event_host');
  const pendingEmails = getPendingEmailNotifications();
  const emailHistory = getEmailNotificationHistory();

  const handleRespondToMessage = (messageId: string, status: 'accepted' | 'declined' | 'read') => {
    respondToMessage(messageId, status);
    if (status !== 'read') {
      Alert.alert('Success', `Message ${status} successfully`);
    }
  };

  const handleRespondToProposal = (proposalId: string, status: 'accepted' | 'declined') => {
    respondToProposal(proposalId, status);
    Alert.alert('Success', `Proposal ${status} successfully`);
  };

  const handleSendReply = (originalMessage: any) => {
    if (!replyText.trim() && attachments.length === 0) {
      Alert.alert('Error', 'Please enter a message or attach a file');
      return;
    }

    sendCoordinationMessage(
      currentUser.id,
      currentUser.name,
      userRole as any,
      originalMessage.fromUserId,
      originalMessage.fromUserName,
      originalMessage.fromUserRole,
      originalMessage.eventId || '',
      originalMessage.eventTitle || 'General',
      `Re: ${originalMessage.subject}`,
      replyText.trim(),
      attachments
    );

    setReplyText('');
    setReplyingTo(null);
    setAttachments([]);
    setShowAttachmentUpload(null);
    Alert.alert('Success', 'Reply sent successfully');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'business_owner':
        return <Building2 size={16} color="#10B981" />;
      case 'contractor':
        return <UserCheck size={16} color="#10B981" />;
      case 'event_host':
        return <Store size={16} color="#F59E0B" />;
      default:
        return <User size={16} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return '#10B981';
      case 'declined':
        return '#EF4444';
      case 'pending':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={16} color="#10B981" />;
      case 'declined':
        return <XCircle size={16} color="#EF4444" />;
      case 'pending':
        return <Clock size={16} color="#F59E0B" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Messages & Coordination',
          headerStyle: { backgroundColor: '#10B981' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
            onPress={() => setActiveTab('messages')}
          >
            <MessageCircle size={20} color={activeTab === 'messages' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
              Messages ({messages.length})
            </Text>
          </TouchableOpacity>
          
          {(userRole === 'business_owner' || userRole === 'event_host') && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'proposals' && styles.activeTab]}
              onPress={() => setActiveTab('proposals')}
            >
              <DollarSign size={20} color={activeTab === 'proposals' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'proposals' && styles.activeTabText]}>
                Proposals ({proposals.length})
              </Text>
            </TouchableOpacity>
          )}
          
          {userRole === 'business_owner' && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'email-demo' && styles.activeTab]}
              onPress={() => setActiveTab('email-demo')}
            >
              <Mail size={20} color={activeTab === 'email-demo' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'email-demo' && styles.activeTabText]}>
                Email Demo
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'messages' ? (
            <View style={styles.messagesContainer}>
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <MessageCircle size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
                  <Text style={styles.emptyStateText}>
                    Messages and coordination updates will appear here
                  </Text>
                </View>
              ) : (
                messages.map((message) => (
                  <View key={message.id} style={styles.messageCard}>
                    <View style={styles.messageHeader}>
                      <View style={styles.messageFrom}>
                        {getRoleIcon(message.fromUserRole)}
                        <Text style={styles.messageFromText}>
                          {message.fromUserId === currentUser.id ? 'You' : message.fromUserName}
                        </Text>
                        <Text style={styles.messageRole}>
                          ({message.fromUserRole.replace('_', ' ')})
                        </Text>
                      </View>
                      <View style={styles.messageStatus}>
                        {getStatusIcon(message.status)}
                        <Text style={[styles.statusText, { color: getStatusColor(message.status) }]}>
                          {message.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.messageSubject}>{message.subject}</Text>
                    <Text style={styles.messageContent}>{message.content}</Text>

                    {message.attachments && message.attachments.length > 0 && (
                      <View style={styles.attachmentsContainer}>
                        <Text style={styles.attachmentsLabel}>Attachments:</Text>
                        {message.attachments.map((attachment: string, index: number) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment);
                          const fileName = attachment.split('/').pop() || 'File';
                          
                          return (
                            <View key={index} style={styles.attachmentItem}>
                              {isImage ? (
                                <View style={styles.imageAttachment}>
                                  <Image 
                                    source={{ uri: attachment }} 
                                    style={styles.attachmentImage}
                                    resizeMode="cover"
                                  />
                                  <TouchableOpacity 
                                    style={styles.downloadButton}
                                    onPress={() => {
                                      if (Platform.OS === 'web') {
                                        window.open(attachment, '_blank');
                                      } else {
                                        Alert.alert('Download', 'Image download functionality would be implemented here');
                                      }
                                    }}
                                  >
                                    <Download size={16} color="#FFFFFF" />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity 
                                  style={styles.fileAttachment}
                                  onPress={() => {
                                    if (Platform.OS === 'web') {
                                      window.open(attachment, '_blank');
                                    } else {
                                      Alert.alert('Download', 'File download functionality would be implemented here');
                                    }
                                  }}
                                >
                                  <FileText size={20} color="#6B7280" />
                                  <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
                                  <Download size={16} color="#6B7280" />
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {message.eventTitle && (
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventLabel}>Event: {message.eventTitle}</Text>
                      </View>
                    )}

                    {message.metadata && (
                      <View style={styles.metadata}>
                        {message.metadata.proposalAmount && (
                          <Text style={styles.metadataText}>
                            Amount: ${message.metadata.proposalAmount}
                          </Text>
                        )}
                        {message.metadata.contractorCount && (
                          <Text style={styles.metadataText}>
                            Contractors: {message.metadata.contractorCount}
                          </Text>
                        )}
                        {message.metadata.paymentReceived !== undefined && (
                          <Text style={styles.metadataText}>
                            Payment: {message.metadata.paymentReceived ? 'Received' : 'Pending'}
                          </Text>
                        )}
                        {message.metadata.materialsReceived !== undefined && (
                          <Text style={styles.metadataText}>
                            Materials: {message.metadata.materialsReceived ? 'Received' : 'Pending'}
                          </Text>
                        )}
                      </View>
                    )}

                    <Text style={styles.messageDate}>
                      {new Date(message.createdAt).toLocaleDateString()} at{' '}
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </Text>

                    {message.toUserId === currentUser.id && message.status === 'pending' && (
                      <View style={styles.messageActions}>
                        {message.type === 'proposal' && (
                          <>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.acceptButton]}
                              onPress={() => handleRespondToMessage(message.id, 'accepted')}
                            >
                              <CheckCircle size={16} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.declineButton]}
                              onPress={() => handleRespondToMessage(message.id, 'declined')}
                            >
                              <XCircle size={16} color="#FFFFFF" />
                              <Text style={styles.actionButtonText}>Decline</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        <TouchableOpacity
                          style={[styles.actionButton, styles.readButton]}
                          onPress={() => handleRespondToMessage(message.id, 'read')}
                        >
                          <Text style={styles.actionButtonText}>Mark as Read</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {message.fromUserId !== currentUser.id && (
                      <TouchableOpacity
                        style={styles.replyButton}
                        onPress={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
                      >
                        <Send size={16} color="#10B981" />
                        <Text style={styles.replyButtonText}>Reply</Text>
                      </TouchableOpacity>
                    )}

                    {replyingTo === message.id && (
                      <View style={styles.replyContainer}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder="Type your reply..."
                          value={replyText}
                          onChangeText={setReplyText}
                          multiline
                          placeholderTextColor="#9CA3AF"
                        />
                        
                        {attachments.length > 0 && (
                          <View style={styles.replyAttachments}>
                            <Text style={styles.replyAttachmentsLabel}>Attachments:</Text>
                            {attachments.map((attachment, index) => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment);
                              const fileName = attachment.split('/').pop() || 'File';
                              
                              return (
                                <View key={index} style={styles.replyAttachmentItem}>
                                  {isImage ? <ImageIcon size={16} color="#10B981" /> : <FileText size={16} color="#10B981" />}
                                  <Text style={styles.replyAttachmentName} numberOfLines={1}>{fileName}</Text>
                                  <TouchableOpacity
                                    onPress={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                    style={styles.removeAttachmentButton}
                                  >
                                    <XCircle size={16} color="#EF4444" />
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        
                        {showAttachmentUpload === message.id && (
                          <View style={styles.attachmentUploadContainer}>
                            <FileUpload
                              onUpload={(fileUrl) => {
                                setAttachments(prev => [...prev, fileUrl]);
                                setShowAttachmentUpload(null);
                              }}
                              fileType="all"
                              multiple={false}
                              label="Attach File"
                              description="Upload images or documents"
                            />
                          </View>
                        )}
                        
                        <View style={styles.replyActions}>
                          <TouchableOpacity
                            style={styles.attachButton}
                            onPress={() => setShowAttachmentUpload(showAttachmentUpload === message.id ? null : message.id)}
                          >
                            <Paperclip size={16} color="#6B7280" />
                            <Text style={styles.attachButtonText}>Attach</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.sendReplyButton}
                            onPress={() => handleSendReply(message)}
                          >
                            <Send size={16} color="#FFFFFF" />
                            <Text style={styles.sendReplyButtonText}>Send Reply</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.cancelReplyButton}
                            onPress={() => {
                              setReplyingTo(null);
                              setReplyText('');
                              setAttachments([]);
                              setShowAttachmentUpload(null);
                            }}
                          >
                            <Text style={styles.cancelReplyButtonText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          ) : activeTab === 'proposals' ? (
            <View style={styles.proposalsContainer}>
              {proposals.length === 0 ? (
                <View style={styles.emptyState}>
                  <DollarSign size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateTitle}>No Proposals Yet</Text>
                  <Text style={styles.emptyStateText}>
                    Business proposals will appear here
                  </Text>
                </View>
              ) : (
                proposals.map((proposal) => (
                  <View key={proposal.id} style={styles.proposalCard}>
                    <View style={styles.proposalHeader}>
                      <Text style={styles.proposalTitle}>{proposal.eventTitle}</Text>
                      <View style={styles.proposalStatus}>
                        {getStatusIcon(proposal.status)}
                        <Text style={[styles.statusText, { color: getStatusColor(proposal.status) }]}>
                          {proposal.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.proposalBusiness}>
                      From: {proposal.businessName} ({proposal.businessOwnerName})
                    </Text>
                    
                    <View style={styles.proposalDetails}>
                      <Text style={styles.proposalAmount}>
                        Amount: ${proposal.proposedAmount}
                      </Text>
                      <Text style={styles.proposalContractors}>
                        Contractors: {proposal.contractorsNeeded}
                      </Text>
                    </View>

                    <Text style={styles.proposalMessage}>{proposal.message}</Text>

                    <Text style={styles.proposalDate}>
                      {new Date(proposal.createdAt).toLocaleDateString()}
                    </Text>

                    {userRole === 'event_host' && proposal.status === 'pending' && (
                      <View style={styles.proposalActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.acceptButton]}
                          onPress={() => handleRespondToProposal(proposal.id, 'accepted')}
                        >
                          <CheckCircle size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Accept Proposal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.declineButton]}
                          onPress={() => handleRespondToProposal(proposal.id, 'declined')}
                        >
                          <XCircle size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          ) : (
            renderEmailDemo()
          )}
        </ScrollView>
      </View>
    </>
  );

  function renderEmailDemo() {
    const handleSendDemoProposal = () => {
      if (!currentUser || userRole !== 'business_owner') {
        Alert.alert('Error', 'Only business owners can send proposals');
        return;
      }

      if (!demoForm.hostName || !demoForm.hostEmail || !demoForm.eventTitle || !demoForm.proposedAmount || !demoForm.contractorsNeeded || !demoForm.message) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const proposalData = {
        businessOwnerId: currentUser.id,
        businessOwnerName: currentUser.name,
        businessName: (currentUser as any).businessName || 'Demo Business',
        eventId: 'demo-event-' + Date.now(),
        eventTitle: demoForm.eventTitle,
        eventHostId: 'unregistered-host-' + Date.now(),
        eventHostName: demoForm.hostName,
        eventHostEmail: demoForm.hostEmail,
        proposedAmount: parseInt(demoForm.proposedAmount),
        contractorsNeeded: parseInt(demoForm.contractorsNeeded),
        message: demoForm.message,
      };

      createBusinessProposal(proposalData);
      
      Alert.alert(
        'Demo Proposal Sent!', 
        `A proposal has been sent to ${demoForm.hostEmail}. Check the console logs to see the email notification that would be sent.`,
        [{ text: 'OK', onPress: () => {
          setDemoForm({
            hostName: '',
            hostEmail: '',
            eventTitle: '',
            proposedAmount: '',
            contractorsNeeded: '',
            message: ''
          });
        }}]
      );
    };

    return (
      <View style={styles.emailDemoContainer}>
        <View style={styles.demoSection}>
          <View style={styles.demoHeader}>
            <Mail size={24} color="#10B981" />
            <Text style={styles.demoTitle}>Email Notification Demo</Text>
          </View>
          <Text style={styles.demoDescription}>
            This demo shows how the app handles notifications when event hosts don&apos;t have accounts yet. 
            When you send a proposal, an email will be queued (check console logs).
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Send Proposal to Unregistered Host</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Host Name</Text>
            <TextInput
              style={styles.input}
              value={demoForm.hostName}
              onChangeText={(text) => setDemoForm(prev => ({ ...prev, hostName: text }))}
              placeholder="Enter host name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Host Email</Text>
            <TextInput
              style={styles.input}
              value={demoForm.hostEmail}
              onChangeText={(text) => setDemoForm(prev => ({ ...prev, hostEmail: text }))}
              placeholder="host@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Title</Text>
            <TextInput
              style={styles.input}
              value={demoForm.eventTitle}
              onChangeText={(text) => setDemoForm(prev => ({ ...prev, eventTitle: text }))}
              placeholder="Enter event title"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Proposed Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={demoForm.proposedAmount}
              onChangeText={(text) => setDemoForm(prev => ({ ...prev, proposedAmount: text }))}
              placeholder="500"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contractors Needed</Text>
            <TextInput
              style={styles.input}
              value={demoForm.contractorsNeeded}
              onChangeText={(text) => setDemoForm(prev => ({ ...prev, contractorsNeeded: text }))}
              placeholder="3"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={demoForm.message}
              onChangeText={(text) => setDemoForm(prev => ({ ...prev, message: text }))}
              placeholder="Enter your proposal message..."
              multiline
              numberOfLines={4}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity style={styles.sendButton} onPress={handleSendDemoProposal}>
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Send Demo Proposal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emailStatusSection}>
          <Text style={styles.sectionTitle}>Email Notifications Status</Text>
          
          {pendingEmails.length > 0 && (
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Clock size={20} color="#F59E0B" />
                <Text style={styles.statusTitle}>Pending Emails ({pendingEmails.length})</Text>
              </View>
              {pendingEmails.slice(0, 3).map((email) => (
                <View key={email.id} style={styles.emailItem}>
                  <Text style={styles.emailTo}>To: {email.email}</Text>
                  <Text style={styles.emailSubject}>{email.subject}</Text>
                  <Text style={styles.emailType}>Type: {email.type}</Text>
                </View>
              ))}
            </View>
          )}

          {emailHistory.length > 0 && (
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.statusTitle}>Recent Email History</Text>
              </View>
              {emailHistory.slice(0, 5).map((email) => (
                <View key={email.id} style={styles.emailItem}>
                  <View style={styles.emailItemHeader}>
                    <Text style={styles.emailTo}>To: {email.email}</Text>
                    <View style={[styles.statusBadge, email.sent ? styles.sentBadge : styles.pendingBadge]}>
                      <Text style={[styles.statusBadgeText, email.sent ? styles.sentBadgeText : styles.pendingBadgeText]}>
                        {email.sent ? 'Sent' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.emailSubject}>{email.subject}</Text>
                  <Text style={styles.emailType}>Type: {email.type}</Text>
                </View>
              ))}
            </View>
          )}

          {pendingEmails.length === 0 && emailHistory.length === 0 && (
            <View style={styles.emptyState}>
              <AlertCircle size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No email notifications yet</Text>
              <Text style={styles.emptyStateText}>Send a demo proposal to see how email notifications work</Text>
            </View>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  messagesContainer: {
    gap: 16,
  },
  proposalsContainer: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageFrom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageFromText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  messageRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  messageContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  eventInfo: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  metadata: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 4,
  },
  metadataText: {
    fontSize: 14,
    color: '#6B7280',
  },
  messageDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  readButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  replyButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  replyContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  sendReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  sendReplyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelReplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  cancelReplyButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  proposalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  proposalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  proposalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proposalBusiness: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  proposalDetails: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  proposalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  proposalContractors: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  proposalMessage: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  proposalDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
  attachmentsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  attachmentsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  attachmentItem: {
    marginBottom: 8,
  },
  imageAttachment: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  downloadButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 8,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  replyAttachments: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  replyAttachmentsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  replyAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 6,
    marginBottom: 4,
    gap: 6,
  },
  replyAttachmentName: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  removeAttachmentButton: {
    padding: 2,
  },
  attachmentUploadContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  attachButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  emailDemoContainer: {
    gap: 16,
  },
  demoSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  demoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emailStatusSection: {
    gap: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  emailItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  emailItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  emailTo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  emailSubject: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  emailType: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sentBadge: {
    backgroundColor: '#D1FAE5',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sentBadgeText: {
    color: '#10B981',
  },
  pendingBadgeText: {
    color: '#F59E0B',
  },
  guestAccessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  guestAccessTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestAccessText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  guestSignUpButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  guestSignUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
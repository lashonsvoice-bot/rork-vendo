import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Message {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserRole: 'business_owner' | 'contractor' | 'event_host';
  toUserId: string;
  toUserName: string;
  toUserRole: 'business_owner' | 'contractor' | 'event_host';
  toUserEmail?: string; // For unregistered users
  eventId?: string;
  eventTitle?: string;
  type: 'proposal' | 'acceptance' | 'confirmation' | 'coordination' | 'payment_confirmation' | 'material_confirmation';
  subject: string;
  content: string;
  attachments?: string[]; // Array of file URLs
  status: 'pending' | 'accepted' | 'declined' | 'read';
  createdAt: string;
  respondedAt?: string;
  isRecipientRegistered: boolean; // Track if recipient has an account
  emailNotificationSent?: boolean; // Track if email was sent
  metadata?: {
    proposalAmount?: number;
    contractorCount?: number;
    paymentReceived?: boolean;
    materialsReceived?: boolean;
    materialsDescription?: string;
    discrepancyId?: string;
    totalDiscrepancies?: number;
    urgent?: boolean;
    discrepancyTypes?: string[];
  };
}

export interface BusinessProposal {
  id: string;
  businessOwnerId: string;
  businessOwnerName: string;
  businessName: string;
  eventId: string;
  eventTitle: string;
  eventHostId: string;
  eventHostName: string;
  eventHostEmail?: string; // For unregistered hosts
  proposedAmount: number;
  contractorsNeeded: number;
  trainingMaterials?: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
  isHostRegistered: boolean; // Track if host has an account
  emailNotificationSent?: boolean; // Track if email was sent
}

const MESSAGES_STORAGE_KEY = "messages_data";
const PROPOSALS_STORAGE_KEY = "proposals_data";
const PENDING_EMAIL_NOTIFICATIONS_KEY = "pending_email_notifications";

export interface PendingEmailNotification {
  id: string;
  email: string;
  subject: string;
  content: string;
  type: 'proposal' | 'message';
  relatedId: string; // proposal or message ID
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  sent: boolean;
}

export const [CommunicationProvider, useCommunication] = createContextHook(() => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposals, setProposals] = useState<BusinessProposal[]>([]);
  const [pendingEmailNotifications, setPendingEmailNotifications] = useState<PendingEmailNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const messagesData = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
      const proposalsData = await AsyncStorage.getItem(PROPOSALS_STORAGE_KEY);
      const emailNotificationsData = await AsyncStorage.getItem(PENDING_EMAIL_NOTIFICATIONS_KEY);

      if (messagesData) {
        setMessages(JSON.parse(messagesData));
      }

      if (proposalsData) {
        setProposals(JSON.parse(proposalsData));
      }

      if (emailNotificationsData) {
        setPendingEmailNotifications(JSON.parse(emailNotificationsData));
      }
    } catch (error) {
      console.error("Error loading communication data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessages = async (messagesToSave: Message[]) => {
    try {
      await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  };

  const saveProposals = async (proposalsToSave: BusinessProposal[]) => {
    try {
      await AsyncStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposalsToSave));
    } catch (error) {
      console.error("Error saving proposals:", error);
    }
  };

  const savePendingEmailNotifications = async (notifications: PendingEmailNotification[]) => {
    try {
      await AsyncStorage.setItem(PENDING_EMAIL_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error("Error saving pending email notifications:", error);
    }
  };

  const sendEmailNotification = useCallback(async (email: string, subject: string, content: string, type: 'proposal' | 'message', relatedId: string) => {
    const notification: PendingEmailNotification = {
      id: Date.now().toString(),
      email,
      subject,
      content,
      type,
      relatedId,
      createdAt: new Date().toISOString(),
      attempts: 1,
      lastAttempt: new Date().toISOString(),
      sent: false,
    };

    const updatedNotifications = [...pendingEmailNotifications, notification];
    setPendingEmailNotifications(updatedNotifications);
    savePendingEmailNotifications(updatedNotifications);

    // In a real app, this would integrate with an email service
    console.log(`📧 EMAIL NOTIFICATION QUEUED:`);
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${content}`);
    console.log(`Type: ${type}`);
    console.log(`Related ID: ${relatedId}`);
    
    // Simulate email sending success
    setTimeout(() => {
      setPendingEmailNotifications(prev => prev.map(n =>
        n.id === notification.id ? { ...n, sent: true } : n
      ));
    }, 2000);

    return notification;
  }, [pendingEmailNotifications]);

  const markEmailNotificationAsSent = useCallback((notificationId: string) => {
    const updatedNotifications = pendingEmailNotifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, sent: true }
        : notification
    );
    setPendingEmailNotifications(updatedNotifications);
    savePendingEmailNotifications(updatedNotifications);
  }, [pendingEmailNotifications]);

  const sendMessage = useCallback((messageData: Omit<Message, 'id' | 'createdAt' | 'status' | 'isRecipientRegistered' | 'emailNotificationSent'>) => {
    const newMessage: Message = {
      ...messageData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      isRecipientRegistered: !messageData.toUserEmail, // If email is provided, recipient is not registered
      emailNotificationSent: false,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);

    // Send email notification if recipient is not registered
    if (messageData.toUserEmail && !newMessage.isRecipientRegistered) {
      const emailContent = `
Hello ${messageData.toUserName},

You have received a new message regarding "${messageData.eventTitle || 'an event'}"

From: ${messageData.fromUserName}
Subject: ${messageData.subject}

Message:
${messageData.content}

To respond to this message and manage your events, please download our app and create an account.

Best regards,
The Event Management Team
      `;

      sendEmailNotification(
        messageData.toUserEmail,
        `New Message: ${messageData.subject}`,
        emailContent,
        'message',
        newMessage.id
      ).then(() => {
        // Update message to mark email as sent
        const updatedMessagesWithEmail = updatedMessages.map(msg =>
          msg.id === newMessage.id ? { ...msg, emailNotificationSent: true } : msg
        );
        setMessages(updatedMessagesWithEmail);
        saveMessages(updatedMessagesWithEmail);
      });
    }

    return newMessage;
  }, [messages, sendEmailNotification]);

  const respondToMessage = useCallback((messageId: string, status: 'accepted' | 'declined' | 'read') => {
    const updatedMessages = messages.map(message =>
      message.id === messageId
        ? { ...message, status, respondedAt: new Date().toISOString() }
        : message
    );
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  }, [messages]);

  const createBusinessProposal = useCallback((proposalData: Omit<BusinessProposal, 'id' | 'createdAt' | 'status' | 'isHostRegistered' | 'emailNotificationSent'>) => {
    const newProposal: BusinessProposal = {
      ...proposalData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      isHostRegistered: !proposalData.eventHostEmail, // If email is provided, host is not registered
      emailNotificationSent: false,
    };

    const updatedProposals = [...proposals, newProposal];
    setProposals(updatedProposals);
    saveProposals(updatedProposals);

    // Send email notification if host is not registered
    if (proposalData.eventHostEmail && !newProposal.isHostRegistered) {
      const emailContent = `
Hello ${proposalData.eventHostName},

You have received a new business proposal for your event "${proposalData.eventTitle}"!

Business: ${proposalData.businessName}
Proposed Amount: ${proposalData.proposedAmount}
Contractors Needed: ${proposalData.contractorsNeeded}

Message from ${proposalData.businessOwnerName}:
${proposalData.message}

To review this proposal and manage your events, please download our app and create an account. Once you have an account, you can:
- Review and respond to proposals
- Manage event details
- Coordinate with business owners
- Track event progress

Best regards,
The Event Management Team
      `;

      sendEmailNotification(
        proposalData.eventHostEmail,
        `New Business Proposal for ${proposalData.eventTitle}`,
        emailContent,
        'proposal',
        newProposal.id
      ).then(() => {
        // Update proposal to mark email as sent
        const updatedProposalsWithEmail = updatedProposals.map(prop =>
          prop.id === newProposal.id ? { ...prop, emailNotificationSent: true } : prop
        );
        setProposals(updatedProposalsWithEmail);
        saveProposals(updatedProposalsWithEmail);
      });
    }

    // Also create a message notification (for registered hosts or internal tracking)
    const message: Omit<Message, 'id' | 'createdAt' | 'status' | 'isRecipientRegistered' | 'emailNotificationSent'> = {
      fromUserId: proposalData.businessOwnerId,
      fromUserName: proposalData.businessOwnerName,
      fromUserRole: 'business_owner',
      toUserId: proposalData.eventHostId,
      toUserName: proposalData.eventHostName,
      toUserRole: 'event_host',
      toUserEmail: proposalData.eventHostEmail,
      eventId: proposalData.eventId,
      eventTitle: proposalData.eventTitle,
      type: 'proposal',
      subject: `Business Proposal for ${proposalData.eventTitle}`,
      content: `${proposalData.businessName} wants to participate in your event "${proposalData.eventTitle}" with ${proposalData.contractorsNeeded} contractors for ${proposalData.proposedAmount}.`,
      metadata: {
        proposalAmount: proposalData.proposedAmount,
        contractorCount: proposalData.contractorsNeeded,
      },
    };

    sendMessage(message);
    return newProposal;
  }, [proposals, sendMessage, sendEmailNotification]);

  const respondToProposal = useCallback((proposalId: string, status: 'accepted' | 'declined') => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    const updatedProposals = proposals.map(p =>
      p.id === proposalId
        ? { ...p, status, respondedAt: new Date().toISOString() }
        : p
    );
    setProposals(updatedProposals);
    saveProposals(updatedProposals);

    // Send response message
    const responseMessage: Omit<Message, 'id' | 'createdAt' | 'status' | 'isRecipientRegistered' | 'emailNotificationSent'> = {
      fromUserId: proposal.eventHostId,
      fromUserName: proposal.eventHostName,
      fromUserRole: 'event_host',
      toUserId: proposal.businessOwnerId,
      toUserName: proposal.businessOwnerName,
      toUserRole: 'business_owner',
      eventId: proposal.eventId,
      eventTitle: proposal.eventTitle,
      type: status === 'accepted' ? 'acceptance' : 'coordination',
      subject: `Proposal ${status === 'accepted' ? 'Accepted' : 'Declined'}: ${proposal.eventTitle}`,
      content: status === 'accepted' 
        ? `Great news! Your proposal for "${proposal.eventTitle}" has been accepted. Please coordinate with contractors and prepare materials.`
        : `Your proposal for "${proposal.eventTitle}" has been declined. Thank you for your interest.`,
    };

    sendMessage(responseMessage);
  }, [proposals, sendMessage]);

  const sendCoordinationMessage = useCallback((
    fromUserId: string,
    fromUserName: string,
    fromUserRole: 'business_owner' | 'contractor' | 'event_host',
    toUserId: string,
    toUserName: string,
    toUserRole: 'business_owner' | 'contractor' | 'event_host',
    eventId: string,
    eventTitle: string,
    subject: string,
    content: string,
    attachments?: string[],
    metadata?: Message['metadata']
  ) => {
    const message: Omit<Message, 'id' | 'createdAt' | 'status' | 'isRecipientRegistered' | 'emailNotificationSent'> = {
      fromUserId,
      fromUserName,
      fromUserRole,
      toUserId,
      toUserName,
      toUserRole,
      eventId,
      eventTitle,
      type: 'coordination',
      subject,
      content,
      attachments,
      metadata,
    };

    return sendMessage(message);
  }, [sendMessage]);

  const getMessagesForUser = useCallback((userId: string) => {
    return messages.filter(message => 
      message.toUserId === userId || message.fromUserId === userId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages]);

  const getProposalsForUser = useCallback((userId: string, role: 'business_owner' | 'event_host') => {
    if (role === 'business_owner') {
      return proposals.filter(proposal => proposal.businessOwnerId === userId);
    } else {
      return proposals.filter(proposal => proposal.eventHostId === userId);
    }
  }, [proposals]);

  const getUnreadMessagesCount = useCallback((userId: string) => {
    return messages.filter(message => 
      message.toUserId === userId && message.status === 'pending'
    ).length;
  }, [messages]);

  const getPendingEmailNotifications = useCallback(() => {
    return pendingEmailNotifications.filter(notification => !notification.sent);
  }, [pendingEmailNotifications]);

  const getEmailNotificationHistory = useCallback(() => {
    return pendingEmailNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pendingEmailNotifications]);

  return useMemo(() => ({
    messages,
    proposals,
    pendingEmailNotifications,
    isLoading,
    sendMessage,
    respondToMessage,
    createBusinessProposal,
    respondToProposal,
    sendCoordinationMessage,
    getMessagesForUser,
    getProposalsForUser,
    getUnreadMessagesCount,
    sendEmailNotification,
    markEmailNotificationAsSent,
    getPendingEmailNotifications,
    getEmailNotificationHistory,
  }), [
    messages,
    proposals,
    pendingEmailNotifications,
    isLoading,
    sendMessage,
    respondToMessage,
    createBusinessProposal,
    respondToProposal,
    sendCoordinationMessage,
    getMessagesForUser,
    getProposalsForUser,
    getUnreadMessagesCount,
    sendEmailNotification,
    markEmailNotificationAsSent,
    getPendingEmailNotifications,
    getEmailNotificationHistory,
  ]);
});
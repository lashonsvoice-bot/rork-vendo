import { z } from 'zod';

export const MessageSchema = z.object({
  id: z.string(),
  fromUserId: z.string(),
  fromUserName: z.string().optional(),
  fromUserRole: z.string().optional(),
  toUserId: z.string(),
  subject: z.string(),
  content: z.string(),
  type: z.enum(['general', 'proposal', 'coordination', 'hiring']),
  eventId: z.string().optional(),
  attachments: z.array(z.string()).default([]),
  status: z.enum(['sent', 'delivered', 'failed']).default('sent'),
  createdAt: z.string(),
  read: z.boolean().default(false),
  readAt: z.string().optional(),
  connectionType: z.enum(['proposal', 'reverse_proposal', 'hired']).optional(),
  eventEndTime: z.string().optional(),
  messagingAllowedUntil: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export interface UserConnection {
  id: string;
  userId1: string;
  userId2: string;
  eventId: string;
  connectionType: 'proposal' | 'reverse_proposal' | 'hired';
  connectedAt: string;
  eventEndTime?: string;
  messagingAllowedUntil?: string;
  isActive: boolean;
}

const store: { messages: Message[]; connections: UserConnection[] } = {
  messages: [],
  connections: [],
};

export const messageRepo = {
  add(msg: Message) {
    store.messages.push(msg);
    return msg;
  },
  getAllForUser(userId: string) {
    return store.messages.filter(m => m.fromUserId === userId || m.toUserId === userId);
  },
  markRead(messageId: string, userId: string) {
    const idx = store.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;
    const msg = store.messages[idx];
    if (msg.toUserId !== userId) return null;
    const updated: Message = { ...msg, read: true, readAt: new Date().toISOString() };
    store.messages[idx] = updated;
    return updated;
  },
  clearAll() {
    store.messages = [];
    store.connections = [];
  },
  
  // Connection management
  addConnection(connection: UserConnection) {
    store.connections.push(connection);
    return connection;
  },
  
  getConnection(userId1: string, userId2: string, eventId?: string): UserConnection | null {
    return store.connections.find(c => 
      ((c.userId1 === userId1 && c.userId2 === userId2) || 
       (c.userId1 === userId2 && c.userId2 === userId1)) &&
      (!eventId || c.eventId === eventId) &&
      c.isActive
    ) || null;
  },
  
  getUserConnections(userId: string): UserConnection[] {
    return store.connections.filter(c => 
      (c.userId1 === userId || c.userId2 === userId) && c.isActive
    );
  },
  
  canUsersMessage(fromUserId: string, toUserId: string, eventId?: string): { canMessage: boolean; reason?: string } {
    const connection = this.getConnection(fromUserId, toUserId, eventId);
    
    if (!connection) {
      return { canMessage: false, reason: 'Users are not connected through any event proposal or hiring' };
    }
    
    // Check if messaging period has expired
    if (connection.messagingAllowedUntil) {
      const now = new Date();
      const allowedUntil = new Date(connection.messagingAllowedUntil);
      
      if (now > allowedUntil) {
        return { canMessage: false, reason: 'Messaging period has expired (48 hours after event completion)' };
      }
    }
    
    return { canMessage: true };
  },
  
  updateConnectionForEventEnd(eventId: string, eventEndTime: string) {
    const eventConnections = store.connections.filter(c => c.eventId === eventId);
    
    eventConnections.forEach(connection => {
      // Set messaging allowed until 48 hours after event end for contractor connections
      const endTime = new Date(eventEndTime);
      const messagingCutoff = new Date(endTime.getTime() + (48 * 60 * 60 * 1000)); // 48 hours later
      
      connection.eventEndTime = eventEndTime;
      connection.messagingAllowedUntil = messagingCutoff.toISOString();
    });
  },
  
  deactivateExpiredConnections() {
    const now = new Date();
    
    store.connections.forEach(connection => {
      if (connection.messagingAllowedUntil) {
        const allowedUntil = new Date(connection.messagingAllowedUntil);
        if (now > allowedUntil) {
          connection.isActive = false;
        }
      }
    });
  },
};

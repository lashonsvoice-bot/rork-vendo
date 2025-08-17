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
});

export type Message = z.infer<typeof MessageSchema>;

const store: { messages: Message[] } = {
  messages: [],
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
  },
};

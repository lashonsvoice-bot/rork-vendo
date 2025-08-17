import { protectedProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";
import { messageRepo, MessageSchema, type Message } from "@/backend/db/message-repo";

export const sendMessageProcedure = protectedProcedure
  .input(z.object({
    recipientId: z.string(),
    subject: z.string(),
    content: z.string(),
    type: z.enum(['general', 'proposal', 'coordination', 'hiring']).default('general'),
    eventId: z.string().optional(),
    attachments: z.array(z.string()).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }

    console.log('[tRPC] Sending message:', input);

    // Check if users are connected and can message each other
    const messagingPermission = messageRepo.canUsersMessage(
      ctx.user.id, 
      input.recipientId, 
      input.eventId
    );

    if (!messagingPermission.canMessage) {
      throw new Error(`Cannot send message: ${messagingPermission.reason}`);
    }

    // Get connection info for additional message metadata
    const connection = messageRepo.getConnection(
      ctx.user.id, 
      input.recipientId, 
      input.eventId
    );

    const message: Message = MessageSchema.parse({
      id: Date.now().toString(),
      fromUserId: ctx.user.id,
      fromUserName: ctx.user.name,
      fromUserRole: ctx.user.role,
      toUserId: input.recipientId,
      subject: input.subject,
      content: input.content,
      type: input.type,
      eventId: input.eventId,
      attachments: input.attachments ?? [],
      status: 'sent',
      createdAt: new Date().toISOString(),
      read: false,
      connectionType: connection?.connectionType,
      eventEndTime: connection?.eventEndTime,
      messagingAllowedUntil: connection?.messagingAllowedUntil,
    });

    return messageRepo.add(message);
  });

// Helper procedure to create connections when proposals are made or accepted
export const createConnectionProcedure = protectedProcedure
  .input(z.object({
    userId1: z.string(),
    userId2: z.string(),
    eventId: z.string(),
    connectionType: z.enum(['proposal', 'reverse_proposal', 'hired']),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }

    console.log('[tRPC] Creating user connection:', input);

    // Check if connection already exists
    const existingConnection = messageRepo.getConnection(
      input.userId1, 
      input.userId2, 
      input.eventId
    );

    if (existingConnection) {
      console.log('[tRPC] Connection already exists:', existingConnection.id);
      return existingConnection;
    }

    const connection = {
      id: Date.now().toString(),
      userId1: input.userId1,
      userId2: input.userId2,
      eventId: input.eventId,
      connectionType: input.connectionType,
      connectedAt: new Date().toISOString(),
      isActive: true,
    };

    return messageRepo.addConnection(connection);
  });

// Helper procedure to update connections when events end
export const updateConnectionsForEventEndProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    eventEndTime: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }

    console.log('[tRPC] Updating connections for event end:', input);

    messageRepo.updateConnectionForEventEnd(input.eventId, input.eventEndTime);
    
    return { success: true };
  });

export default sendMessageProcedure;
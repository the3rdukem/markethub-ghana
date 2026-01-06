/**
 * Messaging Store
 *
 * Production-ready persistent messaging system for:
 * - Buyer ↔ Vendor conversations
 * - Product inquiries (pre-purchase)
 * - Order-related messages (post-purchase)
 * - Admin oversight and moderation
 *
 * All messages persist independently and are user-scoped.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MessageType = 'text' | 'image' | 'file' | 'system';
export type ConversationContext = 'product_inquiry' | 'order_support' | 'general' | 'dispute';
export type ConversationStatus = 'active' | 'archived' | 'flagged' | 'closed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'vendor' | 'admin';
  senderAvatar?: string;
  content: string;
  type: MessageType;
  attachmentUrl?: string;
  attachmentName?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Conversation {
  id: string;
  // Participants
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  vendorId: string;
  vendorName: string;
  vendorAvatar?: string;
  vendorBusinessName?: string;
  // Context
  context: ConversationContext;
  productId?: string;
  productName?: string;
  productImage?: string;
  orderId?: string;
  orderNumber?: string;
  disputeId?: string;
  // Status
  status: ConversationStatus;
  isPinned: boolean;
  isMutedByBuyer: boolean;
  isMutedByVendor: boolean;
  // Metadata
  lastMessageId?: string;
  lastMessageContent?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  unreadCountBuyer: number;
  unreadCountVendor: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  archivedBy?: string;
  // Admin moderation
  flaggedAt?: string;
  flaggedBy?: string;
  flagReason?: string;
  moderatorNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface MessagingAuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByRole: 'buyer' | 'vendor' | 'admin';
  conversationId?: string;
  messageId?: string;
  details: string;
  timestamp: string;
}

interface MessagingState {
  conversations: Conversation[];
  messages: Message[];
  auditLogs: MessagingAuditLog[];

  // Conversation Management
  createConversation: (data: {
    buyerId: string;
    buyerName: string;
    buyerAvatar?: string;
    vendorId: string;
    vendorName: string;
    vendorAvatar?: string;
    vendorBusinessName?: string;
    context: ConversationContext;
    productId?: string;
    productName?: string;
    productImage?: string;
    orderId?: string;
    orderNumber?: string;
  }) => Conversation;

  getConversationById: (id: string) => Conversation | undefined;
  getConversationByParticipants: (buyerId: string, vendorId: string, context?: ConversationContext, productId?: string, orderId?: string) => Conversation | undefined;
  getConversationsForUser: (userId: string, role: 'buyer' | 'vendor') => Conversation[];
  getAllConversations: () => Conversation[]; // Admin only

  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  archiveConversation: (id: string, userId: string) => void;
  pinConversation: (id: string, isPinned: boolean) => void;
  muteConversation: (id: string, role: 'buyer' | 'vendor', isMuted: boolean) => void;

  // Message Management
  sendMessage: (data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: 'buyer' | 'vendor' | 'admin';
    senderAvatar?: string;
    content: string;
    type?: MessageType;
    attachmentUrl?: string;
    attachmentName?: string;
  }) => Message;

  getMessagesForConversation: (conversationId: string) => Message[];
  markMessageAsRead: (messageId: string, readerId: string) => void;
  markConversationAsRead: (conversationId: string, userId: string, role: 'buyer' | 'vendor') => void;
  deleteMessage: (messageId: string, deletedBy: string) => void;

  // Admin Moderation
  flagConversation: (id: string, adminId: string, reason: string) => void;
  unflagConversation: (id: string, adminId: string, notes: string) => void;
  getFlaggedConversations: () => Conversation[];
  addModeratorNote: (conversationId: string, adminId: string, note: string) => void;

  // Counts
  getUnreadCount: (userId: string, role: 'buyer' | 'vendor') => number;

  // Audit
  addAuditLog: (log: Omit<MessagingAuditLog, 'id' | 'timestamp'>) => void;
  getAuditLogs: (conversationId?: string) => MessagingAuditLog[];
}

export const useMessagingStore = create<MessagingState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: [],
      auditLogs: [],

      // Conversation Management
      createConversation: (data) => {
        // Check if conversation already exists
        const existing = get().getConversationByParticipants(
          data.buyerId,
          data.vendorId,
          data.context,
          data.productId,
          data.orderId
        );
        if (existing) return existing;

        const now = new Date().toISOString();
        const newConversation: Conversation = {
          id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...data,
          status: 'active',
          isPinned: false,
          isMutedByBuyer: false,
          isMutedByVendor: false,
          unreadCountBuyer: 0,
          unreadCountVendor: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          conversations: [...state.conversations, newConversation],
        }));

        get().addAuditLog({
          action: 'CONVERSATION_CREATED',
          performedBy: data.buyerId,
          performedByRole: 'buyer',
          conversationId: newConversation.id,
          details: `Conversation created between ${data.buyerName} and ${data.vendorName}`,
        });

        return newConversation;
      },

      getConversationById: (id) => {
        return get().conversations.find((c) => c.id === id);
      },

      getConversationByParticipants: (buyerId, vendorId, context, productId, orderId) => {
        return get().conversations.find((c) =>
          c.buyerId === buyerId &&
          c.vendorId === vendorId &&
          (!context || c.context === context) &&
          (!productId || c.productId === productId) &&
          (!orderId || c.orderId === orderId)
        );
      },

      getConversationsForUser: (userId, role) => {
        const conversations = get().conversations.filter((c) => {
          if (role === 'buyer') return c.buyerId === userId && c.status !== 'closed';
          if (role === 'vendor') return c.vendorId === userId && c.status !== 'closed';
          return false;
        });

        // Sort by pinned first, then by last message time
        return conversations.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = a.lastMessageAt || a.createdAt;
          const bTime = b.lastMessageAt || b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      },

      getAllConversations: () => {
        return get().conversations.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      },

      updateConversation: (id, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      archiveConversation: (id, userId) => {
        const conv = get().getConversationById(id);
        if (!conv) return;

        get().updateConversation(id, {
          status: 'archived',
          archivedAt: new Date().toISOString(),
          archivedBy: userId,
        });

        get().addAuditLog({
          action: 'CONVERSATION_ARCHIVED',
          performedBy: userId,
          performedByRole: conv.buyerId === userId ? 'buyer' : 'vendor',
          conversationId: id,
          details: 'Conversation archived',
        });
      },

      pinConversation: (id, isPinned) => {
        get().updateConversation(id, { isPinned });
      },

      muteConversation: (id, role, isMuted) => {
        if (role === 'buyer') {
          get().updateConversation(id, { isMutedByBuyer: isMuted });
        } else {
          get().updateConversation(id, { isMutedByVendor: isMuted });
        }
      },

      // Message Management
      sendMessage: (data) => {
        const now = new Date().toISOString();
        const newMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderRole: data.senderRole,
          senderAvatar: data.senderAvatar,
          content: data.content,
          type: data.type || 'text',
          attachmentUrl: data.attachmentUrl,
          attachmentName: data.attachmentName,
          isRead: false,
          createdAt: now,
          updatedAt: now,
          isDeleted: false,
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
        }));

        // Update conversation with last message info
        const conversation = get().getConversationById(data.conversationId);
        if (conversation) {
          const updates: Partial<Conversation> = {
            lastMessageId: newMessage.id,
            lastMessageContent: data.content.substring(0, 100),
            lastMessageAt: now,
            lastMessageSenderId: data.senderId,
          };

          // Increment unread count for the other party
          if (data.senderRole === 'buyer') {
            updates.unreadCountVendor = conversation.unreadCountVendor + 1;
          } else if (data.senderRole === 'vendor') {
            updates.unreadCountBuyer = conversation.unreadCountBuyer + 1;
          }

          get().updateConversation(data.conversationId, updates);
        }

        return newMessage;
      },

      getMessagesForConversation: (conversationId) => {
        return get().messages
          .filter((m) => m.conversationId === conversationId && !m.isDeleted)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      },

      markMessageAsRead: (messageId, readerId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId && m.senderId !== readerId
              ? { ...m, isRead: true, readAt: new Date().toISOString() }
              : m
          ),
        }));
      },

      markConversationAsRead: (conversationId, userId, role) => {
        // Mark all messages in conversation as read
        set((state) => ({
          messages: state.messages.map((m) =>
            m.conversationId === conversationId && m.senderId !== userId && !m.isRead
              ? { ...m, isRead: true, readAt: new Date().toISOString() }
              : m
          ),
        }));

        // Reset unread count
        if (role === 'buyer') {
          get().updateConversation(conversationId, { unreadCountBuyer: 0 });
        } else {
          get().updateConversation(conversationId, { unreadCountVendor: 0 });
        }
      },

      deleteMessage: (messageId, deletedBy) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, deletedAt: new Date().toISOString(), deletedBy }
              : m
          ),
        }));

        const message = get().messages.find((m) => m.id === messageId);
        if (message) {
          get().addAuditLog({
            action: 'MESSAGE_DELETED',
            performedBy: deletedBy,
            performedByRole: 'admin',
            conversationId: message.conversationId,
            messageId,
            details: 'Message deleted by admin',
          });
        }
      },

      // Admin Moderation
      flagConversation: (id, adminId, reason) => {
        get().updateConversation(id, {
          status: 'flagged',
          flaggedAt: new Date().toISOString(),
          flaggedBy: adminId,
          flagReason: reason,
        });

        get().addAuditLog({
          action: 'CONVERSATION_FLAGGED',
          performedBy: adminId,
          performedByRole: 'admin',
          conversationId: id,
          details: `Flagged: ${reason}`,
        });
      },

      unflagConversation: (id, adminId, notes) => {
        get().updateConversation(id, {
          status: 'active',
          reviewedAt: new Date().toISOString(),
          reviewedBy: adminId,
          moderatorNotes: notes,
          flaggedAt: undefined,
          flaggedBy: undefined,
          flagReason: undefined,
        });

        get().addAuditLog({
          action: 'CONVERSATION_UNFLAGGED',
          performedBy: adminId,
          performedByRole: 'admin',
          conversationId: id,
          details: `Unflagged with notes: ${notes}`,
        });
      },

      getFlaggedConversations: () => {
        return get().conversations.filter((c) => c.status === 'flagged');
      },

      addModeratorNote: (conversationId, adminId, note) => {
        const conv = get().getConversationById(conversationId);
        if (!conv) return;

        const existingNotes = conv.moderatorNotes || '';
        const newNote = `[${new Date().toISOString()}] ${note}`;

        get().updateConversation(conversationId, {
          moderatorNotes: existingNotes ? `${existingNotes}\n${newNote}` : newNote,
          reviewedAt: new Date().toISOString(),
          reviewedBy: adminId,
        });

        get().addAuditLog({
          action: 'MODERATOR_NOTE_ADDED',
          performedBy: adminId,
          performedByRole: 'admin',
          conversationId,
          details: note,
        });
      },

      // Counts
      getUnreadCount: (userId, role) => {
        const conversations = get().getConversationsForUser(userId, role);
        return conversations.reduce((total, conv) => {
          if (role === 'buyer') return total + conv.unreadCountBuyer;
          return total + conv.unreadCountVendor;
        }, 0);
      },

      // Audit
      addAuditLog: (logData) => {
        const newLog: MessagingAuditLog = {
          ...logData,
          id: `msglog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          auditLogs: [newLog, ...state.auditLogs].slice(0, 1000),
        }));
      },

      getAuditLogs: (conversationId) => {
        const logs = get().auditLogs;
        if (conversationId) {
          return logs.filter((l) => l.conversationId === conversationId);
        }
        return logs;
      },
    }),
    {
      name: 'marketplace-messaging',
    }
  )
);

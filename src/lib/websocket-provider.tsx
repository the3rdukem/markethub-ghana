"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: "text" | "image" | "file" | "voice" | "system";
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  fileData?: {
    name: string;
    size: number;
    type: string;
    url: string;
    thumbnail?: string;
  };
  replyTo?: string;
  edited?: boolean;
  editedAt?: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  status: "online" | "away" | "offline";
  lastSeen: string;
}

export interface Notification {
  id: string;
  type: "message" | "typing" | "file_upload" | "call" | "system";
  title: string;
  message: string;
  timestamp: string;
  conversationId?: string;
  senderId?: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

interface WebSocketContextType {
  // Connection status
  isConnected: boolean;
  connectionStatus: "connecting" | "connected" | "reconnecting" | "disconnected";

  // Messages
  messages: Record<string, ChatMessage[]>;
  sendMessage: (conversationId: string, content: string, type?: ChatMessage['type'], fileData?: ChatMessage['fileData']) => Promise<void>;
  markAsRead: (conversationId: string, messageIds: string[]) => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;

  // Typing indicators
  typingUsers: Record<string, TypingIndicator[]>;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;

  // User presence
  userPresence: Record<string, UserPresence>;
  updatePresence: (status: UserPresence['status']) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markNotificationAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;

  // File sharing
  uploadFile: (file: File, conversationId: string) => Promise<string>;

  // Voice messages
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  isRecording: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
  userId: string;
  userType: "buyer" | "vendor" | "admin";
}

export function WebSocketProvider({ children, userId, userType }: WebSocketProviderProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "reconnecting" | "disconnected">("disconnected");

  // Data state
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingIndicator[]>>({});
  const [userPresence, setUserPresence] = useState<Record<string, UserPresence>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Refs for cleanup
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const wsRef = useRef<WebSocket | null>(null);

  // Simulate WebSocket connection (in real implementation, this would be actual WebSocket)
  const connectWebSocket = useCallback(() => {
    setConnectionStatus("connecting");

    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true);
      setConnectionStatus("connected");

      // Update user presence
      setUserPresence(prev => ({
        ...prev,
        [userId]: {
          userId,
          status: "online",
          lastSeen: new Date().toISOString()
        }
      }));

      toast.success("Connected to real-time chat");
    }, 1000);
  }, [userId]);

  // Initialize connection
  useEffect(() => {
    connectWebSocket();

    // Capture ref values for cleanup
    const reconnectTimeout = reconnectTimeoutRef.current;
    const typingTimeouts = typingTimeoutRef.current;

    return () => {
      // Cleanup on unmount
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      Object.values(typingTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [connectWebSocket]);

  // Send message function
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    type: ChatMessage['type'] = "text",
    fileData?: ChatMessage['fileData']
  ) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const newMessage: ChatMessage = {
      id: messageId,
      conversationId,
      senderId: userId,
      senderName: userType === "vendor" ? "Store Owner" : "Customer",
      content,
      timestamp: now,
      type,
      status: "sending",
      fileData
    };

    // Add message optimistically
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage]
    }));

    // Simulate network delay and update status
    setTimeout(() => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId].map(msg =>
          msg.id === messageId ? { ...msg, status: "sent" } : msg
        )
      }));
    }, 500);

    setTimeout(() => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId].map(msg =>
          msg.id === messageId ? { ...msg, status: "delivered" } : msg
        )
      }));
    }, 1000);

    // Add notification for other user
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      type: "message",
      title: "New Message",
      message: type === "text" ? content : `Sent a ${type}`,
      timestamp: now,
      conversationId,
      senderId: userId,
      read: false
    };

    setNotifications(prev => [notification, ...prev]);
  }, [userId, userType]);

  // Typing indicators - stopTyping defined first to avoid circular dependency
  const stopTyping = useCallback((conversationId: string) => {
    setTypingUsers(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).filter(t => t.userId !== userId)
    }));

    if (typingTimeoutRef.current[conversationId]) {
      clearTimeout(typingTimeoutRef.current[conversationId]);
      delete typingTimeoutRef.current[conversationId];
    }
  }, [userId]);

  const startTyping = useCallback((conversationId: string) => {
    const typingIndicator: TypingIndicator = {
      userId,
      userName: userType === "vendor" ? "Store Owner" : "Customer",
      conversationId,
      timestamp: Date.now()
    };

    setTypingUsers(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []).filter(t => t.userId !== userId), typingIndicator]
    }));

    // Clear existing timeout
    if (typingTimeoutRef.current[conversationId]) {
      clearTimeout(typingTimeoutRef.current[conversationId]);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current[conversationId] = setTimeout(() => {
      stopTyping(conversationId);
    }, 3000);
  }, [userId, userType, stopTyping]);

  // Mark messages as read
  const markAsRead = useCallback((conversationId: string, messageIds: string[]) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: prev[conversationId]?.map(msg =>
        messageIds.includes(msg.id) ? { ...msg, status: "read" } : msg
      ) || []
    }));
  }, []);

  // Edit message
  const editMessage = useCallback((messageId: string, newContent: string) => {
    const now = new Date().toISOString();
    setMessages(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(conversationId => {
        updated[conversationId] = updated[conversationId].map(msg =>
          msg.id === messageId
            ? { ...msg, content: newContent, edited: true, editedAt: now }
            : msg
        );
      });
      return updated;
    });
  }, []);

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(conversationId => {
        updated[conversationId] = updated[conversationId].filter(msg => msg.id !== messageId);
      });
      return updated;
    });
  }, []);

  // Update user presence
  const updatePresence = useCallback((status: UserPresence['status']) => {
    setUserPresence(prev => ({
      ...prev,
      [userId]: {
        userId,
        status,
        lastSeen: new Date().toISOString()
      }
    }));
  }, [userId]);

  // File upload simulation
  const uploadFile = useCallback(async (file: File, conversationId: string): Promise<string> => {
    // Simulate file upload with progress
    return new Promise((resolve) => {
      setTimeout(() => {
        const fileUrl = URL.createObjectURL(file);
        resolve(fileUrl);

        // Send file message
        sendMessage(conversationId, `Shared ${file.name}`, file.type.startsWith('image/') ? 'image' : 'file', {
          name: file.name,
          size: file.size,
          type: file.type,
          url: fileUrl
        });
      }, 2000);
    });
  }, [sendMessage]);

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      toast.success("Recording started");
    } catch (error) {
      toast.error("Could not access microphone");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          resolve(audioBlob);
          setIsRecording(false);
          toast.success("Recording stopped");
        };

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    });
  }, [isRecording]);

  // Notification management
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    messages,
    sendMessage,
    markAsRead,
    editMessage,
    deleteMessage,
    typingUsers,
    startTyping,
    stopTyping,
    userPresence,
    updatePresence,
    notifications,
    unreadCount,
    markNotificationAsRead,
    clearAllNotifications,
    uploadFile,
    startRecording,
    stopRecording,
    isRecording
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

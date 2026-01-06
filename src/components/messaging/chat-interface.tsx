"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Phone,
  Video,
  MoreVertical,
  Search,
  Filter,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Package,
  Star,
  User,
  MessageSquare,
  Archive,
  Trash2,
  Flag
} from "lucide-react";

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  type: "text" | "image" | "file" | "order_update" | "system";
  status: "sent" | "delivered" | "read";
  attachments?: {
    name: string;
    type: string;
    url: string;
    size: string;
  }[];
  orderInfo?: {
    orderId: string;
    productName: string;
    status: string;
  };
}

interface ChatThread {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantType: "buyer" | "vendor";
  orderId?: string;
  productName?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: "active" | "archived";
  isOnline: boolean;
  responseTime?: string;
  rating?: number;
}

const mockThreads: ChatThread[] = [
  {
    id: "1",
    participantId: "buyer_123",
    participantName: "John Kwame Asante",
    participantAvatar: "/placeholder-avatar.jpg",
    participantType: "buyer",
    orderId: "ORD-2025-001234",
    productName: "iPhone 15 Pro Max 256GB",
    lastMessage: "When will my order be shipped?",
    lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    unreadCount: 2,
    status: "active",
    isOnline: true,
    responseTime: "< 1 hour",
    rating: 4.8
  },
  {
    id: "2",
    participantId: "buyer_456",
    participantName: "Ama Osei",
    participantAvatar: "/placeholder-avatar.jpg",
    participantType: "buyer",
    orderId: "ORD-2025-001235",
    productName: "Samsung Galaxy S24 Ultra",
    lastMessage: "Thank you for the quick delivery!",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    unreadCount: 0,
    status: "active",
    isOnline: false,
    responseTime: "< 30 mins",
    rating: 5.0
  },
  {
    id: "3",
    participantId: "buyer_789",
    participantName: "Kofi Mensah",
    participantAvatar: "/placeholder-avatar.jpg",
    participantType: "buyer",
    lastMessage: "Do you have this product in black color?",
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    unreadCount: 1,
    status: "active",
    isOnline: false,
    responseTime: "< 2 hours"
  }
];

const mockMessages: { [key: string]: Message[] } = {
  "1": [
    {
      id: 1,
      senderId: "buyer_123",
      senderName: "John Kwame Asante",
      content: "Hi, I just placed an order for the iPhone. When will it be shipped?",
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      type: "text",
      status: "read"
    },
    {
      id: 2,
      senderId: "vendor_current",
      senderName: "You",
      content: "Hello John! Thank you for your order. Your iPhone will be shipped within 24 hours. You'll receive a tracking number via SMS.",
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      type: "text",
      status: "read"
    },
    {
      id: 3,
      senderId: "system",
      senderName: "System",
      content: "Order status updated",
      timestamp: new Date(Date.now() - 6 * 60 * 1000),
      type: "order_update",
      status: "delivered",
      orderInfo: {
        orderId: "ORD-2025-001234",
        productName: "iPhone 15 Pro Max 256GB",
        status: "Processing"
      }
    },
    {
      id: 4,
      senderId: "buyer_123",
      senderName: "John Kwame Asante",
      content: "Great! Can you also confirm the delivery address?",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      type: "text",
      status: "delivered"
    }
  ]
};

interface ChatInterfaceProps {
  userType: "buyer" | "vendor";
  currentUserId: string;
}

export function ChatInterface({ userType, currentUserId }: ChatInterfaceProps) {
  const [threads, setThreads] = useState<ChatThread[]>(mockThreads);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(threads[0]);
  const [messages, setMessages] = useState<Message[]>(mockMessages["1"] || []);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredThreads = threads.filter(thread =>
    thread.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (thread.productName && thread.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (thread.orderId && thread.orderId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeThread) return;

    const message: Message = {
      id: messages.length + 1,
      senderId: currentUserId,
      senderName: "You",
      content: newMessage,
      timestamp: new Date(),
      type: "text",
      status: "sent"
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // Update thread last message
    setThreads(threads.map(thread =>
      thread.id === activeThread.id
        ? { ...thread, lastMessage: newMessage, lastMessageTime: new Date() }
        : thread
    ));

    // Simulate message delivery status update
    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === message.id ? { ...msg, status: "delivered" } : msg
      ));
    }, 1000);

    // Simulate read status update
    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === message.id ? { ...msg, status: "read" } : msg
      ));
    }, 3000);
  };

  const handleThreadSelect = (thread: ChatThread) => {
    setActiveThread(thread);
    setMessages(mockMessages[thread.id] || []);

    // Mark thread as read
    setThreads(threads.map(t =>
      t.id === thread.id ? { ...t, unreadCount: 0 } : t
    ));
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="w-3 h-3 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div className="h-[800px] flex border rounded-lg overflow-hidden">
      {/* Sidebar - Chat Threads */}
      <div className="w-80 border-r bg-gray-50">
        <div className="p-4 border-b bg-white">
          <h2 className="font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(800px-120px)]">
          <div className="p-2">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleThreadSelect(thread)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  activeThread?.id === thread.id ? "bg-blue-100 border border-blue-200" : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={thread.participantAvatar} />
                      <AvatarFallback>
                        {thread.participantName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {thread.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm truncate">{thread.participantName}</p>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(thread.lastMessageTime)}
                        </span>
                        {thread.unreadCount > 0 && (
                          <Badge variant="default" className="text-xs rounded-full w-5 h-5 flex items-center justify-center p-0">
                            {thread.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {thread.orderId && (
                      <div className="flex items-center gap-1 mb-1">
                        <Package className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-muted-foreground">{thread.orderId}</span>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground truncate">{thread.lastMessage}</p>

                    {thread.responseTime && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-muted-foreground">Response: {thread.responseTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeThread ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={activeThread.participantAvatar} />
                      <AvatarFallback>
                        {activeThread.participantName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {activeThread.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold">{activeThread.participantName}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{activeThread.isOnline ? "Online" : "Offline"}</span>
                      {activeThread.rating && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span>{activeThread.rating}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {activeThread.orderId && (
                    <div className="ml-4">
                      <Badge variant="outline" className="text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        {activeThread.orderId}
                      </Badge>
                      {activeThread.productName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {activeThread.productName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <User className="w-4 h-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="w-4 h-4 mr-2" />
                        Archive Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="w-4 h-4 mr-2" />
                        Report User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.senderId === currentUserId;

                  if (message.type === "order_update") {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-sm">
                          <div className="flex items-center gap-2 text-blue-700 text-sm">
                            <Package className="w-4 h-4" />
                            <span className="font-medium">Order Update</span>
                          </div>
                          {message.orderInfo && (
                            <div className="mt-2 text-sm">
                              <p><strong>{message.orderInfo.orderId}</strong></p>
                              <p>{message.orderInfo.productName}</p>
                              <Badge variant="secondary" className="mt-1">
                                {message.orderInfo.status}
                              </Badge>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : "order-1"}`}>
                        <div
                          className={`rounded-lg p-3 ${
                            isOwnMessage
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-2 ${
                            isOwnMessage ? "text-blue-100" : "text-gray-500"
                          }`}>
                            <span className="text-xs">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOwnMessage && getMessageStatusIcon(message.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-end gap-3">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="resize-none"
                  />
                </div>

                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

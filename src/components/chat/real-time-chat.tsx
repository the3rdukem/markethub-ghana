"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
} from "@/components/ui/dialog";
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Image as ImageIcon,
  File,
  Download,
  Play,
  Pause,
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  X,
  Smile,
  Camera,
  Video,
  Phone
} from "lucide-react";
import { useWebSocket, ChatMessage } from "@/lib/websocket-provider";
import { formatDistance } from "date-fns";

interface RealTimeChatProps {
  conversationId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  isOnline?: boolean;
  className?: string;
}

interface FileUploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
}

export function RealTimeChat({
  conversationId,
  recipientId,
  recipientName,
  recipientAvatar,
  isOnline = false,
  className = ""
}: RealTimeChatProps) {
  const {
    messages,
    sendMessage,
    markAsRead,
    editMessage,
    deleteMessage,
    typingUsers,
    startTyping,
    stopTyping,
    uploadFile,
    startRecording,
    stopRecording,
    isRecording,
    userPresence
  } = useWebSocket();

  // Local state
  const [newMessage, setNewMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState<FileUploadProgress[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get conversation messages with stable reference
  const conversationMessages = useMemo(() => messages[conversationId] || [], [messages, conversationId]);
  const recipientTyping = useMemo(() => typingUsers[conversationId]?.filter(t => t.userId !== recipientId) || [], [typingUsers, conversationId, recipientId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages, scrollToBottom]);

  // Handle typing
  const handleTyping = useCallback(() => {
    startTyping(conversationId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
    }, 1000);
  }, [conversationId, startTyping, stopTyping]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    await sendMessage(conversationId, newMessage);
    setNewMessage("");
    stopTyping(conversationId);
  }, [conversationId, newMessage, sendMessage, stopTyping]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // File upload handling
  const handleFileUpload = useCallback(async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadProgressItem: FileUploadProgress = {
        file,
        progress: 0,
        status: "uploading"
      };

      setFileUploadProgress(prev => [...prev, uploadProgressItem]);

      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setFileUploadProgress(prev =>
            prev.map(item =>
              item.file === file
                ? { ...item, progress }
                : item
            )
          );
        }

        await uploadFile(file, conversationId);

        setFileUploadProgress(prev =>
          prev.map(item =>
            item.file === file
              ? { ...item, status: "completed" }
              : item
          )
        );

        // Remove from progress after 2 seconds
        setTimeout(() => {
          setFileUploadProgress(prev => prev.filter(item => item.file !== file));
        }, 2000);

      } catch (error) {
        setFileUploadProgress(prev =>
          prev.map(item =>
            item.file === file
              ? { ...item, status: "error" }
              : item
          )
        );
      }
    }
  }, [uploadFile, conversationId]);

  // Drag and drop handling
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Voice recording
  const handleVoiceMessage = useCallback(async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      const audioUrl = URL.createObjectURL(audioBlob);

      await sendMessage(conversationId, "Voice message", "voice", {
        name: `voice_${Date.now()}.wav`,
        size: audioBlob.size,
        type: "audio/wav",
        url: audioUrl
      });
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, sendMessage, conversationId]);

  // Message status icon
  const getMessageStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case "sending":
        return <Clock className="w-3 h-3 text-gray-400" />;
      case "sent":
        return <Check className="w-3 h-3 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case "failed":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
  };

  // Play voice message
  const playVoiceMessage = useCallback((messageId: string, audioUrl: string) => {
    if (playingVoice === messageId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingVoice(messageId);

        audioRef.current.onended = () => {
          setPlayingVoice(null);
        };
      }
    }
  }, [playingVoice]);

  // Edit message handling
  const startEditMessage = useCallback((message: ChatMessage) => {
    setEditingMessage(message.id);
    setEditContent(message.content);
  }, []);

  const saveEditMessage = useCallback(() => {
    if (editingMessage && editContent.trim()) {
      editMessage(editingMessage, editContent.trim());
      setEditingMessage(null);
      setEditContent("");
    }
  }, [editingMessage, editContent, editMessage]);

  const cancelEditMessage = useCallback(() => {
    setEditingMessage(null);
    setEditContent("");
  }, []);

  return (
    <div
      className={`flex flex-col h-full ${className}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={recipientAvatar} />
              <AvatarFallback>{recipientName.charAt(0)}</AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold">{recipientName}</h3>
            <div className="text-xs text-muted-foreground">
              {isOnline ? "Online" : "Last seen recently"}
            </div>
          </div>
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
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* File Upload Progress */}
      {fileUploadProgress.length > 0 && (
        <div className="p-4 bg-gray-50 border-b">
          {fileUploadProgress.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="truncate">{item.file.name}</span>
                <span>{item.status === "completed" ? "✓" : `${item.progress}%`}</span>
              </div>
              <Progress
                value={item.progress}
                className={`h-1 ${
                  item.status === "error" ? "bg-red-100" :
                  item.status === "completed" ? "bg-green-100" : ""
                }`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversationMessages.map((message, index) => {
            const isOwn = message.senderId === recipientId; // This would be current user ID in real app
            const showAvatar = index === 0 || conversationMessages[index - 1].senderId !== message.senderId;

            return (
              <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className="flex items-end gap-2 max-w-[70%]">
                  {!isOwn && showAvatar && (
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={recipientAvatar} />
                      <AvatarFallback className="text-xs">{recipientName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}

                  <div className="space-y-1">
                    <div
                      className={`relative group px-4 py-2 rounded-2xl ${
                        isOwn
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {/* Message content based on type */}
                      {message.type === "text" && (
                        <>
                          {editingMessage === message.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="text-sm"
                                onKeyPress={(e) => e.key === "Enter" && saveEditMessage()}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEditMessage}>Save</Button>
                                <Button size="sm" variant="outline" onClick={cancelEditMessage}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </>
                      )}

                      {message.type === "image" && message.fileData && (
                        <div className="space-y-2">
                          <img
                            src={message.fileData.url}
                            alt={message.fileData.name}
                            className="max-w-sm rounded-lg"
                          />
                          <p className="text-sm">{message.content}</p>
                        </div>
                      )}

                      {message.type === "file" && message.fileData && (
                        <div className="flex items-center gap-3 p-2 bg-white/10 rounded-lg">
                          <File className="w-8 h-8" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{message.fileData.name}</p>
                            <p className="text-xs opacity-70">
                              {(message.fileData.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {message.type === "voice" && message.fileData && (
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playVoiceMessage(message.id, message.fileData!.url)}
                          >
                            {playingVoice === message.id ?
                              <Pause className="w-4 h-4" /> :
                              <Play className="w-4 h-4" />
                            }
                          </Button>
                          <div className="flex-1">
                            <div className="h-1 bg-white/20 rounded-full">
                              <div className="h-full bg-white/60 rounded-full w-1/3"></div>
                            </div>
                          </div>
                          <span className="text-xs opacity-70">0:23</span>
                        </div>
                      )}

                      {/* Message actions */}
                      {isOwn && message.type === "text" && (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => startEditMessage(message)}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => deleteMessage(message.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>

                    {/* Message status and timestamp */}
                    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isOwn ? "justify-end" : "justify-start"}`}>
                      <span>{formatTimestamp(message.timestamp)}</span>
                      {isOwn && getMessageStatusIcon(message.status)}
                      {message.edited && <span className="italic">(edited)</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {recipientTyping.length > 0 && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={recipientAvatar} />
                <AvatarFallback className="text-xs">{recipientName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 flex items-center justify-center z-10">
          <div className="text-center">
            <File className="w-12 h-12 text-blue-600 mx-auto mb-2" />
            <p className="text-blue-800 font-medium">Drop files here to share</p>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end gap-2">
          {/* File upload */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Paperclip className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <File className="w-4 h-4 mr-2" />
                File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*";
                  fileInputRef.current.click();
                }
              }}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*";
                  fileInputRef.current.capture = "environment";
                  fileInputRef.current.click();
                }
              }}>
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />

          {/* Message input */}
          <div className="flex-1">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              className="min-h-[40px] resize-none"
            />
          </div>

          {/* Voice message */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVoiceMessage}
            className={isRecording ? "text-red-600" : ""}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          {/* Emoji picker */}
          <Button variant="ghost" size="sm" onClick={() => setIsEmojiPickerOpen(true)}>
            <Smile className="w-4 h-4" />
          </Button>

          {/* Send button */}
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 mt-2 text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm">Recording...</span>
          </div>
        )}
      </div>

      {/* Hidden audio element for voice playback */}
      <audio ref={audioRef} />
    </div>
  );
}

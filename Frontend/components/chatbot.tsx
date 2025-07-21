"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Trash2,
  Minimize2,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { askChatbot } from "@/services/chat-api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reaction?: "like" | "dislike" | null;
  isTyping?: boolean;
}

interface ChatSettings {
  soundEnabled: boolean;
  autoScroll: boolean;
  showTimestamps: boolean;
}

export default function EnhancedChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<ChatSettings>({
    soundEnabled: true,
    autoScroll: true,
    showTimestamps: true,
  });
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced auto-scroll with user control
  const scrollToBottom = useCallback(() => {
    if (settings.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [settings.autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus management
  useEffect(() => {
    if (isOpen && !isMinimized && !showSettings) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, showSettings]);

  // Enhanced visibility control
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setIsVisible(currentScrollY < lastScrollY || currentScrollY < 100);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Unread count management
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Typing simulation
  const simulateTyping = useCallback(() => {
    setIsTyping(true);
    const typingDuration = Math.random() * 2000 + 1000; // 1-3 seconds
    setTimeout(() => setIsTyping(false), typingDuration);
  }, []);

  // Sound effects
  const playSound = useCallback(
    (type: "send" | "receive") => {
      if (!settings.soundEnabled) return;

      // Create audio context for sound effects
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === "send") {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          600,
          audioContext.currentTime + 0.1
        );
      } else {
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          600,
          audioContext.currentTime + 0.1
        );
      }

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    },
    [settings.soundEnabled]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    playSound("send");
    simulateTyping();

    try {
      const response = await askChatbot(userMessage.content);

      if (response.success && response.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        playSound("receive");

        if (!isOpen) {
          setUnreadCount((prev) => prev + 1);
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            response.message ||
            "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I'm having trouble connecting. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const handleMessageReaction = (
    messageId: string,
    reaction: "like" | "dislike"
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, reaction: msg.reaction === reaction ? null : reaction }
          : msg
      )
    );
  };

  const handleClearChat = () => {
    setMessages([]);
    setUnreadCount(0);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const exportChat = () => {
    const chatData = {
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Floating chat button with enhanced animations
  if (!isOpen) {
    return (
      <TooltipProvider>
        <div
          className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ease-out ${
            isVisible
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-16 opacity-0 scale-95"
          }`}
        >
          <div className="relative group">
            {/* Enhanced animated background rings */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 animate-pulse opacity-20 scale-110"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 animate-ping opacity-10 scale-125"></div>
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 opacity-5 scale-150 animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>

            {/* Main button with enhanced styling */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsOpen(true)}
                  className="relative h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-110 group border-0 overflow-hidden"
                  size="icon"
                >
                  <div className="absolute inset-0 bg-white/10 rounded-full transform scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                  <div className="relative z-10">
                    <MessageCircle className="h-7 w-7 transition-transform group-hover:scale-110 group-hover:rotate-12" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-red-500 hover:bg-red-500 border-2 border-white animate-bounce">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="bg-gray-900 text-white border-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  Chat with AI Assistant
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-4 text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Enhanced minimized state
  if (isMinimized) {
    return (
      <TooltipProvider>
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/50 p-4 animate-in slide-in-from-bottom-2 duration-300 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                  <Bot className="h-5 w-5 text-white" />
                  {isTyping && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse border border-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    {isTyping ? (
                      <>
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span>Typing...</span>
                      </>
                    ) : (
                      `${messages.length} messages`
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMinimized(false)}
                      className="h-8 w-8 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Settings panel
  if (showSettings) {
    return (
      <div
        className={`fixed ${isMaximized ? "inset-4" : "bottom-6 right-6"} z-50`}
      >
        <div
          className={`${
            isMaximized ? "w-full h-full" : "w-96 h-[600px]"
          } bg-white rounded-3xl shadow-2xl border border-gray-200/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500 backdrop-blur-sm`}
        >
          {/* Settings Header */}
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-white" />
              <h3 className="font-semibold text-white">Chat Settings</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(false)}
              className="h-8 w-8 hover:bg-white/20 text-white rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-6 space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Audio</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sound effects</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      soundEnabled: !prev.soundEnabled,
                    }))
                  }
                  className={
                    settings.soundEnabled ? "bg-green-50 border-green-200" : ""
                  }
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Behavior</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Auto-scroll to new messages
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      autoScroll: !prev.autoScroll,
                    }))
                  }
                  className={
                    settings.autoScroll ? "bg-green-50 border-green-200" : ""
                  }
                >
                  {settings.autoScroll ? "On" : "Off"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Show timestamps</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      showTimestamps: !prev.showTimestamps,
                    }))
                  }
                  className={
                    settings.showTimestamps
                      ? "bg-green-50 border-green-200"
                      : ""
                  }
                >
                  {settings.showTimestamps ? "On" : "Off"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Data</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={exportChat}
                  disabled={messages.length === 0}
                  className="w-full justify-start bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export chat history
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearChat}
                  disabled={messages.length === 0}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear all messages
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced full chat interface
  return (
    <TooltipProvider>
      <div
        className={`fixed ${isMaximized ? "inset-4" : "bottom-6 right-6"} z-50`}
      >
        <div
          className={`${
            isMaximized ? "w-full h-full" : "w-96 h-[600px]"
          } bg-white rounded-3xl shadow-2xl border border-gray-200/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500 backdrop-blur-sm`}
        >
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-4 flex items-center justify-between relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16 animate-pulse"></div>
              <div
                className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12 animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                <Bot className="h-5 w-5 text-white" />
                {isTyping && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse border border-white"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Assistant</h3>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="text-xs text-white/90">
                    {isLoading
                      ? "Thinking..."
                      : isTyping
                      ? "Typing..."
                      : "Online"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-1 relative z-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(true)}
                    className="h-8 w-8 hover:bg-white/20 text-white rounded-full transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="h-8 w-8 hover:bg-white/20 text-white rounded-full transition-colors"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMinimized(true)}
                    className="h-8 w-8 hover:bg-white/20 text-white rounded-full transition-colors"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 hover:bg-white/20 text-white rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </div>
          </div>

          {/* Enhanced Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/50 to-white scroll-smooth"
          >
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-4 shadow-lg animate-pulse">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Welcome! 👋
                </h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-sm mx-auto">
                  I'm your AI assistant, ready to help you with any questions or
                  tasks. What would you like to know?
                </p>
                <div className="space-y-2">
                  {[
                    "💡 How can you help me today?",
                    "🚀 Tell me about your capabilities",
                    "📝 Help me brainstorm ideas",
                    "🔍 Answer a specific question",
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        handleSuggestedPrompt(prompt.substring(2).trim())
                      }
                      className="block w-full text-left p-3 text-sm text-gray-700 hover:bg-white rounded-xl transition-all duration-200 border border-gray-200 hover:border-blue-300 hover:shadow-sm group transform hover:scale-[1.02]"
                    >
                      <span className="group-hover:text-blue-600 transition-colors">
                        {prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-in slide-in-from-bottom-2 duration-300`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] ${
                    message.role === "user" ? "order-1" : ""
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-blue-500/20"
                        : "bg-white text-gray-900 border border-gray-200 hover:shadow-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    {settings.showTimestamps && (
                      <p
                        className={`text-xs mt-2 opacity-70 ${
                          message.role === "user"
                            ? "text-white/70"
                            : "text-gray-500"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {message.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              handleCopyMessage(message.content, message.id)
                            }
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-500" />
                            )}
                          </button>
                        </TooltipTrigger>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              handleMessageReaction(message.id, "like")
                            }
                            className={`p-1 rounded-full transition-colors ${
                              message.reaction === "like"
                                ? "bg-green-100 text-green-600"
                                : "hover:bg-gray-100 text-gray-500"
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              handleMessageReaction(message.id, "dislike")
                            }
                            className={`p-1 rounded-full transition-colors ${
                              message.reaction === "dislike"
                                ? "bg-red-100 text-red-600"
                                : "hover:bg-gray-100 text-gray-500"
                            }`}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                      </Tooltip>
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {(isLoading || isTyping) && (
              <div className="flex gap-3 justify-start animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0 shadow-sm">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {isLoading ? "AI is thinking..." : "AI is typing..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Input */}
          <div className="border-t bg-white p-4">
            {messages.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleClearChat}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors p-1 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear
                      </button>
                    </TooltipTrigger>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={exportChat}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors p-1 rounded"
                      >
                        <Download className="h-3 w-3" />
                        Export
                      </button>
                    </TooltipTrigger>
                  </Tooltip>
                </div>

                <span className="text-xs text-gray-400">
                  {messages.length} message{messages.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-full px-4 pr-12 transition-all duration-200 bg-gray-50 focus:bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-8 w-8 rounded-full shadow-sm transition-all duration-200 disabled:opacity-50 hover:scale-105"
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Press Enter to send • Shift+Enter for new line
              </p>
              {settings.soundEnabled && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Volume2 className="h-3 w-3" />
                  <span>Sound on</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

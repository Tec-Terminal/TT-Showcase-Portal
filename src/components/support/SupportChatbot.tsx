'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Minimize2, Plus } from 'lucide-react';
import { useSupportChat } from '@/hooks/useSupportChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TicketComment } from '@/lib/services/ticket.service';

interface SupportChatbotProps {
  studentId?: string;
  userName?: string;
}

export const SupportChatbot = ({ studentId, userName }: SupportChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    ticket,
    comments,
    currentTicketId,
    isLoadingTicket,
    isCreatingTicket,
    isSendingMessage,
    sendInitialMessage,
    sendMessage,
    clearChat,
    refetchComments,
  } = useSupportChat({ studentId });

  // Refetch comments when chat is opened
  useEffect(() => {
    if (isOpen && currentTicketId) {
      refetchComments();
    }
  }, [isOpen, currentTicketId, refetchComments]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, isOpen]);

  // Combine ticket description and comments into messages
  const allMessages: Array<{ type: 'ticket' | 'comment'; data: any }> = [];
  
  if (ticket) {
    // Add ticket description as first message
    allMessages.push({
      type: 'ticket',
      data: {
        id: ticket.id,
        comment: ticket.description,
        createdBy: ticket.createdBy,
        createdByName: ticket.createdByName || 'You',
        createdAt: ticket.createdAt,
      },
    });
  }

  // Add all comments, sorted by creation date
  const sortedComments = [...comments].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  
  sortedComments.forEach((comment) => {
    allMessages.push({ type: 'comment', data: comment });
  });

  const handleSendMessage = (message: string) => {
    if (!currentTicketId) {
      // Create new ticket with initial message
      sendInitialMessage(message);
    } else {
      // Add comment to existing ticket
      sendMessage(message);
    }
  };

  const isOwnMessage = (message: TicketComment | any) => {
    // Determine if message is from current user by comparing names
    const senderName = message.createdByName || message.createdBy || '';
    
    // If we have the user's name, compare it directly
    if (userName && senderName) {
      // Normalize names for comparison (case-insensitive, trimmed)
      const normalizedSender = senderName.trim().toLowerCase();
      const normalizedUser = userName.trim().toLowerCase();
      return normalizedSender === normalizedUser;
    }
    
    // Fallback: if sender name doesn't contain support-related keywords, assume it's the student
    // This is less reliable but works as a fallback
    const supportKeywords = ['support', 'team', 'admin', 'staff', 'agent', 'helpdesk'];
    const isSupportKeyword = supportKeywords.some(keyword => 
      senderName.toLowerCase().includes(keyword)
    );
    
    // If it contains support keywords, it's not the student's message
    // Otherwise, if we don't have userName to compare, assume it's the student's message
    return !isSupportKeyword;
  };

  return (
    <>
      {/* Chatbot Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50"
          aria-label="Open support chat"
        >
          <MessageSquare className="w-6 h-6" />
          {currentTicketId && comments.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {comments.length + 1}
            </span>
          )}
        </button>
      )}

      {/* Chatbot Window (when open) */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col ${
            isMinimized ? 'h-16' : 'h-[600px]'
          } transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-semibold">Support Chat</h3>
              {ticket && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  #{ticket.id.slice(-6)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentTicketId && (
                <button
                  onClick={() => {
                    if (confirm('Start a new chat? This will clear the current conversation.')) {
                      clearChat();
                    }
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  aria-label="Start new chat"
                  title="Start new chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                {isLoadingTicket && !ticket ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">Loading...</div>
                  </div>
                ) : allMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <MessageSquare className="w-12 h-12 text-gray-400 mb-3" />
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Start a Conversation
                    </h4>
                    <p className="text-sm text-gray-500">
                      Send us a message and we'll get back to you as soon as possible.
                    </p>
                  </div>
                ) : (
                  <>
                    {allMessages.map((item, index) => (
                      <ChatMessage
                        key={item.data.id || index}
                        comment={item.data}
                        isOwnMessage={isOwnMessage(item.data)}
                        currentUserName={userName}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <ChatInput
                onSend={handleSendMessage}
                disabled={isCreatingTicket || isSendingMessage}
                placeholder={
                  currentTicketId
                    ? "Type your message..."
                    : "Type your message to create a support ticket..."
                }
              />
            </>
          )}
        </div>
      )}
    </>
  );
};


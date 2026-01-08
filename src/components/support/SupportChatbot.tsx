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
  userEmail?: string;
}

export const SupportChatbot = ({ studentId, userName, userEmail }: SupportChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
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
  } = useSupportChat({ studentId, userEmail });

  // Fetch current user ID and name from token
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/user-info', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const decodedToken = data?.decodedToken;
          // Extract user ID from decoded token
          const userId = decodedToken?.sub || decodedToken?.userId || decodedToken?.id || decodedToken?.user?.id || null;
          if (userId) {
            setCurrentUserId(userId);
          }
          // Extract user name from decoded token or user data
          const name = decodedToken?.name || decodedToken?.fullName || decodedToken?.user?.name || decodedToken?.user?.fullName || data?.user?.name || data?.user?.fullName || null;
          if (name) {
            setCurrentUserName(name);
          }
        }
      } catch (error) {
        console.debug('Could not fetch user info:', error);
      }
    };
    fetchUserInfo();
  }, []);

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
    // Always use userName if available, even if ticket.createdByName exists
    // This ensures the correct name is used for the avatar initials
    const ticketName = ticket.createdByName || ticket.createdBy || '';
    const normalizedTicketName = ticketName.trim().toLowerCase();
    const isYouOrYo = normalizedTicketName === 'you' || normalizedTicketName === 'yo';
    
    const ticketDisplayName = (userName && userName.trim().toLowerCase() !== 'you' && userName.trim().toLowerCase() !== 'yo')
      ? userName 
      : (ticketName && !isYouOrYo
          ? ticketName 
          : userName || 'You');
    
    allMessages.push({
      type: 'ticket',
      data: {
        id: ticket.id,
        comment: ticket.description,
        createdBy: ticket.createdBy,
        createdByName: ticketDisplayName,
        createdAt: ticket.createdAt,
      },
    });
  }

  // Add all comments, sorted by creation date
  const sortedComments = [...comments].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  
  sortedComments.forEach((comment) => {
    // Override createdByName if it's "You", "Yo", or any variation, and we have userName
    const commentName = comment.createdByName || comment.createdBy || '';
    const normalizedCommentName = commentName.trim().toLowerCase();
    const shouldReplaceName = (normalizedCommentName === 'you' || normalizedCommentName === 'yo') 
      && userName 
      && userName.trim().toLowerCase() !== 'you'
      && userName.trim().toLowerCase() !== 'yo';
    
    const commentData = {
      ...comment,
      createdByName: shouldReplaceName ? userName : comment.createdByName
    };
    allMessages.push({ type: 'comment', data: commentData });
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

  // Helper function to extract name from formats like "MI Mercy Isaiah" or "CI Confidence Isaiah"
  // Removes initials prefix (2-3 letter codes followed by space)
  const extractNameFromFormattedString = (name: string): string => {
    if (!name) return '';
    // Match pattern like "MI ", "CI ", "ABC " (2-3 uppercase letters followed by space)
    const match = name.match(/^[A-Z]{2,3}\s+(.+)$/);
    return match ? match[1].trim() : name.trim();
  };

  // Helper function to normalize names for comparison
  const normalizeName = (name: string): string => {
    if (!name) return '';
    // Remove initials prefix if present, then normalize
    const extracted = extractNameFromFormattedString(name);
    return extracted.toLowerCase().trim();
  };

  // Helper function to check if two names match (handles various formats)
  const namesMatch = (name1: string, name2: string): boolean => {
    if (!name1 || !name2) return false;
    
    const normalized1 = normalizeName(name1);
    const normalized2 = normalizeName(name2);
    
    // Exact match after normalization
    if (normalized1 === normalized2) return true;
    
    // Check if one name contains the other (for partial matches)
    // e.g., "Mercy Isaiah" matches "MI Mercy Isaiah"
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      // Only consider it a match if the shorter name is at least 3 characters
      // This prevents false matches like "MI" matching "MI Mercy Isaiah"
      const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
      if (shorter.length >= 3) {
        return true;
      }
    }
    
    return false;
  };

  const isOwnMessage = (message: TicketComment | any) => {
    // Ticket description is always from the student (it's the initial message)
    // Student messages should appear on the right
    if (message.type === 'ticket') {
      return true;
    }
    
    // Get message creator name
    const messageCreatedByName = String(message.createdByName || message.createdBy || '').trim();
    const messageCreatedBy = String(message.createdBy || '').trim();
    
    // Check 1: Compare with current user's name (userName prop - highest priority)
    // This is the most reliable way to identify student messages
    const effectiveUserName = userName || currentUserName;
    if (effectiveUserName) {
      const normalizedUserName = String(effectiveUserName).trim();
      // Skip if userName is "you" or "yo" as these are placeholders
      if (normalizedUserName.toLowerCase() !== 'you' && normalizedUserName.toLowerCase() !== 'yo') {
        // Check if message creator name matches user name (handles formats like "MI Mercy Isaiah")
        if (namesMatch(messageCreatedByName, normalizedUserName) || namesMatch(messageCreatedBy, normalizedUserName)) {
          return true; // Student message - show on right
        }
      }
    }
    
    // Check 2: Compare with ticket creator (if ticket exists)
    // All messages from the ticket creator should be treated as student messages
    if (ticket) {
      const ticketCreatedByName = String(ticket.createdByName || ticket.createdBy || '').trim();
      const ticketCreatedBy = String(ticket.createdBy || '').trim();
      
      // Check if message creator name matches ticket creator name (handles various formats)
      if (namesMatch(messageCreatedByName, ticketCreatedByName) || namesMatch(messageCreatedBy, ticketCreatedBy)) {
        return true; // Student message - show on right
      }
    }
    
    // Check 3: Handle special cases like "You", "Yo", etc. - these are typically student messages
    const normalizedMessageName = (messageCreatedByName || messageCreatedBy).toLowerCase();
    if (normalizedMessageName === 'you' || normalizedMessageName === 'yo') {
      // If we have a userName that's not "you" or "yo", and the message says "you", it's likely the student
      if (effectiveUserName && effectiveUserName.trim().toLowerCase() !== 'you' && effectiveUserName.trim().toLowerCase() !== 'yo') {
        return true; // Student message - show on right
      }
    }
    
    // If none of the above match, it's an ERP/support message
    // ERP messages appear on the left (isOwnMessage = false)
    return false;
  };

  return (
    <>
      {/* Chatbot Button when closed */}
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

      {/* Chatbot Window when open */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col ${
            isMinimized ? 'h-16' : 'h-150'
          } transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
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
                    {allMessages.map((item, index) => {
                      const message = item.data;
                      // Pass the type along so isOwnMessage can identify ticket descriptions
                      const messageWithType = { ...message, type: item.type };
                      const isStudentMessage = isOwnMessage(messageWithType);
                      const senderName = isStudentMessage 
                        ? undefined 
                        : (message.createdByName || message.createdBy || 'Support Team');
                      
                      return (
                        <ChatMessage
                          key={message.id || index}
                          comment={message}
                          isOwnMessage={isStudentMessage}
                          senderName={senderName}
                        />
                      );
                    })}
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
                    : "Type your message..."
                }
              />
            </>
          )}
        </div>
      )}
    </>
  );
};

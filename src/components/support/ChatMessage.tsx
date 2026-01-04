'use client';

import { TicketComment } from '@/lib/services/ticket.service';
import { formatDateTime } from '@/lib/utils/errorHandler';
import { LifeBuoy } from 'lucide-react';

interface ChatMessageProps {
  comment: TicketComment;
  isOwnMessage?: boolean;
  currentUserName?: string;
}

// Function to get initials from a name
const getInitials = (name: string): string => {
  if (!name) return 'U';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // First letter of first name + first letter of last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1) {
    // If only one name, use first two letters
    return parts[0].substring(0, 2).toUpperCase();
  }
  return 'U';
};

export const ChatMessage = ({ comment, isOwnMessage = false, currentUserName }: ChatMessageProps) => {
  // Handle both 'comment' and 'content' fields for backward compatibility
  const messageText = comment.comment || (comment as any).content || '';
  const senderName = comment.createdByName || comment.createdBy || 'Support Team';
  
  // Determine if this is a support message
  // If it's not the student's message (isOwnMessage = false), it's a support message
  const isSupportMessage = !isOwnMessage;
  
  // Get initials for student messages only
  const displayName = isOwnMessage ? (currentUserName || senderName) : senderName;
  const initials = isOwnMessage ? getInitials(displayName) : null;
  
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isOwnMessage 
            ? 'bg-blue-600 text-white' 
            : isSupportMessage
            ? 'bg-purple-600 text-white'
            : 'bg-gray-200 text-gray-700'
        }`}>
          {isSupportMessage ? (
            <LifeBuoy className="w-4 h-4" />
          ) : (
            <span className="text-xs font-semibold">{initials}</span>
          )}
        </div>
        
        {/* Message Content */}
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-2 rounded-lg ${
            isOwnMessage
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-gray-100 text-gray-900 rounded-tl-none'
          }`}>
            {!isOwnMessage && (
              <div className="text-xs font-semibold mb-1 opacity-80">
                {senderName}
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap break-words">
              {messageText}
            </p>
          </div>
          <span className="text-xs text-gray-500 mt-1 px-1">
            {formatDateTime(comment.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};


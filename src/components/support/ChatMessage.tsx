"use client";

import { TicketComment } from '@/lib/services/ticket.service';
import { formatDateTime } from '@/lib/utils/errorHandler';
import { Headphones } from 'lucide-react';

interface ChatMessageProps {
  comment: TicketComment;
  isOwnMessage?: boolean;
  senderName?: string;
}

export const ChatMessage = ({ 
  comment, 
  isOwnMessage = false, 
  senderName 
}: ChatMessageProps) => {
  const displayName = senderName || comment.createdByName || comment.createdBy || 'Support Team';
  
  // Handle both 'comment' and 'content' fields for backward compatibility
  const messageText = comment.comment || (comment as any).content || '';
  
  // Student messages (isOwnMessage = true) appear on the right
  // ERP/Support messages (isOwnMessage = false) appear on the left
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar - Only show for ERP/Support messages (left side) - Headphone icon */}
        {!isOwnMessage && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-600 text-white">
            <Headphones className="w-4 h-4" />
          </div>
        )}
        
        {/* Message Content */}
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-2 rounded-lg ${
            isOwnMessage
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-gray-200 text-gray-900 rounded-tl-none'
          }`}>
            {!isOwnMessage && (
              <div className="text-xs font-semibold mb-1 opacity-80">
                {displayName}
              </div>
            )}
            <p className={`text-sm whitespace-pre-wrap break-words ${
              isOwnMessage ? 'text-white' : ''
            }`}>
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


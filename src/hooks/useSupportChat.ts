'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService, Ticket, TicketComment, CreateTicketRequest, CreateTicketCommentRequest } from '@/lib/services/ticket.service';

const STORAGE_KEY = 'support_chat_ticket_id';

interface UseSupportChatProps {
  studentId?: string;
}

export const useSupportChat = ({ studentId }: UseSupportChatProps = {}) => {
  const queryClient = useQueryClient();
  
  // Load ticket ID from localStorage on mount
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });
  
  const [initialMessage, setInitialMessage] = useState<string>('');

  // Save ticket ID to localStorage whenever it changes
  useEffect(() => {
    if (currentTicketId) {
      localStorage.setItem(STORAGE_KEY, currentTicketId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentTicketId]);

  // Fetch ticket if we have one
  const { data: ticket, isLoading: isLoadingTicket } = useQuery<Ticket>({
    queryKey: ['ticket', currentTicketId],
    queryFn: () => ticketService.getTicket(currentTicketId!),
    enabled: !!currentTicketId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Fetch comments for current ticket
  const { data: comments = [], refetch: refetchComments } = useQuery<TicketComment[]>({
    queryKey: ['ticket-comments', currentTicketId],
    queryFn: () => ticketService.getComments(currentTicketId!),
    enabled: !!currentTicketId,
    staleTime: 0, // Always consider data stale to allow refetching
    refetchInterval: 5000, // Poll every 5 seconds for new messages
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: (data: CreateTicketRequest) => ticketService.createTicket(data),
    onSuccess: (newTicket) => {
      setCurrentTicketId(newTicket.id);
      localStorage.setItem(STORAGE_KEY, newTicket.id);
      queryClient.setQueryData(['ticket', newTicket.id], newTicket);
      setInitialMessage(''); // Clear initial message
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: CreateTicketCommentRequest) => ticketService.addComment(data),
    onSuccess: async () => {
      // Immediately refetch comments to show the new message
      await refetchComments();
      queryClient.invalidateQueries({ queryKey: ['ticket', currentTicketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', currentTicketId] });
    },
  });

  // Handle initial message (creates ticket)
  const sendInitialMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setInitialMessage(message);
    
    const ticketData: CreateTicketRequest = {
      title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      description: message,
      category: 'OTHER',
      priority: 'MEDIUM',
      ...(studentId && { studentId }),
    };

    createTicketMutation.mutate(ticketData);
  }, [studentId, createTicketMutation]);

  // Handle sending a message (adds comment)
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !currentTicketId) return;

    addCommentMutation.mutate({
      ticketId: currentTicketId,
      comment: message,
    });
  }, [currentTicketId, addCommentMutation]);

  // Load existing ticket (if student has one open)
  const loadTicket = useCallback((ticketId: string) => {
    setCurrentTicketId(ticketId);
    localStorage.setItem(STORAGE_KEY, ticketId);
  }, []);

  // Clear current ticket and start new chat
  const clearChat = useCallback(() => {
    setCurrentTicketId(null);
    localStorage.removeItem(STORAGE_KEY);
    queryClient.removeQueries({ queryKey: ['ticket', currentTicketId] });
    queryClient.removeQueries({ queryKey: ['ticket-comments', currentTicketId] });
    setInitialMessage('');
  }, [currentTicketId, queryClient]);

  return {
    ticket,
    comments,
    currentTicketId,
    isLoadingTicket,
    isCreatingTicket: createTicketMutation.isPending,
    isSendingMessage: addCommentMutation.isPending,
    sendInitialMessage,
    sendMessage,
    loadTicket,
    clearChat,
    refetchComments,
  };
};


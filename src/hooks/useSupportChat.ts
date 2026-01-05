'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService, Ticket, TicketComment, CreateTicketRequest, CreateTicketCommentRequest } from '@/lib/services/ticket.service';
import { decodeJWT, getEmailFromToken } from '@/lib/utils/jwt';

const STORAGE_KEY = 'support_chat_ticket_id';

interface UseSupportChatProps {
  studentId?: string;
  userEmail?: string;
}

export const useSupportChat = ({ studentId, userEmail }: UseSupportChatProps = {}) => {
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
  const { data: ticket, isLoading: isLoadingTicket } = useQuery<Ticket | null>({
    queryKey: ['ticket', currentTicketId],
    queryFn: () => ticketService.getTicket(currentTicketId!),
    enabled: !!currentTicketId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Clear ticket ID if ticket doesn't exist (404)
  useEffect(() => {
    if (ticket === null && currentTicketId && !isLoadingTicket) {
      // Ticket was not found, clear it from state and localStorage
      setCurrentTicketId(null);
      localStorage.removeItem(STORAGE_KEY);
      queryClient.removeQueries({ queryKey: ['ticket', currentTicketId] });
      queryClient.removeQueries({ queryKey: ['ticket-comments', currentTicketId] });
    }
  }, [ticket, currentTicketId, isLoadingTicket, queryClient]);

  // Fetch comments for current ticket
  const { data: comments = [], refetch: refetchComments } = useQuery<TicketComment[]>({
    queryKey: ['ticket-comments', currentTicketId],
    queryFn: () => ticketService.getComments(currentTicketId!),
    enabled: !!currentTicketId && ticket !== null && ticket !== undefined, // Only fetch if we have a valid ticket
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

  // Helper function to get email from userInfo cookie (same as onboarding page)
  const getEmailFromCookie = (): string | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'userInfo' && value) {
          try {
            const userInfo = JSON.parse(decodeURIComponent(value));
            const email = userInfo?.email;
            if (email && typeof email === 'string' && email.includes('@')) {
              return email;
            }
          } catch (parseError) {
            console.error('Error parsing userInfo cookie:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error reading userInfo cookie:', error);
    }
    return null;
  };

  // Helper function to get email from multiple sources (reusable for both ticket and comment creation)
  const getEmailFromMultipleSources = useCallback(async (): Promise<string | null> => {
    // Start with provided userEmail
    let email = userEmail;
    let decodedToken: any = null;
    
    // First, try to get decoded token and log it
    try {
      const userInfoResponse = await fetch('/api/auth/user-info', {
        credentials: 'include',
      });
      if (userInfoResponse.ok) {
        const data = await userInfoResponse.json();
        decodedToken = data?.decodedToken;
        
        // Log the decoded token to console
        console.log('🔑 Decoded JWT Token:', decodedToken);
        
        // Try to extract email from decoded token
        if (decodedToken && !email) {
          email = decodedToken.email || decodedToken.userEmail || decodedToken.user?.email || null;
          console.log('📧 Email extracted from token:', email);
        }
        
        // If not in token, try user info from API response
        if (!email) {
          email = data?.user?.email;
          console.log('📧 Email from API user info:', email);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
    
    // If still no email, try userInfo cookie (works during onboarding)
    if (!email) {
      email = getEmailFromCookie() ?? undefined;
      console.log('📧 Email from userInfo cookie:', email);
    }
    
    // If still no email, try sessionStorage (from login response)
    if (!email && typeof window !== 'undefined') {
      try {
        const lastLoginResponse = sessionStorage.getItem('lastLoginResponse');
        if (lastLoginResponse) {
          const loginData = JSON.parse(lastLoginResponse);
          email = loginData?.user?.email || loginData?.email;
          console.log('📧 Email from sessionStorage:', email);
        }
      } catch (error) {
        console.debug('Could not get email from sessionStorage:', error);
      }
    }
    
    return email ?? null;
  }, [userEmail]);

  // Handle initial message (creates ticket)
  const sendInitialMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setInitialMessage(message);
    
    // Get email from multiple sources
    const email = await getEmailFromMultipleSources();
    
    // Email is REQUIRED for public ticket creation
    if (!email) {
      console.error('Email is required for ticket creation but could not be retrieved');
      console.error('Available sources checked: token, API user info, userInfo cookie, sessionStorage');
      alert('Unable to create ticket: Email is required. Please ensure you are logged in.');
      return;
    }
    
    const ticketData: CreateTicketRequest = {
      title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      description: message,
      category: 'OTHER',
      priority: 'MEDIUM',
      email: email, // Always include email - required for public tickets
      ...(studentId && { studentId }),
    };

    createTicketMutation.mutate(ticketData);
  }, [studentId, getEmailFromMultipleSources, createTicketMutation]);

  // Handle sending a message (adds comment)
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !currentTicketId) return;

    // Get email from multiple sources (same as ticket creation)
    const email = await getEmailFromMultipleSources();
    
    // Email is REQUIRED for public ticket comments
    if (!email) {
      console.error('Email is required for ticket comment but could not be retrieved');
      console.error('Available sources checked: token, API user info, userInfo cookie, sessionStorage');
      alert('Unable to send message: Email is required. Please ensure you are logged in.');
      return;
    }

    addCommentMutation.mutate({
      ticketId: currentTicketId,
      comment: message,
      email: email, // Always include email - required for public ticket comments
    });
  }, [currentTicketId, getEmailFromMultipleSources, addCommentMutation]);

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

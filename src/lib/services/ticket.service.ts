import { clientApi } from '@/lib/network';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdBy: string;
  createdByName?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  comment: string;
  createdBy: string;
  createdByName?: string;
  attachments?: string[] | null;
  createdAt: string;
  updatedAt?: string;
}

export type TicketCategory = 
  | 'PAYMENT_ISSUE'
  | 'ENROLLMENT_ISSUE'
  | 'TECHNICAL_ISSUE'
  | 'REFUND_REQUEST'
  | 'ACCOUNT_ISSUE'
  | 'OTHER';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  studentId?: string;
  email?: string;
  attachments?: string[];
}

export interface CreateTicketCommentRequest {
  ticketId: string;
  comment: string;
  email?: string;
  attachments?: string[];
}

export const ticketService = {
  // Create a new ticket
  async createTicket(data: CreateTicketRequest): Promise<Ticket> {
    // Ensure email is always included for public ticket creation
    if (!data.email) {
      console.error('Email is required for ticket creation but was not provided');
      throw new Error('Email is required for ticket creation');
    }
    
    // Log the payload being sent (for debugging)
    console.log('Creating ticket with payload:', { ...data, description: data.description?.substring(0, 50) + '...' });
    
    const res = await clientApi.post('/tickets', data);
    return res.data;
  },

  // Get ticket by ID
  async getTicket(id: string): Promise<Ticket | null> {
    try {
      const res = await clientApi.get(`/tickets/${id}`);
      return res.data;
    } catch (error: any) {
      // Handle 404 errors gracefully - ticket doesn't exist
      if (error?.response?.status === 404) {
        console.debug('Ticket not found:', id);
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  },

  // Get ticket comments
  async getComments(ticketId: string): Promise<TicketComment[]> {
    try {
      const res = await clientApi.get(`/tickets/${ticketId}/comments`);
      // Handle both array response and wrapped response
      const data = res.data;
      const comments = Array.isArray(data) ? data : (data?.data || data?.comments || []);
      
      // Ensure comments have the correct structure
      return comments.map((comment: any) => ({
        id: comment.id,
        ticketId: comment.ticketId || ticketId,
        comment: comment.comment || comment.content || '',
        createdBy: comment.createdBy || '',
        createdByName: comment.createdByName || comment.createdBy || 'Support Team',
        attachments: comment.attachments || null,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt || comment.createdAt,
      }));
    } catch (error: any) {
      // Handle 404 errors gracefully - ticket or comments don't exist
      if (error?.response?.status === 404) {
        console.debug('Ticket comments not found for ticket:', ticketId);
        return [];
      }
      // Re-throw other errors
      console.error('Error fetching comments:', error);
      throw error;
    }
  },

  // Add comment to ticket
  async addComment(data: CreateTicketCommentRequest): Promise<TicketComment> {
    // Ensure email is always included for public ticket comments
    if (!data.email) {
      console.error('Email is required for ticket comment but was not provided');
      throw new Error('Email is required for ticket comment');
    }
    
    const res = await clientApi.post(`/tickets/${data.ticketId}/comments`, {
      comment: data.comment,
      email: data.email,
      attachments: data.attachments,
    });
    return res.data;
  },
};

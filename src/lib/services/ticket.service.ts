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
  attachments?: string[];
}

export interface CreateTicketCommentRequest {
  ticketId: string;
  comment: string;
  attachments?: string[];
}

export const ticketService = {
  // Create a new ticket
  async createTicket(data: CreateTicketRequest): Promise<Ticket> {
    const res = await clientApi.post('/tickets', data);
    return res.data;
  },

  // Get ticket by ID
  async getTicket(id: string): Promise<Ticket> {
    const res = await clientApi.get(`/tickets/${id}`);
    return res.data;
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
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  },

  // Add comment to ticket
  async addComment(data: CreateTicketCommentRequest): Promise<TicketComment> {
    const res = await clientApi.post(`/tickets/${data.ticketId}/comments`, {
      comment: data.comment,
      attachments: data.attachments,
    });
    return res.data;
  },
};


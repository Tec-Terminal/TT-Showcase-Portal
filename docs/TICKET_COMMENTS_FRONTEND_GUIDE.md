# Ticket Comments Frontend Implementation Guide

This guide provides complete instructions for implementing ticket comments on the frontend.

## Backend API Endpoints

### 1. Add Comment to Ticket
- **Endpoint:** `POST /api/tickets/:ticketId/comments`
- **Authentication:** Required (JWT token)
- **Request Body:**
  ```typescript
  {
    comment: string;        // Required - The comment text
    attachments?: string[]; // Optional - Array of attachment URLs/IDs
  }
  ```
- **Response:** Returns the created comment
  ```typescript
  {
    id: string;
    ticketId: string;
    comment: string;
    createdBy: string; // User's name as a string (e.g., "John Doe")
    attachments: any | null;
    createdAt: string;
    updatedAt: string;
  }
  ```

### 2. Get All Comments for a Ticket
- **Endpoint:** `GET /api/tickets/:ticketId/comments`
- **Authentication:** Required (JWT token)
- **Response:** Returns array of comments ordered by creation date (ascending)
  ```typescript
  Array<{
    id: string;
    ticketId: string;
    comment: string;
    createdBy: string; // User's name as a string (e.g., "John Doe")
    attachments: any | null;
    createdAt: string;
    updatedAt: string;
  }>
  ```

## TypeScript Types

Create these types in your frontend codebase:

```typescript
// types/ticket.ts

export interface TicketComment {
  id: string;
  ticketId: string;
  comment: string;
  createdBy: string; // User's name as a string (e.g., "John Doe")
  attachments: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketCommentDto {
  comment: string;
  attachments?: string[];
}
```

## API Service Functions

Create an API service file for ticket comments:

```typescript
// services/ticketApi.ts or api/tickets.ts

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Get auth token from your auth context/store
const getAuthToken = () => {
  // Replace with your actual token retrieval method
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add comment to ticket
export const addTicketComment = async (
  ticketId: string,
  comment: string,
  attachments?: string[]
): Promise<TicketComment> => {
  const response = await apiClient.post<TicketComment>(
    `/tickets/${ticketId}/comments`,
    {
      comment,
      attachments,
    }
  );
  return response.data;
};

// Get all comments for a ticket
export const getTicketComments = async (
  ticketId: string
): Promise<TicketComment[]> => {
  const response = await apiClient.get<TicketComment[]>(
    `/tickets/${ticketId}/comments`
  );
  return response.data;
};
```

## React Component Implementation

### Complete Comment Section Component

```typescript
// components/tickets/TicketComments.tsx

'use client';

import { useState, useEffect } from 'react';
import { addTicketComment, getTicketComments } from '@/services/ticketApi';
import { TicketComment } from '@/types/ticket';

interface TicketCommentsProps {
  ticketId: string;
}

export default function TicketComments({ ticketId }: TicketCommentsProps) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  const fetchComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTicketComments(ticketId);
      setComments(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load comments');
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createdComment = await addTicketComment(ticketId, newComment.trim());
      
      // Add the new comment to the list
      setComments([...comments, createdComment]);
      
      // Clear the input
      setNewComment('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add comment');
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <div className="space-y-4">
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Comments ({comments.length})
        </h3>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </button>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                    {comment.createdBy.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {comment.createdBy}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-gray-300 whitespace-pre-wrap">{comment.comment}</p>
              {comment.attachments && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-sm text-gray-400">Attachments:</p>
                  {/* Render attachments here */}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Usage in Ticket Detail Page

```typescript
// pages/tickets/[id].tsx or app/tickets/[id]/page.tsx

import TicketComments from '@/components/tickets/TicketComments';

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-6">
      {/* Other ticket details */}
      
      {/* Comments Section */}
      <div className="mt-8">
        <TicketComments ticketId={params.id} />
      </div>
    </div>
  );
}
```

## Alternative: Using React Query / SWR

For better caching and state management, use React Query:

```typescript
// hooks/useTicketComments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTicketComments, addTicketComment } from '@/services/ticketApi';

export function useTicketComments(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-comments', ticketId],
    queryFn: () => getTicketComments(ticketId),
  });
}

export function useAddTicketComment(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comment: string) => addTicketComment(ticketId, comment),
    onSuccess: () => {
      // Invalidate and refetch comments
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
    },
  });
}

// Usage in component:
const { data: comments, isLoading } = useTicketComments(ticketId);
const addCommentMutation = useAddTicketComment(ticketId);

const handleSubmit = async (comment: string) => {
  await addCommentMutation.mutateAsync(comment);
};
```

## Error Handling

The API may return these error responses:

- **400 Bad Request:** Invalid comment data
- **401 Unauthorized:** Missing or invalid authentication token
- **404 Not Found:** Ticket not found
- **500 Internal Server Error:** Server error

Handle these appropriately in your UI.

## Notes

1. **Authentication:** Ensure the JWT token is included in the Authorization header
2. **Real-time Updates:** Consider implementing WebSocket/SSE for real-time comment updates
3. **Attachments:** The attachments field accepts an array of strings (URLs or file IDs)
4. **Comment Ordering:** Comments are returned in ascending order by creation date (oldest first)
5. **Creator Information:** The creator object includes user details, use `firstname`/`lastname` if available, otherwise fall back to email

## Testing

Test the implementation with:

1. **Add a comment:**
   ```bash
   curl -X POST http://localhost:8000/tickets/{ticketId}/comments \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"comment": "This is a test comment"}'
   ```

2. **Get comments:**
   ```bash
   curl -X GET http://localhost:8000/tickets/{ticketId}/comments \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Next Steps

1. Implement file upload for attachments (if needed)
2. Add comment editing functionality (requires backend support)
3. Add comment deletion functionality (requires backend support)
4. Implement real-time updates using WebSockets
5. Add markdown support for comment formatting
6. Add @mentions functionality for notifying users


# Scalable Notification System - Implementation Guide

## Overview

This document provides a comprehensive guide to the scalable notification system implemented in the Tec Terminal Backend. The system supports in-app notifications, email notifications, and SMS notifications with a robust, event-driven architecture.

## Architecture

### Key Components

1. **Event-Driven Architecture**: Uses NestJS EventEmitter for decoupled event handling
2. **Queue-Based Processing**: Uses Bull (Redis) for async notification processing
3. **Multi-Channel Support**: Supports in-app, email, and SMS notifications
4. **User Preferences**: Allows users to configure notification preferences per event type
5. **Template System**: Centralized notification templates for consistent messaging

### System Flow

```
Event Trigger → Event Emitter → Event Listener → Notification Service → Queue → Processor → Channel (Email/SMS/In-App)
```

## Database Schema

### Notification Model
- Stores notification metadata
- Links to user
- Contains notification type, title, message, link, and metadata
- Tracks read status

### NotificationChannel Model
- Tracks each delivery channel (in-app, email, SMS)
- Stores delivery status (pending, sent, failed, retrying)
- Tracks retry attempts and error messages

### NotificationPreference Model
- User-level preferences for each channel
- Event-type specific preferences
- Allows granular control over notifications

## Backend Integration

### 1. Emitting Events

Events are automatically emitted when certain actions occur:

#### Student Registration
```typescript
// Automatically emitted in StudentService.createStudent()
this.eventEmitter.emit(
  'student.registered',
  new StudentRegisteredEvent(userId, studentData, metadata)
);
```

#### Payment Creation
```typescript
// Automatically emitted in StudentService when payment is created
this.eventEmitter.emit(
  'payment.created',
  new PaymentCreatedEvent(userId, paymentData, metadata)
);
```

#### Course Registration
```typescript
// Automatically emitted in StudentService.enrollStudentCourse()
this.eventEmitter.emit(
  'course.registered',
  new CourseRegisteredEvent(userId, enrollmentData, metadata)
);
```

### 2. Available Events

- `student.registered` - When a new student is registered
- `payment.created` - When a payment record is created
- `course.registered` - When a student enrolls in a course
- `payment.received` - When a payment is received (future)
- `payment.due` - When a payment is due (future)

### 3. API Endpoints

#### Get Notifications
```http
GET /notifications
Query Parameters:
  - read: boolean (optional) - Filter by read status
  - limit: number (optional) - Limit results
  - offset: number (optional) - Pagination offset
```

#### Get Unread Count
```http
GET /notifications/unread-count
```

#### Mark as Read
```http
PATCH /notifications/:id/read
```

#### Mark All as Read
```http
PATCH /notifications/read-all
```

#### Get Notification Statistics
```http
GET /notifications/stats
```

#### Get User Preferences
```http
GET /notifications/preferences
```

#### Update User Preferences
```http
POST /notifications/preferences
Body: {
  email?: boolean,
  sms?: boolean,
  inApp?: boolean
}
```

## Frontend Integration Guide

### 1. Setup

#### Install Dependencies
```bash
npm install axios socket.io-client
# or
yarn add axios socket.io-client
```

#### Create Notification Service
```typescript
// services/notification.service.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export class NotificationService {
  private static getAuthToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private static getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  // Get all notifications
  static async getNotifications(params?: {
    read?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const response = await axios.get(`${API_BASE_URL}/notifications`, {
      headers: this.getHeaders(),
      params,
    });
    return response.data;
  }

  // Get unread count
  static async getUnreadCount(): Promise<number> {
    const response = await axios.get(
      `${API_BASE_URL}/notifications/unread-count`,
      { headers: this.getHeaders() }
    );
    return response.data.count;
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    const response = await axios.patch(
      `${API_BASE_URL}/notifications/${notificationId}/read`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Mark all as read
  static async markAllAsRead() {
    const response = await axios.patch(
      `${API_BASE_URL}/notifications/read-all`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Get preferences
  static async getPreferences() {
    const response = await axios.get(
      `${API_BASE_URL}/notifications/preferences`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Update preferences
  static async updatePreferences(preferences: {
    email?: boolean;
    sms?: boolean;
    inApp?: boolean;
  }) {
    const response = await axios.post(
      `${API_BASE_URL}/notifications/preferences`,
      preferences,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}
```

### 2. Notification Component (React Example)

```typescript
// components/NotificationBell.tsx
import React, { useState, useEffect, useRef } from 'react';
import { NotificationService } from '../services/notification.service';
import './NotificationBell.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  channels: Array<{
    channel: string;
    status: string;
  }>;
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Poll for new notifications every 30 seconds
    intervalRef.current = setInterval(() => {
      loadUnreadCount();
      if (isOpen) {
        loadNotifications();
      }
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await NotificationService.getNotifications({ limit: 20 });
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    setIsOpen(false);
  };

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="mark-all-read">
                Mark all as read
              </button>
            )}
          </div>

          {loading ? (
            <div className="notification-loading">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">No notifications</div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    !notification.read ? 'unread' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {!notification.read && (
                    <div className="notification-dot"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### 3. CSS Styling

```css
/* components/NotificationBell.css */
.notification-bell-container {
  position: relative;
  display: inline-block;
}

.notification-bell-button {
  position: relative;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 400px;
  max-height: 600px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
  margin-top: 8px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.notification-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.mark-all-read {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
}

.mark-all-read:hover {
  text-decoration: underline;
}

.notification-list {
  max-height: 500px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item.unread {
  background: #eff6ff;
}

.notification-content {
  flex: 1;
}

.notification-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.notification-content p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #6b7280;
}

.notification-time {
  font-size: 11px;
  color: #9ca3af;
}

.notification-dot {
  width: 8px;
  height: 8px;
  background: #2563eb;
  border-radius: 50%;
  margin-left: 12px;
  margin-top: 8px;
}

.notification-loading,
.notification-empty {
  padding: 32px;
  text-align: center;
  color: #6b7280;
}
```

### 4. Real-time Updates (Optional - WebSocket)

For real-time notifications, you can implement WebSocket support:

```typescript
// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { NotificationService } from '../services/notification.service';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:8000', {
      auth: {
        token: localStorage.getItem('access_token'),
      },
    });

    socket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('notification:read', (notificationId) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { notifications, unreadCount };
};
```

### 5. Notification Preferences Component

```typescript
// components/NotificationPreferences.tsx
import React, { useState, useEffect } from 'react';
import { NotificationService } from '../services/notification.service';

export const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState({
    email: true,
    sms: true,
    inApp: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await NotificationService.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleToggle = async (key: 'email' | 'sms' | 'inApp') => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);

    try {
      await NotificationService.updatePreferences(newPreferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      // Revert on error
      setPreferences(preferences);
    }
  };

  return (
    <div className="notification-preferences">
      <h2>Notification Preferences</h2>
      <div className="preference-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.email}
            onChange={() => handleToggle('email')}
          />
          Email Notifications
        </label>
      </div>
      <div className="preference-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.sms}
            onChange={() => handleToggle('sms')}
          />
          SMS Notifications
        </label>
      </div>
      <div className="preference-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.inApp}
            onChange={() => handleToggle('inApp')}
          />
          In-App Notifications
        </label>
      </div>
    </div>
  );
};
```

## Environment Variables

Add these to your `.env` file:

```env
# Redis Configuration (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@tecterminal.com
SENDGRID_API_KEY=your-sendgrid-api-key  # Optional, if using SendGrid

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Running the System

### 1. Start Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local Redis
redis-server
```

### 2. Run Database Migration
```bash
npx prisma migrate dev
```

### 3. Start the Backend
```bash
npm run start:dev
```

## Best Practices

1. **Error Handling**: Notification failures don't break the main application flow
2. **Retry Logic**: Failed notifications are automatically retried with exponential backoff
3. **Queue Management**: Use Redis for reliable queue processing
4. **User Preferences**: Always respect user notification preferences
5. **Rate Limiting**: Consider implementing rate limiting for SMS/Email to prevent abuse
6. **Monitoring**: Monitor queue health and failed notifications
7. **Templates**: Use centralized templates for consistent messaging

## Scaling Considerations

1. **Horizontal Scaling**: Multiple worker instances can process notifications
2. **Queue Sharding**: Consider sharding queues by notification type for better performance
3. **Caching**: Cache user preferences to reduce database queries
4. **Batch Processing**: Process notifications in batches for efficiency
5. **Monitoring**: Use tools like Bull Board to monitor queue health

## Troubleshooting

### Notifications Not Sending

1. Check Redis connection
2. Verify email/SMS credentials
3. Check queue processor logs
4. Verify user preferences

### High Queue Backlog

1. Scale up worker instances
2. Check for stuck jobs
3. Review retry logic
4. Monitor Redis performance

## Future Enhancements

- [ ] WebSocket support for real-time notifications
- [ ] Push notifications (browser/ mobile)
- [ ] Notification scheduling
- [ ] Notification templates customization
- [ ] Analytics and reporting
- [ ] Notification batching
- [ ] A/B testing for notification content












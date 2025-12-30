# In-App Notification Fix - Implementation Guide

## Overview

This guide provides step-by-step instructions to fix the issue where users receive email notifications but no in-app notifications. The fix ensures that in-app notifications are created even when the initial `userId` is null by looking up the user account from student data.

## Problem Summary

- **Email notifications work** because they can be sent to any email address
- **In-app notifications fail** because they require a `userId` to link to the `User` table
- When events are emitted with `userId = null`, in-app notifications are skipped

## Solution Approach

1. **User Lookup Utility**: Create a utility to find user accounts by email or studentId
2. **Notification Service Enhancement**: Modify the notification service to look up users when `userId` is null
3. **Event Emission Improvement**: Ensure events always try to resolve `userId` before emission

## Implementation Steps

### Step 1: Create User Lookup Utility

Create a new utility service to resolve user IDs from student data.

**File**: `src/notification/utils/user-lookup.util.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Student } from '../../student/entities/student.entity';

@Injectable()
export class UserLookupUtil {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  /**
   * Resolve userId from various sources
   * @param userId - Direct userId if available
   * @param studentId - Student ID to look up
   * @param email - Email address to look up
   * @returns userId or null if not found
   */
  async resolveUserId(
    userId?: string | null,
    studentId?: string,
    email?: string,
  ): Promise<string | null> {
    // If userId is already provided, return it
    if (userId) {
      return userId;
    }

    // Try to find user by studentId
    if (studentId) {
      const student = await this.studentRepository.findOne({
        where: { id: studentId },
        relations: ['user'],
      });

      if (student?.user?.id) {
        return student.user.id;
      }

      // If student has no user relation, try to find by studentId field in User table
      const userByStudentId = await this.userRepository.findOne({
        where: { studentId: studentId },
      });

      if (userByStudentId?.id) {
        return userByStudentId.id;
      }
    }

    // Try to find user by email
    if (email) {
      const userByEmail = await this.userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
      });

      if (userByEmail?.id) {
        return userByEmail.id;
      }

      // Also check if student exists with this email and has a user
      if (studentId) {
        const student = await this.studentRepository.findOne({
          where: { id: studentId, email: email },
          relations: ['user'],
        });

        if (student?.user?.id) {
          return student.user.id;
        }
      } else {
        // Find student by email and check for user
        const student = await this.studentRepository.findOne({
          where: { email: email },
          relations: ['user'],
        });

        if (student?.user?.id) {
          return student.user.id;
        }
      }
    }

    return null;
  }

  /**
   * Resolve userId from payment data
   */
  async resolveUserIdFromPayment(payment: any): Promise<string | null> {
    return this.resolveUserId(
      payment.userId,
      payment.studentId,
      payment.student?.email || payment.email,
    );
  }

  /**
   * Resolve userId from student data
   */
  async resolveUserIdFromStudent(student: any): Promise<string | null> {
    return this.resolveUserId(
      student.userId,
      student.id,
      student.email,
    );
  }
}
```

### Step 2: Update Notification Service

Modify the notification service to use the user lookup utility.

**File**: `src/notification/services/notification.service.ts`

Add the import and inject the utility:

```typescript
import { UserLookupUtil } from '../utils/user-lookup.util';

// In the constructor:
constructor(
  // ... existing dependencies
  private userLookupUtil: UserLookupUtil,
) {}
```

Modify the `sendNotification` method to resolve userId:

```typescript
async sendNotification(
  eventType: NotificationEventType,
  userId: string | null,
  data: any,
  metadata?: Record<string, any>,
): Promise<void> {
  // Resolve userId if it's null
  let resolvedUserId = userId;
  
  if (!resolvedUserId) {
    // Try to resolve from metadata or data
    resolvedUserId = await this.userLookupUtil.resolveUserId(
      null,
      data.studentId || metadata?.studentId,
      data.email || metadata?.email || data.student?.email,
    );

    if (!resolvedUserId) {
      console.warn(
        `[NOTIFICATION SERVICE] Could not resolve userId for event ${eventType}. In-app notification will be skipped.`,
      );
    }
  }

  // Get user preferences (only if we have a userId)
  let userPreferences = null;
  if (resolvedUserId) {
    userPreferences = await this.notificationPreferenceService.getPreferences(
      resolvedUserId,
      eventType,
    );
  }

  // Get notification template
  const template = this.getNotificationTemplate(eventType, data);

  // Create notification record (only if we have a userId)
  let notification = null;
  if (resolvedUserId) {
    notification = await this.notificationRepository.save({
      userId: resolvedUserId,
      type: eventType,
      title: template.title,
      message: template.message,
      link: template.link,
      metadata: metadata || {},
      read: false,
    });
  }

  // Send email notification (if enabled and we have an email)
  const email = data.email || metadata?.email || data.student?.email;
  if (
    email &&
    (!userPreferences || userPreferences.email !== false)
  ) {
    await this.queueEmailNotification(
      notification?.id || null,
      email,
      template,
      eventType,
    );
  }

  // Send SMS notification (if enabled and we have a phone)
  const phone = data.phone || metadata?.phone || data.student?.phone;
  if (
    phone &&
    (!userPreferences || userPreferences.sms !== false)
  ) {
    await this.queueSmsNotification(
      notification?.id || null,
      phone,
      template,
      eventType,
    );
  }

  // Handle additional recipients (for email)
  await this.sendToAdditionalRecipients(eventType, template, data);
}
```

### Step 3: Update Event Listeners

Modify event listeners to extract and pass student data for user lookup.

**File**: `src/notification/listeners/notification.listener.ts`

Update the payment.created handler:

```typescript
@OnEvent('payment.created')
async handlePaymentCreated(event: PaymentCreatedEvent) {
  // Extract student data from event
  const paymentData = event.paymentData;
  const studentData = paymentData.student || {};
  
  // Prepare metadata with student information for user lookup
  const metadata = {
    paymentId: event.paymentId,
    studentId: paymentData.studentId || studentData.id,
    email: studentData.email || paymentData.email,
    phone: studentData.phone || paymentData.phone,
    ...event.metadata,
  };

  // Try to resolve userId if it's null
  let userId = event.userId;
  if (!userId && metadata.studentId) {
    userId = await this.userLookupUtil.resolveUserId(
      null,
      metadata.studentId,
      metadata.email,
    );
  }

  await this.notificationService.sendNotification(
    NotificationEventType.PAYMENT_CREATED,
    userId,
    {
      ...paymentData,
      student: studentData,
    },
    metadata,
  );
}
```

Update the student.registered handler:

```typescript
@OnEvent('student.registered')
async handleStudentRegistered(event: StudentRegisteredEvent) {
  const studentData = event.studentData;
  const metadata = {
    studentId: studentData.id,
    email: studentData.email,
    phone: studentData.phone,
    ...event.metadata,
  };

  // Try to resolve userId if it's null
  let userId = event.userId;
  if (!userId) {
    userId = await this.userLookupUtil.resolveUserId(
      null,
      metadata.studentId,
      metadata.email,
    );
  }

  await this.notificationService.sendNotification(
    NotificationEventType.STUDENT_REGISTERED,
    userId,
    studentData,
    metadata,
  );
}
```

Update the course.registered handler similarly:

```typescript
@OnEvent('course.registered')
async handleCourseRegistered(event: CourseRegisteredEvent) {
  const enrollmentData = event.enrollmentData;
  const studentData = enrollmentData.student || {};
  const metadata = {
    studentId: enrollmentData.studentId || studentData.id,
    courseId: enrollmentData.courseId,
    email: studentData.email,
    phone: studentData.phone,
    ...event.metadata,
  };

  // Try to resolve userId if it's null
  let userId = event.userId;
  if (!userId && metadata.studentId) {
    userId = await this.userLookupUtil.resolveUserId(
      null,
      metadata.studentId,
      metadata.email,
    );
  }

  await this.notificationService.sendNotification(
    NotificationEventType.COURSE_REGISTERED,
    userId,
    enrollmentData,
    metadata,
  );
}
```

### Step 4: Update Notification Module

Register the UserLookupUtil in the notification module.

**File**: `src/notification/notification.module.ts`

```typescript
import { UserLookupUtil } from './utils/user-lookup.util';
import { User } from '../user/entities/user.entity';
import { Student } from '../student/entities/student.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationChannel,
      NotificationPreference,
      User, // Add User entity
      Student, // Add Student entity
    ]),
    // ... other imports
  ],
  providers: [
    NotificationService,
    NotificationPreferenceService,
    NotificationProcessor,
    UserLookupUtil, // Add the utility
    // ... other providers
  ],
  // ... rest of module
})
export class NotificationModule {}
```

### Step 5: Update Student Service (Optional but Recommended)

Improve event emission in the student service to always try to resolve userId.

**File**: `src/student/student.service.ts`

Add user lookup before emitting events:

```typescript
// In the method that creates payments
async createPayment(createPaymentDto: CreatePaymentDto, userId?: string) {
  // ... existing payment creation logic

  // Try to resolve userId if not provided
  let resolvedUserId = userId;
  if (!resolvedUserId && student.id) {
    // Look up user by student
    const studentWithUser = await this.studentRepository.findOne({
      where: { id: student.id },
      relations: ['user'],
    });
    
    resolvedUserId = studentWithUser?.user?.id || null;
    
    // Also try by email
    if (!resolvedUserId && student.email) {
      const user = await this.userRepository.findOne({
        where: { email: student.email },
      });
      resolvedUserId = user?.id || null;
    }
  }

  // Emit event with resolved userId
  this.eventEmitter.emit(
    'payment.created',
    new PaymentCreatedEvent(resolvedUserId, paymentData, metadata),
  );

  return payment;
}
```

## Testing

### 1. Test User Lookup

```typescript
// Test case: User exists with email
const userId = await userLookupUtil.resolveUserId(
  null,
  null,
  'student@example.com',
);
expect(userId).toBeDefined();

// Test case: User exists with studentId
const userId2 = await userLookupUtil.resolveUserId(
  null,
  'student-123',
  null,
);
expect(userId2).toBeDefined();

// Test case: No user found
const userId3 = await userLookupUtil.resolveUserId(
  null,
  'non-existent',
  'nonexistent@example.com',
);
expect(userId3).toBeNull();
```

### 2. Test Notification Creation

1. **Create a payment** for a student with a user account
2. **Check logs** for:
   ```
   [NOTIFICATION LISTENER] Resolved userId [ID] for payment [ID]
   [NOTIFICATION SERVICE] Created in-app notification [ID] for user [ID]
   ```
3. **Verify in database**:
   ```sql
   SELECT * FROM "Notification" 
   WHERE "userId" = '<USER_ID>' 
   AND type = 'PAYMENT_CREATED'
   ORDER BY "createdAt" DESC 
   LIMIT 1;
   ```
4. **Check dashboard**: The notification should appear

### 3. Test Edge Cases

- Student without user account: Should still send email, skip in-app
- Student with user account but null userId in event: Should resolve and create in-app
- Multiple students with same email: Should use the correct one

## Verification Checklist

- [ ] UserLookupUtil created and registered
- [ ] NotificationService updated to use UserLookupUtil
- [ ] Event listeners updated to resolve userId
- [ ] NotificationModule updated with User and Student entities
- [ ] Tests pass for user lookup
- [ ] In-app notifications appear in dashboard
- [ ] Email notifications still work
- [ ] Logs show userId resolution when needed

## Expected Log Output

After implementing the fix, you should see logs like:

```
[NOTIFICATION LISTENER] Received payment.created event for user null, payment ID: [ID]
[NOTIFICATION LISTENER] Resolved userId [USER_ID] for payment [ID]
[NOTIFICATION SERVICE] Resolved userId [USER_ID] from student data
[NOTIFICATION SERVICE] Created in-app notification [NOTIFICATION_ID] for user [USER_ID]
[NOTIFICATION SERVICE] Queued email for user [USER_ID]
```

## Rollback Plan

If issues occur, you can temporarily disable user lookup by:

1. Commenting out the userId resolution in `sendNotification`
2. Reverting to the original behavior where null userId skips in-app notifications

## Next Steps

1. Implement the changes in the backend repository
2. Run database migrations if needed
3. Test with real student data
4. Monitor logs for any issues
5. Verify notifications appear in the frontend dashboard


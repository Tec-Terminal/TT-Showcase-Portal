# Ticket and TicketComment CreatedBy Field Migration Guide

## Overview

The `createdBy` field in both the Ticket and TicketComment models has been changed from a foreign key relationship to a simple string field that stores the user's name.

## Changes Made

### 1. Prisma Schema Changes

- **Ticket Model:**
  - Removed the foreign key relationship `creator` from the Ticket model
  - `createdBy` is now a simple `String` field (no foreign key constraint)
  - Removed `ticketsCreated` relation from the User model
- **TicketComment Model:**
  - Removed the foreign key relationship `creator` from the TicketComment model
  - `createdBy` is now a simple `String` field (no foreign key constraint)
  - Removed `ticketComments` relation from the User model

### 2. Service Changes

- **Ticket Service:**
  - `createTicket()` now fetches the user's name and stores it as a string
  - Removed all `creator` relation includes from:
    - `getAllTickets()`
    - `getTicket()`
    - `updateTicket()`
- **TicketComment Service:**
  - `addComment()` now fetches the user's name and stores it as a string
  - Removed `creator` relation includes from:
    - `getTicketComments()`
    - `getTicket()` (comments section)

### 3. Name Format

The user's name is stored in the following format:

- If `firstname` or `lastname` exists: `"FirstName LastName"` (trimmed)
- Otherwise: Uses the part before `@` in the email address

## Database Migration

You need to create and run a migration to update your database schema.

### Step 1: Generate Migration

```bash
npx prisma migrate dev --name change_ticket_and_comment_created_by_to_string
```

### Step 2: Handle Existing Data (Important!)

**Before running the migration**, you need to migrate existing data. The `createdBy` fields in both `tickets` and `ticket_comments` tables currently contain user IDs, but after the migration they should contain user names.

Create a data migration script:

```typescript
// scripts/migrate-ticket-created-by.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getUserName(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstname: true,
      lastname: true,
      email: true,
    },
  });

  if (!user) {
    return null;
  }

  // Create user name string
  return user.firstname || user.lastname
    ? `${user.firstname || ''} ${user.lastname || ''}`.trim()
    : user.email.split('@')[0];
}

async function migrateTicketCreatedBy() {
  // Migrate Tickets
  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      createdBy: true, // This is currently a user ID
    },
  });

  for (const ticket of tickets) {
    try {
      const userName = await getUserName(ticket.createdBy);

      if (userName) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { createdBy: userName },
        });
      } else {
        console.warn(
          `User not found for ticket ${ticket.id}, keeping original value`,
        );
      }
    } catch (error) {
      console.error(`Error migrating ticket ${ticket.id}:`, error);
    }
  }

  // Migrate TicketComments
  const comments = await prisma.ticketComment.findMany({
    select: {
      id: true,
      createdBy: true, // This is currently a user ID
    },
  });

  for (const comment of comments) {
    try {
      const userName = await getUserName(comment.createdBy);

      if (userName) {
        await prisma.ticketComment.update({
          where: { id: comment.id },
          data: { createdBy: userName },
        });
      } else {
        console.warn(
          `User not found for comment ${comment.id}, keeping original value`,
        );
      }
    } catch (error) {
      console.error(`Error migrating comment ${comment.id}:`, error);
    }
  }
}

migrateTicketCreatedBy()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 3: Run the Data Migration

**IMPORTANT:** Run this script **BEFORE** applying the Prisma migration, or the foreign key constraint will prevent the update.

```bash
# Run the data migration script
npx ts-node scripts/migrate-ticket-created-by.ts
```

### Step 4: Apply Schema Migration

After migrating the data, apply the schema changes:

```bash
npx prisma migrate dev --name change_ticket_and_comment_created_by_to_string
```

### Step 5: Regenerate Prisma Client

```bash
npx prisma generate
```

## API Response Changes

### Ticket - Before (with creator relation):

```json
{
  "id": "ticket-id",
  "title": "Ticket Title",
  "createdBy": "user-id",
  "creator": {
    "id": "user-id",
    "email": "user@example.com",
    "firstname": "John",
    "lastname": "Doe"
  }
}
```

### Ticket - After (with createdBy as string):

```json
{
  "id": "ticket-id",
  "title": "Ticket Title",
  "createdBy": "John Doe"
}
```

### TicketComment - Before (with creator relation):

```json
{
  "id": "comment-id",
  "ticketId": "ticket-id",
  "comment": "This is a comment",
  "createdBy": "user-id",
  "creator": {
    "id": "user-id",
    "email": "user@example.com",
    "firstname": "John",
    "lastname": "Doe"
  }
}
```

### TicketComment - After (with createdBy as string):

```json
{
  "id": "comment-id",
  "ticketId": "ticket-id",
  "comment": "This is a comment",
  "createdBy": "John Doe"
}
```

## Frontend Updates Required

If your frontend was using the `creator` object, update it to use the `createdBy` string directly:

### Ticket - Before:

```typescript
const creatorName = ticket.creator?.firstname
  ? `${ticket.creator.firstname} ${ticket.creator.lastname}`.trim()
  : ticket.creator?.email;
```

### Ticket - After:

```typescript
const creatorName = ticket.createdBy; // Already a string
```

### TicketComment - Before:

```typescript
const commentCreatorName = comment.creator?.firstname
  ? `${comment.creator.firstname} ${comment.creator.lastname}`.trim()
  : comment.creator?.email;
```

### TicketComment - After:

```typescript
const commentCreatorName = comment.createdBy; // Already a string
```

## Testing

After migration, test the following:

1. ✅ Create a new ticket - verify `createdBy` contains the user's name
2. ✅ Get all tickets - verify `createdBy` is a string (no `creator` object)
3. ✅ Get single ticket - verify `createdBy` is a string
4. ✅ Update ticket - verify response doesn't include `creator` object
5. ✅ Add a comment to a ticket - verify `createdBy` contains the user's name
6. ✅ Get ticket comments - verify `createdBy` is a string (no `creator` object)
7. ✅ Get ticket with comments - verify comments have `createdBy` as string

## Rollback Plan

If you need to rollback:

1. Restore the previous Prisma schema with the foreign key relationship
2. Run a reverse migration script to convert names back to user IDs
3. Apply the rollback migration

## Notes

- The `createdBy` fields in both Ticket and TicketComment are now just display names and cannot be used to look up the user
- If you need user details, you'll need to store the user ID separately or query by email
- The `assignedTo` and `resolvedBy` fields in Ticket still maintain foreign key relationships to the User model
- Comments no longer have a `creator` relation - use `createdBy` string directly

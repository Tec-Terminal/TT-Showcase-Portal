# Notification Additional Recipients Configuration

## Overview

The notification system supports sending notifications to additional recipients beyond the primary user who triggered the event. This is useful for administrative notifications, team alerts, or multi-stakeholder notifications.

## Configuration

Additional recipients are configured via environment variables in your `.env` file. Each notification type can have its own list of additional recipients.

### Environment Variables

Add the following to your `.env` file:

```env
# Payment Created Notifications - Additional Recipients
NOTIFICATION_ADDITIONAL_RECIPIENTS_PAYMENT_CREATED=Nerdobioha@yahoo.com,qdubsmusk@gmail.com,Charles.a@tecterminal.com,mercy@cpms.com.ng,Ololade.o@tecterminal.com

# Course Registration Notifications - Additional Recipients
NOTIFICATION_ADDITIONAL_RECIPIENTS_COURSE_REGISTERED=Nerdobioha@yahoo.com,qdubsmusk@gmail.com,willy.i@tecterminal.com,Charles.a@tecterminal.com,idoro.o@tecterminal.com,mercy@cpms.com.ng,francis.a@cpms.com.ng,Ololade.o@tecterminal.com

# Student Registration Notifications - Additional Recipients
NOTIFICATION_ADDITIONAL_RECIPIENTS_STUDENT_REGISTERED=email1@example.com,email2@example.com

# Payment Received Notifications - Additional Recipients (Optional)
NOTIFICATION_ADDITIONAL_RECIPIENTS_PAYMENT_RECEIVED=email1@example.com,email2@example.com

# Payment Due Notifications - Additional Recipients (Optional)
NOTIFICATION_ADDITIONAL_RECIPIENTS_PAYMENT_DUE=email1@example.com,email2@example.com
```

## Format

- **Comma-separated**: Multiple email addresses should be separated by commas
- **No spaces required**: Spaces around commas are automatically trimmed
- **Case-insensitive**: Email addresses are compared case-insensitively
- **Validation**: Invalid email addresses are automatically filtered out

## How It Works

1. When a notification event is triggered (e.g., payment created, student registered), the system:
   - Sends the notification to the primary user (as before)
   - Checks for additional recipients configured for that event type
   - Sends a copy of the notification to each additional recipient

2. **Duplicate Prevention**: If an additional recipient's email matches the primary user's email, they will not receive a duplicate notification.

3. **Tracking**: Each additional recipient gets their own notification channel record for tracking delivery status.

## Supported Notification Types

- `STUDENT_REGISTERED` - When a new student is registered
- `PAYMENT_CREATED` - When a payment is created
- `COURSE_REGISTERED` - When a student enrolls in a course
- `PAYMENT_RECEIVED` - When a payment is received
- `PAYMENT_DUE` - When a payment is due

## Example Configuration

```env
# Example: Send payment notifications to finance team
NOTIFICATION_ADDITIONAL_RECIPIENTS_PAYMENT_CREATED=finance@tecterminal.com,accounting@tecterminal.com

# Example: Send course registration to admissions team
NOTIFICATION_ADDITIONAL_RECIPIENTS_COURSE_REGISTERED=admissions@tecterminal.com,manager@tecterminal.com

# Example: Send student registration to admin team
NOTIFICATION_ADDITIONAL_RECIPIENTS_STUDENT_REGISTERED=admin@tecterminal.com,registrar@tecterminal.com
```

## Current Configuration (Based on Requirements)

Based on your requirements, here's the recommended configuration:

```env
# Payment Created Notifications
NOTIFICATION_ADDITIONAL_RECIPIENTS_PAYMENT_CREATED=Nerdobioha@yahoo.com,qdubsmusk@gmail.com,Charles.a@tecterminal.com,mercy@cpms.com.ng,Ololade.o@tecterminal.com

# Course Registration Notifications
NOTIFICATION_ADDITIONAL_RECIPIENTS_COURSE_REGISTERED=Nerdobioha@yahoo.com,qdubsmusk@gmail.com,willy.i@tecterminal.com,Charles.a@tecterminal.com,idoro.o@tecterminal.com,mercy@cpms.com.ng,francis.a@cpms.com.ng,Ololade.o@tecterminal.com

# Student Registration Notifications
# Add your student registration recipients here when you have the complete list
NOTIFICATION_ADDITIONAL_RECIPIENTS_STUDENT_REGISTERED=
```

## Notes

- **No Database Changes Required**: This feature uses environment variables only, no database migration needed
- **Immediate Effect**: Changes to environment variables take effect after restarting the application
- **Privacy**: Additional recipients receive the same notification content as the primary user
- **Logging**: The system logs when additional recipients are being notified for debugging purposes

## Troubleshooting

### Not Receiving Additional Recipient Emails

1. **Check Environment Variables**: Ensure the variable name matches exactly (case-sensitive)
2. **Verify Email Format**: Ensure emails are valid and comma-separated
3. **Check Logs**: Look for log messages indicating additional recipients are being processed
4. **Email Service**: Ensure your email service (SMTP/SendGrid) is properly configured
5. **Queue Processing**: Ensure the notification queue processor is running

### Testing

To test additional recipients:

1. Add a test email to the environment variable
2. Trigger the corresponding event (e.g., create a payment)
3. Check the notification queue and email delivery logs
4. Verify the test email received the notification












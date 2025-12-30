# Notification System Debugging Guide

## Issue: Emails Not Sending for Payment Created Events

### What Was Fixed

1. **Event Emission**: Payment events now always emit, even if student has no user account
2. **Notification Service**: Now handles admin notifications even without user accounts
3. **Comprehensive Logging**: Added detailed logging throughout the notification flow

### Debugging Steps

#### 1. Check Application Logs

When you create a payment, you should see these logs in sequence:

```
[STUDENT SERVICE] Emitting payment.created event for payment [ID] (userId: [ID], studentEmail: [EMAIL])
[STUDENT SERVICE] Event emitted: SUCCESS. Listeners count: 1
[NOTIFICATION LISTENER] Received payment.created event for user [ID], payment ID: [ID]
[NOTIFICATION LISTENER] Payment details: amount=[AMOUNT], student=[NAME]
[NOTIFICATION LISTENER] Calling notificationService.sendNotification...
[NOTIFICATION SERVICE] sendNotification called for event PAYMENT_CREATED, userId: [ID]
[NOTIFICATION SERVICE] Getting additional recipients for event type: PAYMENT_CREATED
[RECIPIENT CONFIG] Getting recipients for PAYMENT_CREATED, envKey: NOTIFICATION_ADDITIONAL_RECIPIENTS_PAYMENT_CREATED, envValue: [SET/NOT SET]
[RECIPIENT CONFIG] Using 4 default recipients for PAYMENT_CREATED: Nerdobioha@yahoo.com, qdubsmusk@gmail.com, Charles.a@tecterminal.com, mercy@cpms.com.ng
[NOTIFICATION SERVICE] Found 4 additional recipients: Nerdobioha@yahoo.com, qdubsmusk@gmail.com, Charles.a@tecterminal.com, mercy@cpms.com.ng
[NOTIFICATION SERVICE] Sending PAYMENT_CREATED notification to 4 additional recipients: ...
[NOTIFICATION SERVICE] Queued email for additional recipient qdubsmusk@gmail.com
[NOTIFICATION PROCESSOR] Processing email job for notification [ID] to qdubsmusk@gmail.com
[NOTIFICATION PROCESSOR] Email sent successfully to qdubsmusk@gmail.com. MessageId: [ID]
```

#### 2. Check Redis Connection

The notification queue requires Redis. Verify it's running:

```bash
redis-cli ping
# Should return: PONG
```

If Redis is not running:
- **Windows**: Start Redis (check if it's running as a service or start manually)
- **Docker**: `docker run -d -p 6379:6379 --name redis redis:alpine`

#### 3. Check Email Configuration

Verify your `.env` file has email configuration:

```env
# Option 1: Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Option 2: SendGrid
SENDGRID_API_KEY=SG.your-key-here
EMAIL_FROM=noreply@tecterminal.com
```

Check application startup logs for:
```
Email service initialized with SMTP (smtp.gmail.com:587, from: your-email@gmail.com)
# OR
Email service initialized with SendGrid (from: noreply@tecterminal.com)
```

If you see:
```
Email service not configured. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS or SENDGRID_API_KEY in .env file.
```

Then your email configuration is missing or incorrect.

#### 4. Check Queue Processing

Check if jobs are in the queue:

```bash
redis-cli
> LLEN bull:notifications:waiting
> LLEN bull:notifications:active
> LLEN bull:notifications:completed
> LLEN bull:notifications:failed
```

If `waiting` has jobs but they're not processing, the queue worker might not be running.

#### 5. Common Issues

**Issue: "No listeners registered for 'payment.created' event"**
- **Cause**: NotificationListener not registered
- **Fix**: Ensure NotificationModule is imported in AppModule (it should be)

**Issue: Event emitted but listener not receiving**
- **Cause**: EventEmitter not properly configured
- **Fix**: Check EventEmitterModule.forRoot() in AppModule

**Issue: Recipients found but emails not queued**
- **Cause**: Notification service error
- **Fix**: Check logs for error messages

**Issue: Emails queued but not sent**
- **Cause**: Redis not running or queue processor not working
- **Fix**: Start Redis and restart application

**Issue: "Email service not configured"**
- **Cause**: Missing or incorrect email configuration
- **Fix**: Check .env file and restart application

### Testing

1. **Create a test payment** via the API
2. **Watch the logs** for the sequence above
3. **Check your email** (including spam folder)
4. **Check database**:
   ```sql
   SELECT * FROM "Notification" 
   WHERE type = 'PAYMENT_CREATED' 
   ORDER BY "createdAt" DESC 
   LIMIT 5;

   SELECT * FROM "NotificationChannel" 
   WHERE channel = 'EMAIL' 
   ORDER BY "createdAt" DESC 
   LIMIT 10;
   ```

### Next Steps

If emails still aren't sending after checking all above:

1. Share the complete log output when creating a payment
2. Verify Redis is running: `redis-cli ping`
3. Verify email config is loaded: Check startup logs
4. Check for any error messages in logs






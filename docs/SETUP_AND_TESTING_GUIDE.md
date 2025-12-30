# Setup and Testing Guide - Notifications & File Uploads

This comprehensive guide covers setting up and testing notifications and file uploads in both local development and production environments.

---

## Table of Contents

1. [Local Setup - Notifications](#local-setup---notifications)
2. [Local Testing - Notifications](#local-testing---notifications)
3. [Local Setup - File Uploads](#local-setup---file-uploads)
4. [Local Testing - File Uploads](#local-testing---file-uploads)
5. [Production Setup - Notifications](#production-setup---notifications)
6. [Production Setup - File Uploads](#production-setup---file-uploads)
7. [Troubleshooting](#troubleshooting)

---

## Local Setup - Notifications

### Prerequisites

- Node.js and npm installed
- PostgreSQL database running
- Redis server (required for notification queue)

### Step 1: Install and Start Redis

#### Windows

**Option A: Using Docker (Recommended)**

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Option B: Using WSL (Windows Subsystem for Linux)**

```bash
# In WSL terminal
sudo apt-get update
sudo apt-get install redis-server
redis-server
```

**Option C: Using Chocolatey**

```bash
choco install redis-64
redis-server
```

#### macOS

```bash
# Using Homebrew
brew install redis
brew services start redis

# Or run manually
redis-server
```

#### Linux

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
# Or run manually
redis-server
```

**Verify Redis is running:**

```bash
redis-cli ping
# Should return: PONG
```

### Step 2: Configure Email (Local Development)

For local development, Gmail is the easiest option:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Add to `.env` file:**

```env
# Email Configuration (Gmail for Local)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

### Step 3: Configure SMS (Optional - Local Development)

For local testing, you can use Twilio's free trial:

1. **Sign up for Twilio:**
   - Go to: https://www.twilio.com/try-twilio
   - Create a free account (includes $15.50 credit)

2. **Get Credentials:**
   - Log into: https://console.twilio.com
   - Copy Account SID and Auth Token from dashboard

3. **Get a Phone Number:**
   - Go to: Phone Numbers → Manage → Buy a number
   - Get a free trial number

4. **Add to `.env` file:**

```env
# SMS Configuration (Twilio - Optional for Local)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
```

**Note:** Trial accounts can only send to verified phone numbers. Verify your test numbers in Twilio console.

### Step 4: Configure Redis Connection

Add to `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Step 5: Complete Environment Variables

Your complete `.env` file should include:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tec_terminal_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email (Gmail for Local)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# SMS (Twilio - Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Application
NODE_ENV=development
PORT=8000
```

### Step 6: Install Dependencies

```bash
npm install
```

### Step 7: Run Database Migrations

```bash
npx prisma migrate dev
```

### Step 8: Start the Application

```bash
npm run start:dev
```

**Check logs for:**

- ✅ "Redis connected successfully"
- ✅ "Email service initialized with SMTP"
- ✅ "SMS service initialized with Twilio" (if configured)

---

## Local Testing - Notifications

### Test 1: Verify Redis Connection

```bash
# In a new terminal
redis-cli
> PING
# Should return: PONG
> KEYS *
# Should show notification queue keys when notifications are processed
```

### Test 2: Test In-App Notifications

1. **Register a new student** (triggers `student.registered` event)
2. **Check database:**

```sql
SELECT * FROM "Notification"
ORDER BY "createdAt" DESC
LIMIT 5;
```

3. **Check notification channels:**

```sql
SELECT * FROM "NotificationChannel"
WHERE channel = 'IN_APP'
ORDER BY "createdAt" DESC
LIMIT 5;
```

4. **Test API endpoint:**

```bash
# Get notifications (requires authentication)
curl -X GET http://localhost:8000/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Test Email Notifications

1. **Ensure email is configured** in `.env`
2. **Register a student** or **create a payment**
3. **Check logs** for:
   ```
   Email sent successfully to: user@example.com
   ```
4. **Check your email inbox** (and spam folder)
5. **Verify in database:**

```sql
SELECT * FROM "NotificationChannel"
WHERE channel = 'EMAIL'
ORDER BY "createdAt" DESC
LIMIT 5;
```

### Test 4: Test SMS Notifications

1. **Ensure Twilio is configured** in `.env`
2. **Verify recipient phone number** in Twilio console (for trial accounts)
3. **Register a student** or **create a payment**
4. **Check logs** for:
   ```
   SMS sent successfully to: +1234567890
   ```
5. **Check your phone** for SMS
6. **Verify in database:**

```sql
SELECT * FROM "NotificationChannel"
WHERE channel = 'SMS'
ORDER BY "createdAt" DESC
LIMIT 5;
```

### Test 5: Test Notification Preferences

```bash
# Get user preferences
curl -X GET http://localhost:8000/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update preferences
curl -X POST http://localhost:8000/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": true,
    "sms": false,
    "inApp": true
  }'
```

### Test 6: Monitor Queue Processing

```bash
# Check Redis queue
redis-cli
> LLEN bull:notifications:waiting
> LLEN bull:notifications:active
> LLEN bull:notifications:completed
> LLEN bull:notifications:failed
```

---

## Local Setup - File Uploads

### Prerequisites

- AWS Account (free tier available)
- AWS S3 bucket

### Step 1: Create AWS Account

1. **Sign up:** https://aws.amazon.com/
2. **Complete account setup** (credit card may be required, but free tier is available)

### Step 2: Create S3 Bucket

1. **Go to AWS S3 Console:** https://console.aws.amazon.com/s3/
2. **Click "Create bucket"**
3. **Configure bucket:**
   - **Bucket name:** `tec-terminal-uploads-dev` (must be globally unique)
   - **Region:** Choose closest region (e.g., `us-east-1`)
   - **Block Public Access:** Uncheck if you want public URLs (or configure CORS)
   - **Versioning:** Optional (enable for production)
   - Click **"Create bucket"**

### Step 3: Create IAM User for S3 Access

1. **Go to IAM Console:** https://console.aws.amazon.com/iam/
2. **Click "Users" → "Add users"**
3. **User name:** `tec-terminal-s3-user`
4. **Access type:** "Programmatic access"
5. **Click "Next: Permissions"**
6. **Attach policies:** Select "AmazonS3FullAccess" (or create custom policy with minimal permissions)
7. **Click "Next" → "Create user"**
8. **Save credentials:**
   - Access Key ID
   - Secret Access Key (only shown once!)

### Step 4: Configure S3 Bucket CORS (Optional)

If uploading from browser directly:

1. **Go to your S3 bucket → Permissions → CORS**
2. **Add CORS configuration:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:3000", "http://localhost:8000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Step 5: Configure Environment Variables

Add to `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=tec-terminal-uploads-dev
```

### Step 6: Install AWS SDK (Already in package.json)

The `@aws-sdk/client-s3` package should already be installed. Verify:

```bash
npm list @aws-sdk/client-s3
```

### Step 7: Verify Database Schema

Ensure the `File` model exists in Prisma schema:

```bash
npx prisma migrate dev
```

---

## Local Testing - File Uploads

### Test 1: Verify AWS Configuration

Check logs when starting the application:

```
FileService - AWS credentials configured
```

If you see a warning, verify your `.env` variables.

### Test 2: Upload Payment Receipt

```bash
# Using curl
curl -X POST http://localhost:8000/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/receipt.pdf" \
  -F "studentId=clx1234567890" \
  -F "fileType=payment_receipt"
```

**Expected Response:**

```json
{
  "id": "file-uuid",
  "studentId": "clx1234567890",
  "fileName": "receipt.pdf",
  "fileType": "payment_receipt",
  "fileUrl": "https://bucket.s3.region.amazonaws.com/path/to/file.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "uploadedBy": "user-uuid",
  "uploadedAt": "2025-01-15T10:00:00Z"
}
```

### Test 3: Upload Profile Image

```bash
curl -X POST http://localhost:8000/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "studentId=clx1234567890" \
  -F "fileType=profile_image"
```

### Test 4: Get Student Files

```bash
curl -X GET http://localhost:8000/files/student/clx1234567890 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**With file type filter:**

```bash
curl -X GET "http://localhost:8000/files/student/clx1234567890?fileType=payment_receipt" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 5: Verify File in S3

1. **Go to AWS S3 Console**
2. **Open your bucket**
3. **Navigate to:** `students/{studentId}/{fileType}/`
4. **Verify file exists**

### Test 6: Verify Database Record

```sql
SELECT * FROM "File"
WHERE "studentId" = 'clx1234567890'
ORDER BY "uploadedAt" DESC;
```

### Test 7: Test File Validation

**Test invalid file type:**

```bash
curl -X POST http://localhost:8000/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.docx" \
  -F "studentId=clx1234567890" \
  -F "fileType=payment_receipt"
# Should return 400 Bad Request
```

**Test file too large:**

```bash
# Create a 6MB file (exceeds 5MB limit)
# Should return 400 Bad Request
```

### Test 8: Test File URL Access

1. **Copy fileUrl from response**
2. **Open in browser** (if bucket is public)
3. **Or use AWS CLI:**

```bash
aws s3 cp s3://bucket-name/path/to/file.pdf ./downloaded-file.pdf
```

---

## Production Setup - Notifications

### Step 1: Setup Redis (Production)

#### Option A: Managed Redis Service (Recommended)

**AWS ElastiCache:**

1. Go to AWS ElastiCache Console
2. Create Redis cluster
3. Configure security groups
4. Get connection endpoint

**Redis Cloud:**

1. Sign up: https://redis.com/try-free/
2. Create database
3. Get connection details

**Other Options:**

- DigitalOcean Managed Redis
- Azure Cache for Redis
- Google Cloud Memorystore

#### Option B: Self-Hosted Redis

```bash
# On your server
sudo apt-get install redis-server
sudo systemctl enable redis
sudo systemctl start redis

# Configure firewall
sudo ufw allow 6379/tcp
```

### Step 2: Configure Production Email

#### Recommended: SendGrid

1. **Sign up:** https://sendgrid.com
2. **Verify domain** or use single sender verification
3. **Create API key** with "Mail Send" permissions
4. **Add to production `.env`:**

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

#### Alternative: AWS SES

1. **Go to AWS SES Console**
2. **Verify email/domain**
3. **Create SMTP credentials**
4. **Move out of sandbox** (request production access)
5. **Add to production `.env`:**

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-ses-smtp-username
EMAIL_PASS=your-ses-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

### Step 3: Configure Production SMS

1. **Upgrade Twilio account** (if using trial)
2. **Get production phone number**
3. **Add to production `.env`:**

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-production-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 4: Production Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@prod-db-host:5432/tec_terminal_db

# Redis (Production)
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Email (Production - SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# SMS (Production - Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-production-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Application
NODE_ENV=production
PORT=8000
```

### Step 5: Update Docker Compose (If Using)

Add Redis service to `docker-compose.yaml`:

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    networks:
      - app-network
    restart: unless-stopped

  # ... other services

volumes:
  redis-data:
```

### Step 6: Security Best Practices

1. **Use environment variables** (never hardcode credentials)
2. **Enable Redis AUTH** (set password)
3. **Use SSL/TLS** for Redis connection (if supported)
4. **Restrict Redis access** (firewall rules)
5. **Rotate credentials** periodically
6. **Monitor usage** and set up alerts

---

## Production Setup - File Uploads

### Step 1: Create Production S3 Bucket

1. **Go to AWS S3 Console**
2. **Create bucket:**
   - **Name:** `tec-terminal-uploads-prod` (globally unique)
   - **Region:** Choose closest to your users
   - **Versioning:** Enable
   - **Encryption:** Enable (SSE-S3 or SSE-KMS)
   - **Block Public Access:** Configure based on needs
   - **Lifecycle rules:** Set up for old file cleanup

### Step 2: Configure IAM Policy (Least Privilege)

Create custom IAM policy for S3 access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::tec-terminal-uploads-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::tec-terminal-uploads-prod"
    }
  ]
}
```

### Step 3: Configure S3 Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tec-terminal-uploads-prod/*"
    }
  ]
}
```

**Note:** Adjust based on your security requirements. Consider using CloudFront for public access.

### Step 4: Configure CORS (If Needed)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Step 5: Enable S3 Versioning

1. **Go to bucket → Properties → Versioning**
2. **Enable versioning** (helps with recovery)

### Step 6: Set Up Lifecycle Rules

1. **Go to bucket → Management → Lifecycle rules**
2. **Create rule:**
   - **Name:** `Delete old files`
   - **Scope:** All objects
   - **Actions:** Delete objects after 365 days (or as needed)

### Step 7: Production Environment Variables

```env
# AWS S3 Configuration (Production)
AWS_ACCESS_KEY_ID=your-production-access-key
AWS_SECRET_ACCESS_KEY=your-production-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=tec-terminal-uploads-prod
```

### Step 8: Use IAM Roles (Recommended for AWS)

If running on AWS (EC2, ECS, Lambda), use IAM roles instead of access keys:

1. **Create IAM role** with S3 permissions
2. **Attach to EC2 instance/ECS task**
3. **Remove AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY** from `.env`
4. **SDK will automatically use IAM role**

### Step 9: Set Up CloudFront (Optional but Recommended)

1. **Create CloudFront distribution**
2. **Origin:** Your S3 bucket
3. **Enable HTTPS**
4. **Configure caching**
5. **Update file URLs** to use CloudFront domain

### Step 10: Security Best Practices

1. **Enable bucket encryption** (SSE-S3 or SSE-KMS)
2. **Use IAM roles** instead of access keys when possible
3. **Enable MFA delete** for bucket
4. **Set up CloudTrail** for audit logging
5. **Configure bucket logging**
6. **Use presigned URLs** for temporary access (if needed)
7. **Implement file scanning** (malware detection)
8. **Set up monitoring** and alerts

---

## Troubleshooting

### Notifications

#### Redis Connection Failed

**Symptoms:**

- `Error: connect ECONNREFUSED 127.0.0.1:6379`
- Notifications not processing

**Solutions:**

1. Verify Redis is running: `redis-cli ping`
2. Check `REDIS_HOST` and `REDIS_PORT` in `.env`
3. Check firewall rules
4. Verify Redis password (if set)

#### Email Not Sending

**Symptoms:**

- No email received
- Error in logs: "Email service not configured"

**Solutions:**

1. Verify all `EMAIL_*` variables are set
2. For Gmail: Use App Password, not regular password
3. Check spam folder
4. Verify SMTP credentials
5. Check email service logs

#### SMS Not Sending

**Symptoms:**

- No SMS received
- Error: "SMS service not configured"

**Solutions:**

1. Verify all `TWILIO_*` variables are set
2. Check phone number format (must include country code)
3. For trial accounts: Verify recipient number in Twilio console
4. Check Twilio account balance
5. Review Twilio console for errors

#### Notifications Not Appearing in Database

**Solutions:**

1. Check if events are being emitted
2. Verify notification listener is registered
3. Check queue processing: `redis-cli LLEN bull:notifications:waiting`
4. Review application logs for errors

### File Uploads

#### AWS Credentials Error

**Symptoms:**

- `FileService - AWS credentials not configured`
- Upload fails with authentication error

**Solutions:**

1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
2. Check credentials are valid (not expired)
3. Verify IAM user has S3 permissions
4. Check for typos in `.env` file

#### S3 Upload Fails

**Symptoms:**

- `Failed to upload file to S3`
- 403 Forbidden error

**Solutions:**

1. Verify bucket name is correct
2. Check IAM permissions
3. Verify bucket exists and is accessible
4. Check bucket policy allows uploads
5. Verify region matches bucket region

#### File URL Not Accessible

**Symptoms:**

- File uploaded but URL returns 403

**Solutions:**

1. Check bucket Block Public Access settings
2. Verify bucket policy allows public read (if needed)
3. Check CORS configuration
4. Consider using presigned URLs for private files

#### File Validation Errors

**Symptoms:**

- `Invalid file type` or `File size exceeds maximum`

**Solutions:**

1. Check file type is allowed (PDF, JPG, PNG)
2. Verify file size is under 5MB
3. Check MIME type matches file extension
4. Review validation logic in `FileService.validateFile()`

---

## Quick Reference

### Environment Variables Checklist

#### Local Development

```env
# Required
DATABASE_URL=...
REDIS_HOST=localhost
REDIS_PORT=6379
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=...

# Optional
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

#### Production

```env
# Required
DATABASE_URL=...
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=...
SENDGRID_API_KEY=... (or EMAIL_HOST/EMAIL_USER/EMAIL_PASS)
EMAIL_FROM=...
AWS_ACCESS_KEY_ID=... (or use IAM role)
AWS_SECRET_ACCESS_KEY=... (or use IAM role)
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=...

# Optional
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

### Testing Checklist

#### Notifications

- [ ] Redis is running and accessible
- [ ] Email service initialized (check logs)
- [ ] SMS service initialized (if configured)
- [ ] In-app notifications appear in database
- [ ] Email notifications are sent and received
- [ ] SMS notifications are sent and received (if configured)
- [ ] Notification preferences work
- [ ] Queue processing works (check Redis)

#### File Uploads

- [ ] AWS credentials configured
- [ ] S3 bucket exists and is accessible
- [ ] Payment receipt upload works
- [ ] Profile image upload works
- [ ] File validation works (type and size)
- [ ] Files appear in S3 bucket
- [ ] Database records created correctly
- [ ] File URLs are accessible

---

## Additional Resources

- **Notification System Guide:** `docs/NOTIFICATION_SYSTEM_GUIDE.md`
- **Email Configuration:** `docs/EMAIL_CONFIGURATION_GUIDE.md`
- **SMS Configuration:** `docs/SMS_CONFIGURATION_GUIDE.md`
- **File Upload Implementation:** `docs/FILE_UPLOAD_IMPLEMENTATION.md`

---

## Support

If you encounter issues:

1. Check application logs for specific error messages
2. Verify all environment variables are set correctly
3. Test each service independently (Redis, Email, SMS, S3)
4. Review database records for notification/file entries
5. Check service provider dashboards (Twilio, SendGrid, AWS)





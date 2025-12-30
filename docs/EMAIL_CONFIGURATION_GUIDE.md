# Email Configuration Guide

## Overview

The notification system supports two email delivery methods:

1. **SMTP** (Standard email server) - Recommended for most use cases
2. **SendGrid** (API-based) - Recommended for production/high volume

## Option 1: Gmail (Quick Start / Development)

### Configuration

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password  # NOT your regular password!
EMAIL_FROM=your-email@gmail.com
```

### Setup Steps

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
   - Use this as `EMAIL_PASS`

### Limitations

- ⚠️ Gmail has sending limits (~500 emails/day for free accounts)
- ⚠️ Not recommended for production
- ✅ Good for development/testing

---

## Option 2: SendGrid (Recommended for Production)

### Configuration

```env
# Option A: Use SendGrid API (Recommended)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option B: Use SendGrid SMTP
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@tecterminal.com
```

### Setup Steps

1. Sign up at: https://sendgrid.com
2. Verify your domain or use single sender verification
3. Create an API key with "Mail Send" permissions
4. Use the API key as `SENDGRID_API_KEY` (preferred) or `EMAIL_PASS`

### Benefits

- ✅ Free tier: 100 emails/day
- ✅ High deliverability
- ✅ Analytics and tracking
- ✅ Scalable for production

---

## Option 3: AWS SES (Amazon Simple Email Service)

### Configuration

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com  # Use your region
EMAIL_PORT=587
EMAIL_USER=your-ses-smtp-username
EMAIL_PASS=your-ses-smtp-password
EMAIL_FROM=noreply@tecterminal.com
```

### Setup Steps

1. Create AWS account
2. Go to AWS SES console
3. Verify your email/domain
4. Create SMTP credentials
5. Move out of sandbox mode (if needed)

### Benefits

- ✅ Very cost-effective ($0.10 per 1,000 emails)
- ✅ High deliverability
- ✅ Enterprise-grade reliability
- ✅ Good for high volume

### Regions

- `us-east-1`: `email-smtp.us-east-1.amazonaws.com`
- `us-west-2`: `email-smtp.us-west-2.amazonaws.com`
- `eu-west-1`: `email-smtp.eu-west-1.amazonaws.com`
- Check AWS docs for your region

---

## Option 4: Mailgun

### Configuration

```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASS=your-mailgun-smtp-password
EMAIL_FROM=noreply@your-domain.com
```

### Setup Steps

1. Sign up at: https://mailgun.com
2. Verify your domain
3. Get SMTP credentials from dashboard
4. Use sandbox domain for testing

### Benefits

- ✅ Free tier: 5,000 emails/month
- ✅ Good deliverability
- ✅ Easy setup

---

## Option 5: Microsoft 365 / Outlook

### Configuration

```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-password
EMAIL_FROM=your-email@yourdomain.com
```

### Setup Steps

1. Use your Microsoft 365 account
2. May require app password if MFA is enabled
3. Ensure SMTP is enabled for your account

---

## Option 6: Custom SMTP Server

If you have your own email server:

```env
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com
```

### Port Options

- **587**: STARTTLS (recommended)
- **465**: SSL/TLS
- **25**: Plain (not recommended, often blocked)

---

## Quick Reference Table

| Provider | Host                            | Port | Free Tier     | Best For    |
| -------- | ------------------------------- | ---- | ------------- | ----------- |
| Gmail    | smtp.gmail.com                  | 587  | 500/day       | Development |
| SendGrid | smtp.sendgrid.net               | 587  | 100/day       | Production  |
| AWS SES  | email-smtp.region.amazonaws.com | 587  | Pay-as-you-go | High Volume |
| Mailgun  | smtp.mailgun.org                | 587  | 5,000/month   | Production  |
| Outlook  | smtp.office365.com              | 587  | Varies        | Business    |

---

## Recommended Setup by Use Case

### Development / Testing

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-dev-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-dev-email@gmail.com
```

### Production (Small to Medium)

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@tecterminal.com
```

### Production (High Volume)

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-ses-username
EMAIL_PASS=your-ses-password
EMAIL_FROM=noreply@tecterminal.com
```

---

## Testing Your Configuration

### 1. Check Environment Variables

```bash
# Make sure these are set in your .env file
cat .env | grep EMAIL
```

### 2. Test Email Sending

Create a test endpoint or use the notification system:

```typescript
// The system will automatically try to send emails when:
// - A student registers
// - A payment is created
// - A course is registered
```

### 3. Check Logs

```bash
# Look for these log messages:
# "Email service initialized with SMTP"
# "Email sent successfully to..."
```

### 4. Verify in Database

```sql
SELECT * FROM "NotificationChannel"
WHERE channel = 'EMAIL'
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## Troubleshooting

### "Email service not configured"

- ✅ Check all EMAIL\_\* variables are set
- ✅ Verify no typos in variable names
- ✅ Ensure .env file is loaded

### "Authentication failed"

- ✅ Verify username/password are correct
- ✅ For Gmail: Use App Password, not regular password
- ✅ Check if 2FA is enabled (requires app password)

### "Connection timeout"

- ✅ Check firewall settings
- ✅ Verify port is correct (587 or 465)
- ✅ Try different port if 587 is blocked

### "Emails not sending"

- ✅ Check notification channel status in database
- ✅ Review processor logs for specific errors
- ✅ Verify EMAIL_FROM is a valid sender address
- ✅ Check spam folder

### Gmail Specific Issues

- ✅ Must use App Password (not regular password)
- ✅ Enable "Less secure app access" (if not using app password)
- ✅ Check daily sending limits

---

## Security Best Practices

1. **Never commit credentials to git**
   - Use `.env` file (already in .gitignore)
   - Use environment variables in production

2. **Use App Passwords**
   - Don't use your main account password
   - Generate app-specific passwords

3. **Rotate Credentials**
   - Change passwords periodically
   - Revoke old API keys

4. **Use API Keys (when available)**
   - SendGrid API key > SMTP password
   - More secure and easier to manage

---

## Production Checklist

- [ ] Use a production email service (SendGrid, AWS SES, etc.)
- [ ] Verify your sending domain
- [ ] Set up SPF/DKIM records
- [ ] Configure bounce handling
- [ ] Set up monitoring/alerts
- [ ] Test email delivery
- [ ] Monitor sending limits
- [ ] Set up email templates
- [ ] Configure unsubscribe links (if needed)

---

## Need Help?

- Check application logs for specific error messages
- Review notification channel status in database
- Test with a simple email first
- Verify credentials with email provider's test tool











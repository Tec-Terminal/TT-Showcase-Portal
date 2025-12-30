# SMS Configuration Guide (Twilio)

## Overview

The notification system uses **Twilio** for SMS delivery. Twilio is a cloud communications platform that provides reliable SMS messaging services.

## Quick Start

### Configuration

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
```

### Setup Steps

1. **Sign up for Twilio**
   - Go to: https://www.twilio.com/try-twilio
   - Create a free account (includes $15.50 credit)

2. **Get Your Credentials**
   - Log into Twilio Console: https://console.twilio.com
   - Find your **Account SID** and **Auth Token** on the dashboard
   - Copy these values to your `.env` file

3. **Get a Phone Number**
   - Go to: Phone Numbers → Manage → Buy a number
   - Choose a number (free for trial accounts)
   - Copy the phone number (with country code, e.g., +1234567890)

4. **Configure Environment Variables**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token-here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

---

## Detailed Setup Instructions

### Step 1: Create Twilio Account

1. Visit https://www.twilio.com/try-twilio
2. Fill in your details:
   - Email address
   - Password
   - Phone number (for verification)
3. Verify your email and phone number
4. Complete the onboarding process

### Step 2: Get Account Credentials

1. Log into Twilio Console: https://console.twilio.com
2. On the dashboard, you'll see:
   - **Account SID**: Starts with `AC` (e.g., `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token**: Click "show" to reveal (e.g., `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

3. **Security Note**: 
   - Never share your Auth Token publicly
   - Keep it secure in your `.env` file
   - Regenerate if compromised

### Step 3: Get a Phone Number

#### Option A: Use Trial Number (Free)

1. Go to: Phone Numbers → Manage → Buy a number
2. Click "Get a number"
3. Select:
   - **Country**: Your country
   - **Capabilities**: Check "SMS"
   - **Number Type**: Mobile or Local
4. Click "Search" and choose a number
5. Click "Buy" (free for trial accounts)

#### Option B: Use Existing Number

If you already have a Twilio number:
1. Go to: Phone Numbers → Manage → Active numbers
2. Copy the phone number (include country code)
3. Use this number as `TWILIO_PHONE_NUMBER`

### Step 4: Configure Environment Variables

Add to your `.env` file:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important Notes:**
- Phone number must include country code (e.g., `+1` for US)
- No spaces or dashes in the phone number
- Account SID starts with `AC`
- Auth Token is case-sensitive

---

## Testing Your Configuration

### 1. Check Environment Variables

```bash
# Verify variables are set
cat .env | grep TWILIO
```

### 2. Test SMS Sending

The system will automatically send SMS when:
- A student registers
- A payment is created
- A course is registered

### 3. Check Logs

Look for these log messages:
```
"SMS service initialized with Twilio"
"SMS sent successfully to..."
```

### 4. Verify in Database

```sql
SELECT * FROM "NotificationChannel" 
WHERE channel = 'SMS' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### 5. Manual Test (Optional)

You can test directly using Twilio's API:

```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json \
  --data-urlencode "From=+1234567890" \
  --data-urlencode "To=+0987654321" \
  --data-urlencode "Body=Test message" \
  -u {AccountSid}:{AuthToken}
```

---

## Twilio Account Types

### Trial Account (Free)

**Limitations:**
- ⚠️ Can only send SMS to **verified phone numbers**
- ⚠️ $15.50 credit included
- ⚠️ Messages include "Sent from a Twilio trial account"
- ✅ Good for development/testing

**To Verify Numbers:**
1. Go to: Phone Numbers → Manage → Verified Caller IDs
2. Add phone numbers you want to test with
3. Verify via phone call or SMS

### Paid Account

**Benefits:**
- ✅ Send to any phone number
- ✅ No "trial account" message
- ✅ Higher sending limits
- ✅ Production-ready

**Upgrade Steps:**
1. Go to: Billing → Upgrade
2. Add payment method
3. Account is upgraded immediately

---

## Phone Number Format

### Correct Format

```env
# US Number
TWILIO_PHONE_NUMBER=+15551234567

# UK Number
TWILIO_PHONE_NUMBER=+447911123456

# Nigeria Number
TWILIO_PHONE_NUMBER=+2348012345678
```

### Incorrect Format

```env
# ❌ Missing country code
TWILIO_PHONE_NUMBER=5551234567

# ❌ Spaces or dashes
TWILIO_PHONE_NUMBER=+1 555-123-4567

# ❌ Parentheses
TWILIO_PHONE_NUMBER=+1 (555) 123-4567
```

**Rule**: Always use E.164 format: `+[country code][number]`

---

## Pricing Information

### Twilio SMS Pricing (US)

| Country | Price per SMS |
|---------|---------------|
| United States | $0.0075 per message |
| United Kingdom | £0.04 per message |
| Canada | $0.0075 per message |
| Nigeria | ₦2.50 per message |

**Note**: Prices vary by country. Check Twilio's pricing page for your region.

### Free Tier

- **Trial Account**: $15.50 credit (approximately 2,000 US SMS)
- **No monthly fee**
- **Pay-as-you-go** after credit is used

### Cost Estimation

For 1,000 notifications/month:
- US: ~$7.50/month
- UK: ~£40/month
- Nigeria: ~₦2,500/month

---

## Troubleshooting

### "SMS service not configured"

**Solutions:**
- ✅ Check all `TWILIO_*` variables are set in `.env`
- ✅ Verify no typos in variable names
- ✅ Ensure `.env` file is loaded
- ✅ Restart the application after adding variables

### "Authentication failed"

**Solutions:**
- ✅ Verify Account SID starts with `AC`
- ✅ Check Auth Token is correct (case-sensitive)
- ✅ Ensure no extra spaces in credentials
- ✅ Regenerate Auth Token if needed

### "Invalid phone number"

**Solutions:**
- ✅ Phone number must include country code (e.g., `+1`)
- ✅ Remove spaces, dashes, parentheses
- ✅ Use E.164 format: `+[country][number]`
- ✅ Verify number is active in Twilio console

### "SMS not sending"

**Solutions:**
- ✅ Check notification channel status in database
- ✅ Review processor logs for specific errors
- ✅ Verify phone number format
- ✅ Check Twilio account balance
- ✅ Ensure recipient number is verified (trial accounts)

### "Trial account restrictions"

**Solutions:**
- ✅ Verify recipient phone number in Twilio console
- ✅ Upgrade to paid account for production
- ✅ Add verified caller IDs for testing

### "Insufficient balance"

**Solutions:**
- ✅ Check account balance in Twilio console
- ✅ Add payment method
- ✅ Top up account balance

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 21211 | Invalid 'To' phone number | Check phone number format |
| 21608 | Unsubscribed recipient | Remove from block list |
| 21610 | Unsubscribed recipient | Remove from block list |
| 30003 | Unreachable destination | Verify phone number is valid |
| 30004 | Message blocked | Check Twilio console for blocks |
| 30005 | Unknown destination | Verify phone number exists |
| 30006 | Landline or unreachable | Use mobile number |

---

## Security Best Practices

### 1. **Protect Your Credentials**

```env
# ✅ Good: Store in .env file (not in git)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here

# ❌ Bad: Hardcoded in code
const accountSid = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

### 2. **Use Environment Variables**

- Never commit credentials to git
- Use `.env` file (already in `.gitignore`)
- Use environment variables in production

### 3. **Rotate Credentials**

- Regenerate Auth Token periodically
- Revoke old tokens if compromised
- Use different credentials per environment

### 4. **Monitor Usage**

- Set up usage alerts in Twilio
- Monitor for unusual activity
- Review logs regularly

### 5. **Rate Limiting**

- Implement rate limiting in your application
- Prevent SMS spam
- Respect user preferences

---

## Production Checklist

- [ ] Upgrade from trial to paid account
- [ ] Verify phone number is active
- [ ] Set up usage alerts
- [ ] Configure billing alerts
- [ ] Test SMS delivery
- [ ] Monitor sending rates
- [ ] Set up error monitoring
- [ ] Review Twilio logs
- [ ] Implement rate limiting
- [ ] Add unsubscribe functionality (if needed)

---

## Alternative SMS Providers

If Twilio doesn't meet your needs, here are alternatives:

### 1. AWS SNS (Simple Notification Service)

```env
# Would require code changes to support
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

**Benefits:**
- Very cost-effective
- Integrated with AWS services
- Good for high volume

### 2. MessageBird

```env
MESSAGEBIRD_API_KEY=your-api-key
MESSAGEBIRD_ORIGINATOR=your-number
```

**Benefits:**
- Competitive pricing
- Good global coverage
- Easy integration

### 3. Nexmo (Vonage)

```env
NEXMO_API_KEY=your-api-key
NEXMO_API_SECRET=your-api-secret
```

**Benefits:**
- Good pricing
- Reliable delivery
- Easy setup

**Note**: The current implementation uses Twilio. To use alternatives, you would need to modify the `NotificationProcessor` class.

---

## Testing in Development

### 1. Use Twilio Trial Account

- Free $15.50 credit
- Verify test phone numbers
- Good for development

### 2. Test Phone Numbers

Twilio provides test credentials:
- **Test Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Test Auth Token**: `test`
- **Test Numbers**: Use any number format

**Note**: Test credentials don't send real SMS, but validate your code.

### 3. Verify Numbers

For trial accounts, verify recipient numbers:
1. Go to: Phone Numbers → Manage → Verified Caller IDs
2. Add phone number
3. Verify via call or SMS

---

## Monitoring and Analytics

### Twilio Console

1. **Monitor Usage**
   - Go to: Monitor → Logs → Messaging
   - View sent/received messages
   - Check delivery status

2. **View Analytics**
   - Go to: Monitor → Analytics
   - See delivery rates
   - Track costs

3. **Set Alerts**
   - Go to: Monitor → Alerts
   - Set up usage alerts
   - Configure billing alerts

### Application Monitoring

Check notification channel status:

```sql
-- Failed SMS notifications
SELECT * FROM "NotificationChannel" 
WHERE channel = 'SMS' 
AND status = 'FAILED'
ORDER BY "createdAt" DESC;

-- SMS delivery statistics
SELECT 
  status,
  COUNT(*) as count
FROM "NotificationChannel"
WHERE channel = 'SMS'
GROUP BY status;
```

---

## Best Practices

### 1. **Message Content**

- Keep messages concise (160 characters for single SMS)
- Include important information
- Use clear language
- Avoid spam triggers

### 2. **Sending Frequency**

- Don't spam users
- Respect user preferences
- Implement rate limiting
- Batch notifications when possible

### 3. **Error Handling**

- Log all failures
- Retry failed messages
- Notify admins of issues
- Track delivery status

### 4. **Cost Management**

- Monitor usage regularly
- Set up billing alerts
- Optimize message content
- Use templates efficiently

### 5. **Compliance**

- Follow local regulations
- Include opt-out instructions
- Respect user preferences
- Handle unsubscribes

---

## Example Configuration

### Development

```env
# .env (Development)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-trial-auth-token
TWILIO_PHONE_NUMBER=+15551234567  # Trial number
```

### Production

```env
# .env (Production)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-production-auth-token
TWILIO_PHONE_NUMBER=+15551234567  # Production number
```

---

## Need Help?

### Twilio Resources

- **Documentation**: https://www.twilio.com/docs
- **Support**: https://support.twilio.com
- **Status Page**: https://status.twilio.com
- **Community**: https://www.twilio.com/community

### Application Issues

- Check application logs for specific errors
- Review notification channel status in database
- Verify Twilio credentials
- Test with Twilio's API directly
- Check Twilio console for account issues

### Common Questions

**Q: Can I use my own phone number?**
A: Yes, you can port your number to Twilio or use a Twilio number.

**Q: How much does it cost?**
A: Prices vary by country. US SMS costs ~$0.0075 per message.

**Q: Can I send to international numbers?**
A: Yes, Twilio supports international SMS to most countries.

**Q: What's the message length limit?**
A: 160 characters for single SMS, longer messages are split automatically.

**Q: How do I handle opt-outs?**
A: Implement unsubscribe functionality and respect user preferences.

---

## Quick Reference

| Setting | Value | Example |
|---------|-------|---------|
| Account SID | Starts with `AC` | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| Auth Token | Case-sensitive string | `your-auth-token-here` |
| Phone Number | E.164 format | `+15551234567` |
| Port | N/A (API-based) | N/A |
| API Endpoint | https://api.twilio.com | N/A |

---

## Summary

1. **Sign up** for Twilio account
2. **Get credentials** from Twilio console
3. **Buy/use** a phone number
4. **Configure** environment variables
5. **Test** SMS sending
6. **Monitor** usage and costs
7. **Upgrade** to paid account for production

The notification system will automatically use Twilio when these environment variables are set!












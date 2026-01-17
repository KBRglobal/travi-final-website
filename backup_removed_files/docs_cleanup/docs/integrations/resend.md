# 📧 Resend Integration

> Email service for newsletters and notifications

---

## 📋 Overview

Resend handles all transactional and marketing emails:
- Newsletter campaigns
- Subscription confirmations
- Lead notifications
- System alerts

---

## ⚙️ Configuration

### Environment Variables

```bash
RESEND_API_KEY=re_your-api-key
LEAD_NOTIFICATION_EMAIL=admin@example.com
```

### Get API Key

1. Go to [resend.com](https://resend.com)
2. Create account
3. Add and verify domain
4. Get API key

---

## 🔌 Usage

### Send Email

```typescript
// server/newsletter.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'newsletter@yourdomain.com',
  to: subscriber.email,
  subject: campaign.subject,
  html: campaign.content,
});
```

### Newsletter Campaign

```bash
POST /api/campaigns/:id/send
```

---

## 📨 Email Types

### Subscription Confirmation

```typescript
await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: 'Confirm your subscription',
  html: `
    <h1>Welcome!</h1>
    <p>Click to confirm: <a href="${confirmUrl}">Confirm</a></p>
  `,
});
```

### Newsletter Campaign

```typescript
// Bulk send with tracking
for (const subscriber of subscribers) {
  await resend.emails.send({
    from: 'newsletter@yourdomain.com',
    to: subscriber.email,
    subject: campaign.subject,
    html: addTrackingPixel(campaign.content, subscriber.id),
    headers: {
      'X-Campaign-Id': campaign.id,
    },
  });
}
```

### Lead Notification

```typescript
await resend.emails.send({
  from: 'leads@yourdomain.com',
  to: process.env.LEAD_NOTIFICATION_EMAIL,
  subject: 'New Property Lead',
  html: `
    <h2>New Lead</h2>
    <p>Name: ${lead.name}</p>
    <p>Email: ${lead.email}</p>
    <p>Property: ${lead.property}</p>
  `,
});
```

---

## 📊 Tracking

### Open Tracking

```html
<img src="https://app.com/api/track/open/${campaignId}/${subscriberId}"
     width="1" height="1" />
```

### Click Tracking

```html
<a href="https://app.com/api/track/click/${campaignId}/${subscriberId}?url=${encodedUrl}">
  Click here
</a>
```

---

## 💰 Pricing

| Plan | Emails/Month | Price |
|------|--------------|-------|
| Free | 3,000 | $0 |
| Pro | 50,000 | $20/month |
| Scale | Unlimited | Custom |

---

## ⚠️ Rate Limits

| Limit | Value |
|-------|-------|
| Emails/second | 10 |
| Batch size | 100 |

---

## 🔧 Webhooks

### Setup

```bash
# Webhook URL
https://app.com/api/webhooks/resend
```

### Events

| Event | Description |
|-------|-------------|
| `email.sent` | Email sent |
| `email.delivered` | Email delivered |
| `email.opened` | Email opened |
| `email.clicked` | Link clicked |
| `email.bounced` | Email bounced |

---

## 🔧 Troubleshooting

### Email Not Delivered

1. Check domain verification
2. Check SPF/DKIM records
3. Check spam folder
4. Review bounce logs

### High Bounce Rate

1. Clean email list
2. Implement double opt-in
3. Remove inactive subscribers

---

## 📚 Related

- [Newsletter Feature](../features/newsletter.md)
- [Newsletter API](../api/endpoints/newsletter.md)

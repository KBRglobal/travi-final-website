# 📧 Newsletter System

> Email campaigns and subscriber management

---

## 📋 Features

- Subscriber management
- Campaign builder
- Email tracking
- Double opt-in
- Unsubscribe handling

---

## 👥 Subscriber Management

### Subscription Flow

```
1. User submits email
        │
        ▼
2. Confirmation email sent
        │
        ▼
3. User clicks confirm link
        │
        ▼
4. Subscriber activated
        │
        ▼
5. Receives campaigns
```

### Subscriber Statuses

| Status | Description |
|--------|-------------|
| Pending | Awaiting confirmation |
| Active | Confirmed, receiving |
| Unsubscribed | Opted out |

---

## ✉️ Campaign Builder

### Create Campaign

1. Go to **Newsletter → Campaigns**
2. Click **New Campaign**
3. Fill in:
   - Name (internal)
   - Subject line
   - Content (HTML)
4. Preview
5. Send or schedule

### Content Tips

- Clear subject line
- Single call-to-action
- Mobile-friendly design
- Unsubscribe link (auto-added)

---

## 📊 Tracking

### Metrics Tracked

| Metric | Description |
|--------|-------------|
| Sent | Emails sent |
| Delivered | Successfully delivered |
| Opened | Unique opens |
| Clicked | Link clicks |
| Bounced | Failed delivery |
| Unsubscribed | Opt-outs |

### View Stats

1. Go to campaign
2. View **Analytics**
3. See detailed metrics

---

## 🔌 API Endpoints

### Subscribers

```bash
POST /api/newsletter/subscribe
GET  /api/newsletter/subscribers
DELETE /api/newsletter/subscribers/:id
```

### Campaigns

```bash
GET    /api/campaigns
POST   /api/campaigns
PATCH  /api/campaigns/:id
POST   /api/campaigns/:id/send
GET    /api/campaigns/:id/events
```

---

## 📨 Email Templates

### Confirmation Email

```html
<h1>Welcome to Our Newsletter!</h1>
<p>Click to confirm your subscription:</p>
<a href="{confirmUrl}">Confirm Subscription</a>
```

### Campaign Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
</head>
<body>
  <h1>{subject}</h1>
  {content}
  <hr>
  <p><a href="{unsubscribeUrl}">Unsubscribe</a></p>
</body>
</html>
```

---

## 🔧 Configuration

### Environment Variables

```bash
RESEND_API_KEY=re_your-api-key
LEAD_NOTIFICATION_EMAIL=admin@example.com
```

### Rate Limits

| Limit | Value |
|-------|-------|
| Subscription | 2/min per IP |
| Send rate | 10/second |

---

## 📋 Compliance

### GDPR Requirements

- ✅ Double opt-in
- ✅ Clear consent
- ✅ Easy unsubscribe
- ✅ Data export
- ✅ Data deletion

### Best Practices

- Only email confirmed subscribers
- Honor unsubscribe immediately
- Keep consent records
- Clear privacy policy

---

## 🔧 Troubleshooting

### Emails Not Delivered

1. Check domain verification
2. Verify SPF/DKIM records
3. Check spam folder
4. Review Resend dashboard

### Low Open Rates

1. Improve subject lines
2. Optimize send time
3. Clean inactive subscribers
4. A/B test content

---

## 📚 Related

- [Resend Integration](../integrations/resend.md)
- [Lead Management](./real-estate.md)

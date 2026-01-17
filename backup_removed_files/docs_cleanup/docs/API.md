# 🔌 TRAVI API Reference

**RESTful APIs for the TRAVI Ecosystem**

---

## 📋 Table of Contents

- [API Overview](#-api-overview)
- [Authentication](#-authentication)
- [Rate Limiting](#-rate-limiting)
- [API Endpoints](#-api-endpoints)
- [Webhooks](#-webhooks)
- [Error Handling](#-error-handling)
- [Code Examples](#-code-examples)

---

## 🌟 API Overview

The TRAVI platform provides comprehensive REST APIs that allow you to integrate with all four products: Traviapp CMS, Live Edit, Insights, and Vendors. Our APIs are designed to be developer-friendly, consistent, and performant.

### Base URL

```
Production: https://api.travi.com/v1
Staging: https://staging-api.travi.com/v1
```

### API Principles

✅ **RESTful** - Standard HTTP methods (GET, POST, PATCH, DELETE)  
✅ **JSON** - All requests and responses use JSON  
✅ **Versioned** - API version in URL path  
✅ **Paginated** - Large result sets are paginated  
✅ **Documented** - Comprehensive documentation  
✅ **Consistent** - Uniform patterns across endpoints  
✅ **Secure** - Authentication required for protected endpoints  

---

## 🔐 Authentication

### Authentication Methods

TRAVI supports multiple authentication methods:

#### 1. **API Keys** (Recommended for Server-to-Server)

```http
GET /api/v1/contents
Authorization: Bearer YOUR_API_KEY
```

**How to Get API Keys:**
1. Log in to your TRAVI admin dashboard
2. Navigate to Settings → API Keys
3. Click "Generate New API Key"
4. Copy and securely store your key

#### 2. **OAuth 2.0** (Recommended for User Applications)

```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### 3. **Session-Based** (For Web Applications)

Standard session cookies after user login.

---

## ⏱️ Rate Limiting

### Rate Limits

| Tier | Requests per Minute | Requests per Hour | Burst Limit |
|------|---------------------|-------------------|-------------|
| **Free** | 60 | 1,000 | 10 |
| **Professional** | 300 | 10,000 | 50 |
| **Enterprise** | 1,000 | 50,000 | 200 |
| **Custom** | Custom | Custom | Custom |

### Rate Limit Headers

Every API response includes rate limit information:

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1703424000
```

### Exceeding Limits

When rate limit is exceeded:

```json
{
  "error": "rate_limit_exceeded",
  "message": "API rate limit exceeded. Retry after 45 seconds.",
  "retry_after": 45
}
```

**Status Code:** `429 Too Many Requests`

---

## 📚 API Endpoints

### Content Management

#### List Content

```http
GET /api/v1/contents
```

**Query Parameters:**
- `type` - Filter by content type (attraction, hotel, article, etc.)
- `status` - Filter by status (draft, published, archived)
- `language` - Filter by language code
- `page` - Page number (default: 1)
- `per_page` - Results per page (default: 30, max: 100)
- `sort` - Sort field (created_at, updated_at, title)
- `order` - Sort order (asc, desc)

**Example Request:**
```bash
curl -X GET "https://api.travi.com/v1/contents?type=attraction&status=published&page=1" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "123",
      "type": "attraction",
      "title": "Burj Khalifa",
      "slug": "burj-khalifa",
      "status": "published",
      "featured_image": "https://cdn.travi.com/images/burj-khalifa.jpg",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-03-20T14:45:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 30,
    "total": 156,
    "total_pages": 6
  }
}
```

#### Get Single Content

```http
GET /api/v1/contents/:id
```

**Example Response:**
```json
{
  "id": "123",
  "type": "attraction",
  "title": "Burj Khalifa",
  "slug": "burj-khalifa",
  "description": "The world's tallest building...",
  "content_blocks": [...],
  "metadata": {
    "location": {"lat": 25.1972, "lng": 55.2744},
    "opening_hours": "09:00-22:00",
    "ticket_price": {"adult": 149, "child": 119}
  },
  "seo": {
    "title": "Burj Khalifa - Dubai's Iconic Skyscraper",
    "description": "Visit the world's tallest building...",
    "keywords": ["burj khalifa", "dubai attractions"]
  },
  "translations": [
    {"locale": "ar", "status": "published"},
    {"locale": "fr", "status": "draft"}
  ]
}
```

#### Create Content

```http
POST /api/v1/contents
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "attraction",
  "title": "New Attraction",
  "slug": "new-attraction",
  "description": "Amazing place to visit...",
  "status": "draft",
  "metadata": {
    "location": {"lat": 25.1234, "lng": 55.5678}
  }
}
```

#### Update Content

```http
PATCH /api/v1/contents/:id
```

#### Delete Content

```http
DELETE /api/v1/contents/:id
```

---

### Translation Management

#### Get Translations

```http
GET /api/v1/contents/:id/translations
```

#### Create Translation

```http
POST /api/v1/contents/:id/translations
Content-Type: application/json

{
  "locale": "ar",
  "title": "برج خليفة",
  "description": "أطول مبنى في العالم..."
}
```

---

### Media Management

#### Upload Media

```http
POST /api/v1/media
Content-Type: multipart/form-data

file: (binary)
alt_text: "Description of image"
```

**Response:**
```json
{
  "id": "media_456",
  "url": "https://cdn.travi.com/media/image.jpg",
  "thumbnail": "https://cdn.travi.com/media/image_thumb.jpg",
  "width": 1920,
  "height": 1080,
  "size": 245678,
  "mime_type": "image/jpeg"
}
```

---

### Analytics

#### Get Analytics Summary

```http
GET /api/v1/analytics/summary
```

**Query Parameters:**
- `start_date` - Start date (ISO 8601)
- `end_date` - End date (ISO 8601)
- `metrics` - Comma-separated metrics

**Example:**
```bash
curl -X GET "https://api.travi.com/v1/analytics/summary?start_date=2024-01-01&end_date=2024-01-31&metrics=views,visitors,conversions" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "metrics": {
    "views": 145678,
    "visitors": 89234,
    "conversions": 3421,
    "conversion_rate": 3.83
  }
}
```

#### Get Content Performance

```http
GET /api/v1/analytics/content/:content_id
```

---

### Vendor Management

#### List Vendors

```http
GET /api/v1/vendors
```

#### Get Vendor

```http
GET /api/v1/vendors/:id
```

#### Get Vendor Activities

```http
GET /api/v1/vendors/:id/activities
```

---

## 🔔 Webhooks

### Webhook Events

Subscribe to real-time events from TRAVI:

| Event | Description |
|-------|-------------|
| `content.created` | New content published |
| `content.updated` | Content modified |
| `content.deleted` | Content removed |
| `booking.created` | New booking made |
| `booking.cancelled` | Booking cancelled |
| `vendor.approved` | Vendor approved |
| `compliance.alert` | Compliance issue detected |

### Webhook Configuration

**Setup:**
1. Go to Settings → Webhooks
2. Click "Create Webhook"
3. Enter your endpoint URL
4. Select events to subscribe to
5. Save and get your webhook secret

### Webhook Payload

```json
{
  "event": "content.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "content_id": "123",
    "type": "attraction",
    "title": "New Attraction",
    "status": "published"
  }
}
```

### Webhook Security

**Verify webhook signatures:**

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computed)
  );
}
```

---

## ⚠️ Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

---

## 💻 Code Examples

### JavaScript (Node.js)

```javascript
const axios = require('axios');

const API_KEY = 'your_api_key';
const BASE_URL = 'https://api.travi.com/v1';

// Get published attractions
async function getAttractions() {
  try {
    const response = await axios.get(`${BASE_URL}/contents`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      params: {
        type: 'attraction',
        status: 'published'
      }
    });
    
    console.log('Attractions:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Create new content
async function createContent(data) {
  try {
    const response = await axios.post(`${BASE_URL}/contents`, data, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Created:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}
```

### Python

```python
import requests

API_KEY = 'your_api_key'
BASE_URL = 'https://api.travi.com/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# Get attractions
response = requests.get(
    f'{BASE_URL}/contents',
    headers=headers,
    params={
        'type': 'attraction',
        'status': 'published'
    }
)

print('Attractions:', response.json())

# Create content
new_content = {
    'type': 'attraction',
    'title': 'New Attraction',
    'description': 'Amazing place...'
}

response = requests.post(
    f'{BASE_URL}/contents',
    headers=headers,
    json=new_content
)

print('Created:', response.json())
```

### PHP

```php
<?php

$apiKey = 'your_api_key';
$baseUrl = 'https://api.travi.com/v1';

$headers = [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
];

// Get attractions
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/contents?type=attraction&status=published');
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);

print_r($data);

curl_close($ch);
```

---

## 📚 Related Documentation

- [Architecture Overview →](ARCHITECTURE.md)
- [Security Documentation →](SECURITY.md)
- [Integration Guide →](INTEGRATION.md)
- [Product Documentation →](README.md)

---

## 🆘 Support

**Need Help?**
- 📧 Email: api-support@travi.com
- 📖 Documentation: https://docs.travi.com
- 💬 Community Forum: https://community.travi.com
- 🐛 Report Issues: https://github.com/travi/issues

---

<div align="center">

**[← Back to Documentation Hub](README.md)** · **[Architecture →](ARCHITECTURE.md)** · **[Security →](SECURITY.md)**

© 2024 TRAVI. All rights reserved.

</div>

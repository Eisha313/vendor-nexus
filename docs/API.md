# Vendor Nexus API Documentation

This document provides comprehensive documentation for the Vendor Nexus API endpoints.

## Base URL

```
Production: https://api.vendornexus.com/v1
Development: http://localhost:3000/api
```

## Authentication

All API requests require authentication using Bearer tokens.

```http
Authorization: Bearer <your_api_token>
```

---

## Vendors

### Register a New Vendor

Creates a new vendor account and initiates Stripe Connect onboarding.

**Endpoint:** `POST /api/vendors/register`

**Request Body:**

```json
{
  "businessName": "string (required)",
  "email": "string (required)",
  "businessType": "individual | company (required)",
  "country": "string (default: US)",
  "commissionRate": "number (0-100, default: 10)"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "vendor": {
      "id": "string",
      "stripeAccountId": "string",
      "businessName": "string",
      "email": "string",
      "status": "pending | active | suspended",
      "commissionRate": "number",
      "createdAt": "ISO 8601 date"
    },
    "onboardingUrl": "string"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid request body |
| 409 | Vendor with email already exists |
| 500 | Internal server error |

---

## Inventory

### Get Product Inventory

Retrieves the current inventory status for a specific product.

**Endpoint:** `GET /api/inventory/:productId`

**Response:**

```json
{
  "success": true,
  "data": {
    "productId": "string",
    "vendorId": "string",
    "quantity": "number",
    "reservedQuantity": "number",
    "availableQuantity": "number",
    "lowStockThreshold": "number",
    "isLowStock": "boolean",
    "lastUpdated": "ISO 8601 date"
  }
}
```

### Update Product Inventory

Updates the inventory quantity for a product.

**Endpoint:** `PUT /api/inventory/:productId`

**Request Body:**

```json
{
  "quantity": "number (required)",
  "operation": "set | increment | decrement (default: set)",
  "reason": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "productId": "string",
    "previousQuantity": "number",
    "newQuantity": "number",
    "operation": "string",
    "updatedAt": "ISO 8601 date"
  }
}
```

### Reserve Inventory

Reserves inventory for a pending order.

**Endpoint:** `POST /api/inventory/:productId`

**Request Body:**

```json
{
  "action": "reserve",
  "quantity": "number (required)",
  "orderId": "string (required)",
  "expiresIn": "number (seconds, default: 900)"
}
```

---

## Inventory Alerts

### Get Low Stock Alerts

Retrieves all products with low stock levels.

**Endpoint:** `GET /api/inventory/alerts`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| vendorId | string | Filter by vendor |
| limit | number | Max results (default: 50) |
| offset | number | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "productId": "string",
        "productName": "string",
        "vendorId": "string",
        "currentQuantity": "number",
        "threshold": "number",
        "severity": "low | medium | critical",
        "createdAt": "ISO 8601 date"
      }
    ],
    "pagination": {
      "total": "number",
      "limit": "number",
      "offset": "number"
    }
  }
}
```

### Configure Alert Settings

Updates alert configuration for a vendor.

**Endpoint:** `POST /api/inventory/alerts`

**Request Body:**

```json
{
  "vendorId": "string (required)",
  "defaultThreshold": "number",
  "emailNotifications": "boolean",
  "webhookUrl": "string (optional)",
  "alertFrequency": "immediate | hourly | daily"
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional information
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request parameters |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| INSUFFICIENT_INVENTORY | 422 | Not enough inventory |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

API requests are rate limited based on your plan:

| Plan | Requests/minute | Requests/day |
|------|-----------------|---------------|
| Free | 60 | 1,000 |
| Pro | 300 | 10,000 |
| Enterprise | 1,000 | Unlimited |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699574400
```

---

## Webhooks

Vendor Nexus can send webhooks for various events.

### Available Events

- `vendor.created` - New vendor registered
- `vendor.verified` - Vendor completed Stripe onboarding
- `inventory.low_stock` - Product fell below threshold
- `inventory.out_of_stock` - Product reached zero quantity
- `order.created` - New order placed
- `order.fulfilled` - Order marked as fulfilled
- `payout.completed` - Vendor payout processed

### Webhook Payload

```json
{
  "id": "evt_123456789",
  "type": "inventory.low_stock",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    // Event-specific data
  }
}
```

### Verifying Webhooks

All webhooks include a signature header:

```http
X-VendorNexus-Signature: sha256=abc123...
```

Verify using HMAC-SHA256 with your webhook secret.

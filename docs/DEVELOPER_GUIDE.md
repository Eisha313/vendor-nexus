# Vendor Nexus Developer Guide

## Overview

Vendor Nexus is a multi-vendor marketplace platform built with Next.js 14, featuring real-time inventory synchronization, dynamic pricing, and advanced analytics.

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── vendors/       # Vendor management
│   │   └── inventory/     # Inventory operations
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Shared libraries
│   ├── db/               # Database schema & queries
│   ├── errors/           # Custom error classes
│   ├── inventory/        # Inventory service
│   ├── types/            # TypeScript definitions
│   ├── utils/            # Utility functions
│   ├── vendors/          # Vendor service
│   └── stripe.ts         # Stripe configuration
└── components/           # React components (coming soon)
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Stripe account with Connect enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/vendor-nexus.git
cd vendor-nexus

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vendor_nexus

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_SECRET_KEY=your-secret-key
```

## Core Services

### Vendor Service

The `VendorService` class handles all vendor-related operations.

```typescript
import { VendorService } from '@/lib/vendors/vendor-service';

// Create a new vendor
const vendor = await VendorService.createVendor({
  businessName: 'Acme Store',
  email: 'vendor@acme.com',
  businessType: 'company'
});

// Get onboarding URL
const url = await VendorService.createOnboardingLink(vendor.id);

// Verify vendor status
const isVerified = await VendorService.verifyVendorStatus(vendor.stripeAccountId);
```

### Inventory Service

The `InventoryService` manages product inventory with real-time tracking.

```typescript
import { InventoryService } from '@/lib/inventory/inventory-service';

const inventoryService = new InventoryService();

// Get current inventory
const inventory = await inventoryService.getInventory('product_123');

// Update inventory
await inventoryService.updateInventory('product_123', {
  quantity: 100,
  operation: 'set'
});

// Reserve inventory for order
const reservation = await inventoryService.reserveInventory(
  'product_123',
  5,
  'order_456'
);

// Get low stock alerts
const alerts = await inventoryService.getLowStockAlerts('vendor_789');
```

## API Handler Pattern

All API routes use a consistent handler pattern with built-in error handling.

```typescript
import { createApiHandler, ApiError } from '@/lib/utils/api-handler';
import { z } from 'zod';

const RequestSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive()
});

export const POST = createApiHandler(async (req) => {
  const body = await req.json();
  const validated = RequestSchema.parse(body);
  
  // Your logic here
  
  return { success: true, data: result };
});
```

## Error Handling

Custom error classes provide consistent error responses.

```typescript
import { 
  ValidationError, 
  NotFoundError, 
  InsufficientInventoryError 
} from '@/lib/errors';

// Throw validation error
throw new ValidationError('Invalid product ID', { field: 'productId' });

// Throw not found error
throw new NotFoundError('Product', productId);

// Throw inventory error
throw new InsufficientInventoryError(productId, requested, available);
```

## Database Schema

The database schema is defined in `src/lib/db/schema.ts`.

### Key Tables

- `vendors` - Vendor accounts and Stripe Connect details
- `products` - Product catalog
- `inventory` - Real-time inventory tracking
- `inventory_reservations` - Temporary inventory holds
- `orders` - Customer orders
- `order_items` - Individual items in orders
- `payouts` - Vendor payout records

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { InventoryService } from '@/lib/inventory/inventory-service';

describe('InventoryService', () => {
  it('should reserve inventory correctly', async () => {
    const service = new InventoryService();
    const result = await service.reserveInventory('prod_1', 5, 'order_1');
    
    expect(result.reserved).toBe(true);
    expect(result.quantity).toBe(5);
  });
});
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- Documentation: https://docs.vendornexus.com
- GitHub Issues: https://github.com/your-org/vendor-nexus/issues
- Email: support@vendornexus.com

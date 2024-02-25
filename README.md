# Vendor Nexus

A multi-vendor marketplace platform with real-time inventory synchronization, dynamic pricing engine, and advanced seller analytics dashboard.

## Features

- **Stripe Connect Integration** - Automated vendor payouts with configurable commission splits and escrow management
- **Real-time Inventory Tracking** - Low-stock alerts, automatic listing deactivation, cross-vendor product comparison
- **Advanced Seller Dashboard** - Revenue analytics, customer insights, order fulfillment tracking
- **Dynamic Pricing Engine** - Flash sales, bulk discounts, AI-powered price optimization
- **Unified Shopping Cart** - Multi-vendor purchases with shipping consolidation

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/vendor-nexus.git
cd vendor-nexus

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Stripe keys and database URL
```

## Environment Variables

```
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

## Usage

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable UI components
├── lib/              # Utility functions and configurations
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
└── services/         # Business logic and API services
```

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Stripe Connect
- PostgreSQL with Prisma

## License

MIT
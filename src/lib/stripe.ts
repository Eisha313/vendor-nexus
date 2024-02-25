import Stripe from 'stripe';

// Initialize Stripe with API version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Commission configuration for the platform
export const PLATFORM_CONFIG = {
  // Default platform commission percentage (e.g., 10%)
  defaultCommissionRate: 0.1,
  // Minimum commission rate vendors can negotiate
  minCommissionRate: 0.05,
  // Maximum commission rate
  maxCommissionRate: 0.25,
  // Currency for all transactions
  currency: 'usd',
  // Payout delay in days (for escrow/dispute window)
  payoutDelayDays: 7,
} as const;

/**
 * Creates a Stripe Connect account for a new vendor
 */
export async function createVendorAccount(email: string, vendorId: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    metadata: {
      vendorId,
      platform: 'vendor-nexus',
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return account;
}

/**
 * Generates onboarding link for vendor to complete Stripe setup
 */
export async function createOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

/**
 * Calculates commission split for a transaction
 */
export function calculateCommissionSplit(
  totalAmount: number,
  commissionRate: number = PLATFORM_CONFIG.defaultCommissionRate
) {
  const platformFee = Math.round(totalAmount * commissionRate);
  const vendorPayout = totalAmount - platformFee;

  return {
    totalAmount,
    platformFee,
    vendorPayout,
    commissionRate,
  };
}

/**
 * Creates a payment intent with automatic split to vendor
 */
export async function createSplitPayment(
  amount: number,
  vendorStripeAccountId: string,
  commissionRate: number,
  metadata: Record<string, string>
) {
  const { platformFee, vendorPayout } = calculateCommissionSplit(
    amount,
    commissionRate
  );

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: PLATFORM_CONFIG.currency,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: platformFee,
    transfer_data: {
      destination: vendorStripeAccountId,
    },
    metadata: {
      ...metadata,
      platformFee: platformFee.toString(),
      vendorPayout: vendorPayout.toString(),
    },
  });

  return paymentIntent;
}

/**
 * Handles multi-vendor cart checkout with split payments
 */
export async function createMultiVendorCheckout(
  cartItems: Array<{
    vendorStripeAccountId: string;
    vendorId: string;
    amount: number;
    commissionRate: number;
    productIds: string[];
  }>,
  customerEmail: string
) {
  // Create a checkout session with multiple line items
  // Each vendor gets their split automatically
  const lineItems = cartItems.map((item) => ({
    price_data: {
      currency: PLATFORM_CONFIG.currency,
      product_data: {
        name: `Order from Vendor ${item.vendorId}`,
        metadata: {
          vendorId: item.vendorId,
          productIds: item.productIds.join(','),
        },
      },
      unit_amount: item.amount,
    },
    quantity: 1,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail,
    line_items: lineItems,
    success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/cart`,
    metadata: {
      type: 'multi_vendor_checkout',
      vendorCount: cartItems.length.toString(),
    },
  });

  return session;
}
import { Vendor, NewVendor, VendorSettings, NewVendorSettings } from '../db/schema';
import { createStripeConnectAccount, createStripeAccountLink } from '../stripe';

export interface VendorRegistrationData {
  userId: string;
  businessName: string;
  email: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface VendorWithSettings extends Vendor {
  settings?: VendorSettings;
}

function generateSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100) + '-' + Date.now().toString(36);
}

export async function registerVendor(data: VendorRegistrationData): Promise<{
  vendor: NewVendor;
  stripeOnboardingUrl: string;
}> {
  // Create Stripe Connect account for the vendor
  const stripeAccount = await createStripeConnectAccount({
    email: data.email,
    businessName: data.businessName,
    country: data.country || 'US',
  });

  const vendor: NewVendor = {
    userId: data.userId,
    businessName: data.businessName,
    slug: generateSlug(data.businessName),
    email: data.email,
    description: data.description,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    country: data.country || 'US',
    postalCode: data.postalCode,
    stripeAccountId: stripeAccount.id,
    stripeOnboardingComplete: false,
    status: 'pending',
  };

  // Generate Stripe onboarding link
  const accountLink = await createStripeAccountLink(
    stripeAccount.id,
    `${process.env.NEXT_PUBLIC_APP_URL}/vendor/onboarding/refresh`,
    `${process.env.NEXT_PUBLIC_APP_URL}/vendor/onboarding/complete`
  );

  return {
    vendor,
    stripeOnboardingUrl: accountLink.url,
  };
}

export function createDefaultVendorSettings(vendorId: string): NewVendorSettings {
  return {
    vendorId,
    autoAcceptOrders: true,
    lowStockThreshold: '10',
    enableFlashSales: true,
    enableBulkDiscounts: true,
    notifyLowStock: true,
    notifyNewOrders: true,
    notifyReviews: true,
  };
}

export function calculateVendorCommission(saleAmount: number, commissionRate: number): {
  vendorAmount: number;
  platformFee: number;
} {
  const platformFee = (saleAmount * commissionRate) / 100;
  const vendorAmount = saleAmount - platformFee;
  
  return {
    vendorAmount: Math.round(vendorAmount * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
  };
}

export function isVendorEligibleForPayout(vendor: Vendor): boolean {
  return (
    vendor.status === 'active' &&
    vendor.stripeOnboardingComplete === true &&
    vendor.stripeAccountId !== null
  );
}

export function getVendorPerformanceMetrics(vendor: Vendor): {
  salesRank: string;
  performanceLevel: string;
} {
  const totalSales = parseFloat(vendor.totalSales?.toString() || '0');
  const rating = parseFloat(vendor.rating?.toString() || '0');
  
  let salesRank: string;
  if (totalSales >= 100000) salesRank = 'platinum';
  else if (totalSales >= 50000) salesRank = 'gold';
  else if (totalSales >= 10000) salesRank = 'silver';
  else salesRank = 'bronze';
  
  let performanceLevel: string;
  if (rating >= 4.5) performanceLevel = 'excellent';
  else if (rating >= 4.0) performanceLevel = 'good';
  else if (rating >= 3.0) performanceLevel = 'average';
  else performanceLevel = 'needs_improvement';
  
  return { salesRank, performanceLevel };
}
// Vendor types
export interface Vendor {
  id: string;
  name: string;
  email: string;
  stripeAccountId?: string;
  stripeAccountStatus: 'pending' | 'active' | 'restricted' | 'disabled';
  commissionRate: number;
  payoutSchedule: 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorRegistration {
  name: string;
  email: string;
  businessType: 'individual' | 'company';
  country: string;
}

export interface VendorOnboardingResult {
  vendorId: string;
  stripeAccountId: string;
  onboardingUrl: string;
}

// Product types
export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  basePrice: number;
  currentPrice: number;
  sku: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'PENDING';
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt?: Date;
  deactivationReason?: string;
}

// Inventory types
export interface InventoryItem {
  id: string;
  productId: string;
  vendorId: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  autoDeactivate: boolean;
  version: number;
  lastUpdatedAt: Date;
  product?: Product;
  vendor?: Vendor;
}

export interface StockUpdateResult {
  success: boolean;
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  version: number;
}

export interface StockReservation {
  id: string;
  productId: string;
  orderId: string;
  quantity: number;
  status: 'active' | 'confirmed' | 'released' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

export interface LowStockAlert {
  productId: string;
  currentQuantity: number;
  threshold: number;
  alertedAt: Date;
}

// Order types
export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Cart types
export interface Cart {
  id: string;
  customerId?: string;
  sessionId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  vendorId: string;
  quantity: number;
  price: number;
  reservationId?: string;
}

// Pricing types
export interface PriceRule {
  id: string;
  vendorId: string;
  productId?: string;
  type: 'FLASH_SALE' | 'BULK_DISCOUNT' | 'PROMOTION' | 'AI_SUGGESTED';
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minQuantity?: number;
  maxQuantity?: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

// Analytics types
export interface VendorAnalytics {
  vendorId: string;
  period: 'day' | 'week' | 'month' | 'year';
  revenue: number;
  orders: number;
  averageOrderValue: number;
  topProducts: ProductPerformance[];
  customerInsights: CustomerInsight[];
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  views: number;
  conversionRate: number;
}

export interface CustomerInsight {
  metric: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

// API types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
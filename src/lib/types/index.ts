// Shared type definitions for VendorNexus

export interface Vendor {
  id: string;
  stripeAccountId: string;
  businessName: string;
  email: string;
  commissionRate: number;
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  sku: string;
  basePrice: number;
  currentPrice: number;
  quantity: number;
  lowStockThreshold: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  vendorId: string;
  type: 'low_stock' | 'out_of_stock' | 'restock';
  message: string;
  acknowledged: boolean;
  createdAt: Date;
}

export interface Order {
  id: string;
  customerId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  platformFee: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type VendorCreateInput = Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
export type ProductCreateInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'currentPrice'>;
export type ProductUpdateInput = Partial<Omit<Product, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>>;

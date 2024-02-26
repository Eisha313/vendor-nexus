import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const vendorStatusEnum = pgEnum('vendor_status', ['pending', 'active', 'suspended', 'inactive']);
export const payoutScheduleEnum = pgEnum('payout_schedule', ['daily', 'weekly', 'biweekly', 'monthly']);

export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  logo: varchar('logo', { length: 500 }),
  banner: varchar('banner', { length: 500 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  stripeOnboardingComplete: boolean('stripe_onboarding_complete').default(false),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('10.00'),
  payoutSchedule: payoutScheduleEnum('payout_schedule').default('weekly'),
  status: vendorStatusEnum('status').default('pending'),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0.00'),
  totalSales: decimal('total_sales', { precision: 12, scale: 2 }).default('0.00'),
  totalOrders: decimal('total_orders', { precision: 10, scale: 0 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vendorSettings = pgTable('vendor_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull().unique(),
  autoAcceptOrders: boolean('auto_accept_orders').default(true),
  lowStockThreshold: decimal('low_stock_threshold', { precision: 10, scale: 0 }).default('10'),
  enableFlashSales: boolean('enable_flash_sales').default(true),
  enableBulkDiscounts: boolean('enable_bulk_discounts').default(true),
  notifyLowStock: boolean('notify_low_stock').default(true),
  notifyNewOrders: boolean('notify_new_orders').default(true),
  notifyReviews: boolean('notify_reviews').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vendorsRelations = relations(vendors, ({ one }) => ({
  settings: one(vendorSettings, {
    fields: [vendors.id],
    references: [vendorSettings.vendorId],
  }),
}));

export const vendorSettingsRelations = relations(vendorSettings, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorSettings.vendorId],
    references: [vendors.id],
  }),
}));

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type VendorSettings = typeof vendorSettings.$inferSelect;
export type NewVendorSettings = typeof vendorSettings.$inferInsert;
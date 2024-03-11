import { db } from '@/lib/db';
import { products, inventory, inventoryAlerts, vendors } from '@/lib/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { EventEmitter } from 'events';

export interface InventoryItem {
  productId: string;
  vendorId: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  lastUpdated: Date;
}

export interface StockUpdate {
  productId: string;
  vendorId: string;
  quantityChange: number;
  reason: 'sale' | 'restock' | 'adjustment' | 'return' | 'reservation';
  referenceId?: string;
}

export interface LowStockAlert {
  id: string;
  productId: string;
  vendorId: string;
  productName: string;
  currentQuantity: number;
  threshold: number;
  severity: 'warning' | 'critical' | 'out_of_stock';
  createdAt: Date;
  acknowledged: boolean;
}

class InventoryEventEmitter extends EventEmitter {
  emitStockUpdate(data: { productId: string; vendorId: string; newQuantity: number }) {
    this.emit('stockUpdate', data);
  }

  emitLowStockAlert(alert: LowStockAlert) {
    this.emit('lowStockAlert', alert);
  }

  emitProductDeactivated(data: { productId: string; vendorId: string; reason: string }) {
    this.emit('productDeactivated', data);
  }
}

export const inventoryEvents = new InventoryEventEmitter();

export class InventoryService {
  private static instance: InventoryService;

  static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  async getInventory(productId: string, vendorId: string): Promise<InventoryItem | null> {
    const result = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.vendorId, vendorId)))
      .limit(1);

    if (result.length === 0) return null;

    const item = result[0];
    return {
      productId: item.productId,
      vendorId: item.vendorId,
      sku: item.sku,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      lowStockThreshold: item.lowStockThreshold,
      lastUpdated: item.lastUpdated,
    };
  }

  async getVendorInventory(vendorId: string): Promise<InventoryItem[]> {
    const results = await db
      .select()
      .from(inventory)
      .where(eq(inventory.vendorId, vendorId));

    return results.map((item) => ({
      productId: item.productId,
      vendorId: item.vendorId,
      sku: item.sku,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      lowStockThreshold: item.lowStockThreshold,
      lastUpdated: item.lastUpdated,
    }));
  }

  async updateStock(update: StockUpdate): Promise<{ success: boolean; newQuantity: number; alerts?: LowStockAlert[] }> {
    const currentInventory = await this.getInventory(update.productId, update.vendorId);

    if (!currentInventory) {
      throw new Error(`Inventory not found for product ${update.productId}`);
    }

    const newQuantity = currentInventory.quantity + update.quantityChange;

    if (newQuantity < 0) {
      throw new Error('Insufficient inventory');
    }

    await db
      .update(inventory)
      .set({
        quantity: newQuantity,
        lastUpdated: new Date(),
      })
      .where(and(eq(inventory.productId, update.productId), eq(inventory.vendorId, update.vendorId)));

    // Log the inventory change
    await this.logInventoryChange(update, currentInventory.quantity, newQuantity);

    // Emit real-time update
    inventoryEvents.emitStockUpdate({
      productId: update.productId,
      vendorId: update.vendorId,
      newQuantity,
    });

    // Check for low stock conditions
    const alerts = await this.checkLowStockConditions(update.productId, update.vendorId, newQuantity, currentInventory.lowStockThreshold);

    // Auto-deactivate if out of stock
    if (newQuantity === 0) {
      await this.deactivateProduct(update.productId, update.vendorId, 'out_of_stock');
    }

    return { success: true, newQuantity, alerts };
  }

  async reserveStock(productId: string, vendorId: string, quantity: number, orderId: string): Promise<boolean> {
    const currentInventory = await this.getInventory(productId, vendorId);

    if (!currentInventory) {
      throw new Error(`Inventory not found for product ${productId}`);
    }

    const availableQuantity = currentInventory.quantity - currentInventory.reservedQuantity;

    if (availableQuantity < quantity) {
      return false;
    }

    await db
      .update(inventory)
      .set({
        reservedQuantity: currentInventory.reservedQuantity + quantity,
        lastUpdated: new Date(),
      })
      .where(and(eq(inventory.productId, productId), eq(inventory.vendorId, vendorId)));

    await this.logInventoryChange(
      {
        productId,
        vendorId,
        quantityChange: 0,
        reason: 'reservation',
        referenceId: orderId,
      },
      currentInventory.quantity,
      currentInventory.quantity
    );

    return true;
  }

  async commitReservation(productId: string, vendorId: string, quantity: number, orderId: string): Promise<void> {
    const currentInventory = await this.getInventory(productId, vendorId);

    if (!currentInventory) {
      throw new Error(`Inventory not found for product ${productId}`);
    }

    await db
      .update(inventory)
      .set({
        quantity: currentInventory.quantity - quantity,
        reservedQuantity: Math.max(0, currentInventory.reservedQuantity - quantity),
        lastUpdated: new Date(),
      })
      .where(and(eq(inventory.productId, productId), eq(inventory.vendorId, vendorId)));

    await this.logInventoryChange(
      {
        productId,
        vendorId,
        quantityChange: -quantity,
        reason: 'sale',
        referenceId: orderId,
      },
      currentInventory.quantity,
      currentInventory.quantity - quantity
    );
  }

  async releaseReservation(productId: string, vendorId: string, quantity: number, orderId: string): Promise<void> {
    const currentInventory = await this.getInventory(productId, vendorId);

    if (!currentInventory) {
      throw new Error(`Inventory not found for product ${productId}`);
    }

    await db
      .update(inventory)
      .set({
        reservedQuantity: Math.max(0, currentInventory.reservedQuantity - quantity),
        lastUpdated: new Date(),
      })
      .where(and(eq(inventory.productId, productId), eq(inventory.vendorId, vendorId)));
  }

  async getLowStockProducts(vendorId?: string): Promise<LowStockAlert[]> {
    const query = db
      .select({
        productId: inventory.productId,
        vendorId: inventory.vendorId,
        quantity: inventory.quantity,
        threshold: inventory.lowStockThreshold,
        productName: products.name,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(lte(inventory.quantity, inventory.lowStockThreshold));

    const results = vendorId
      ? await query.where(and(lte(inventory.quantity, inventory.lowStockThreshold), eq(inventory.vendorId, vendorId)))
      : await query;

    return results.map((item) => ({
      id: `alert_${item.productId}_${Date.now()}`,
      productId: item.productId,
      vendorId: item.vendorId,
      productName: item.productName,
      currentQuantity: item.quantity,
      threshold: item.threshold,
      severity: this.calculateAlertSeverity(item.quantity, item.threshold),
      createdAt: new Date(),
      acknowledged: false,
    }));
  }

  async setLowStockThreshold(productId: string, vendorId: string, threshold: number): Promise<void> {
    await db
      .update(inventory)
      .set({ lowStockThreshold: threshold })
      .where(and(eq(inventory.productId, productId), eq(inventory.vendorId, vendorId)));
  }

  private async checkLowStockConditions(
    productId: string,
    vendorId: string,
    quantity: number,
    threshold: number
  ): Promise<LowStockAlert[]> {
    const alerts: LowStockAlert[] = [];

    if (quantity <= threshold) {
      const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);

      if (product.length > 0) {
        const alert: LowStockAlert = {
          id: `alert_${productId}_${Date.now()}`,
          productId,
          vendorId,
          productName: product[0].name,
          currentQuantity: quantity,
          threshold,
          severity: this.calculateAlertSeverity(quantity, threshold),
          createdAt: new Date(),
          acknowledged: false,
        };

        await db.insert(inventoryAlerts).values({
          id: alert.id,
          productId: alert.productId,
          vendorId: alert.vendorId,
          alertType: alert.severity,
          message: `Low stock alert: ${alert.productName} has ${quantity} units remaining`,
          createdAt: alert.createdAt,
        });

        inventoryEvents.emitLowStockAlert(alert);
        alerts.push(alert);
      }
    }

    return alerts;
  }

  private calculateAlertSeverity(quantity: number, threshold: number): 'warning' | 'critical' | 'out_of_stock' {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= threshold * 0.25) return 'critical';
    return 'warning';
  }

  private async deactivateProduct(productId: string, vendorId: string, reason: string): Promise<void> {
    await db
      .update(products)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)));

    inventoryEvents.emitProductDeactivated({ productId, vendorId, reason });
  }

  private async logInventoryChange(
    update: StockUpdate,
    previousQuantity: number,
    newQuantity: number
  ): Promise<void> {
    // In a real implementation, this would log to an inventory_logs table
    console.log(`[Inventory] Product ${update.productId}: ${previousQuantity} -> ${newQuantity} (${update.reason})`);
  }
}

export const inventoryService = InventoryService.getInstance();

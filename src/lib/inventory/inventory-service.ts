import { db } from '@/lib/db/schema';
import { InventoryItem, LowStockAlert, StockUpdateResult } from '@/lib/types';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { EventEmitter } from 'events';

class InventoryService {
  private eventEmitter: EventEmitter;
  private updateLocks: Map<string, Promise<void>>;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.updateLocks = new Map();
  }

  private async acquireLock(productId: string): Promise<() => void> {
    // Wait for any existing lock on this product
    const existingLock = this.updateLocks.get(productId);
    if (existingLock) {
      await existingLock;
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.updateLocks.set(productId, lockPromise);

    return () => {
      this.updateLocks.delete(productId);
      releaseLock!();
    };
  }

  async getInventory(productId: string): Promise<InventoryItem> {
    const item = await db.inventory.findUnique({
      where: { productId },
      include: {
        product: true,
        vendor: true,
        reservations: {
          where: {
            expiresAt: { gt: new Date() },
            status: 'active'
          }
        }
      }
    });

    if (!item) {
      throw new NotFoundError(`Inventory not found for product: ${productId}`);
    }

    const reservedQuantity = item.reservations.reduce(
      (sum, r) => sum + r.quantity,
      0
    );

    return {
      ...item,
      availableQuantity: Math.max(0, item.quantity - reservedQuantity),
      reservedQuantity
    };
  }

  async updateStock(
    productId: string,
    quantityChange: number,
    reason: string,
    expectedVersion?: number
  ): Promise<StockUpdateResult> {
    const releaseLock = await this.acquireLock(productId);

    try {
      const currentInventory = await db.inventory.findUnique({
        where: { productId },
        include: { product: true }
      });

      if (!currentInventory) {
        throw new NotFoundError(`Inventory not found for product: ${productId}`);
      }

      // Optimistic locking check
      if (expectedVersion !== undefined && currentInventory.version !== expectedVersion) {
        throw new ConflictError(
          `Inventory was modified by another process. Expected version ${expectedVersion}, current version ${currentInventory.version}`
        );
      }

      const newQuantity = currentInventory.quantity + quantityChange;

      if (newQuantity < 0) {
        throw new ValidationError(
          `Insufficient stock. Current: ${currentInventory.quantity}, Requested change: ${quantityChange}`
        );
      }

      const updated = await db.$transaction(async (tx) => {
        // Update inventory with version increment
        const updatedInventory = await tx.inventory.update({
          where: { 
            productId,
            version: currentInventory.version // Ensure no concurrent modification
          },
          data: {
            quantity: newQuantity,
            version: { increment: 1 },
            lastUpdatedAt: new Date()
          }
        });

        if (!updatedInventory) {
          throw new ConflictError('Concurrent modification detected');
        }

        // Log the stock movement
        await tx.stockMovement.create({
          data: {
            productId,
            quantityChange,
            reason,
            previousQuantity: currentInventory.quantity,
            newQuantity,
            createdAt: new Date()
          }
        });

        return updatedInventory;
      });

      // Check for low stock alert after successful update
      await this.checkLowStockAlert(productId, newQuantity, currentInventory.lowStockThreshold);

      // Auto-deactivate listing if out of stock
      if (newQuantity === 0 && currentInventory.autoDeactivate) {
        await this.deactivateListing(productId);
      }

      return {
        success: true,
        productId,
        previousQuantity: currentInventory.quantity,
        newQuantity,
        version: updated.version
      };
    } catch (error) {
      // Re-throw known errors
      if (error instanceof NotFoundError || 
          error instanceof ConflictError || 
          error instanceof ValidationError) {
        throw error;
      }
      
      // Wrap unknown errors
      throw new Error(`Failed to update stock for ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      releaseLock();
    }
  }

  async reserveStock(
    productId: string,
    quantity: number,
    orderId: string,
    expirationMinutes: number = 15
  ): Promise<{ reservationId: string; expiresAt: Date }> {
    const releaseLock = await this.acquireLock(productId);

    try {
      const inventory = await this.getInventory(productId);

      if (inventory.availableQuantity < quantity) {
        throw new ValidationError(
          `Insufficient available stock. Available: ${inventory.availableQuantity}, Requested: ${quantity}`
        );
      }

      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      const reservation = await db.stockReservation.create({
        data: {
          productId,
          orderId,
          quantity,
          status: 'active',
          expiresAt,
          createdAt: new Date()
        }
      });

      return {
        reservationId: reservation.id,
        expiresAt
      };
    } finally {
      releaseLock();
    }
  }

  async confirmReservation(reservationId: string): Promise<void> {
    const reservation = await db.stockReservation.findUnique({
      where: { id: reservationId }
    });

    if (!reservation) {
      throw new NotFoundError(`Reservation not found: ${reservationId}`);
    }

    if (reservation.status !== 'active') {
      throw new ValidationError(`Reservation is not active: ${reservation.status}`);
    }

    if (reservation.expiresAt < new Date()) {
      throw new ValidationError('Reservation has expired');
    }

    await db.$transaction(async (tx) => {
      await tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: 'confirmed' }
      });

      // Decrement actual stock
      await tx.inventory.update({
        where: { productId: reservation.productId },
        data: {
          quantity: { decrement: reservation.quantity },
          version: { increment: 1 }
        }
      });
    });
  }

  async releaseReservation(reservationId: string): Promise<void> {
    const reservation = await db.stockReservation.findUnique({
      where: { id: reservationId }
    });

    if (!reservation) {
      // Silently ignore - reservation may have already been released or expired
      return;
    }

    if (reservation.status === 'released') {
      return; // Already released
    }

    await db.stockReservation.update({
      where: { id: reservationId },
      data: { status: 'released' }
    });
  }

  private async checkLowStockAlert(
    productId: string,
    currentQuantity: number,
    threshold: number
  ): Promise<void> {
    if (currentQuantity <= threshold) {
      const alert: LowStockAlert = {
        productId,
        currentQuantity,
        threshold,
        alertedAt: new Date()
      };

      this.eventEmitter.emit('lowStock', alert);

      await db.alert.create({
        data: {
          type: 'LOW_STOCK',
          productId,
          data: JSON.stringify(alert),
          createdAt: new Date(),
          acknowledged: false
        }
      });
    }
  }

  private async deactivateListing(productId: string): Promise<void> {
    await db.product.update({
      where: { id: productId },
      data: {
        status: 'OUT_OF_STOCK',
        deactivatedAt: new Date(),
        deactivationReason: 'AUTO_OUT_OF_STOCK'
      }
    });

    this.eventEmitter.emit('listingDeactivated', { productId, reason: 'out_of_stock' });
  }

  onLowStock(callback: (alert: LowStockAlert) => void): void {
    this.eventEmitter.on('lowStock', callback);
  }

  onListingDeactivated(callback: (data: { productId: string; reason: string }) => void): void {
    this.eventEmitter.on('listingDeactivated', callback);
  }
}

export const inventoryService = new InventoryService();
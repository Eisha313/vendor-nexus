import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventory/inventory-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;
    const vendorId = request.nextUrl.searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'vendorId is required' },
        { status: 400 }
      );
    }

    const inventory = await inventoryService.getInventory(productId, vendorId);

    if (!inventory) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...inventory,
        availableQuantity: inventory.quantity - inventory.reservedQuantity,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;
    const body = await request.json();
    const { vendorId, quantityChange, reason, referenceId } = body;

    if (!vendorId || quantityChange === undefined || !reason) {
      return NextResponse.json(
        { error: 'vendorId, quantityChange, and reason are required' },
        { status: 400 }
      );
    }

    const validReasons = ['sale', 'restock', 'adjustment', 'return', 'reservation'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await inventoryService.updateStock({
      productId,
      vendorId,
      quantityChange,
      reason,
      referenceId,
    });

    return NextResponse.json({
      success: true,
      data: {
        newQuantity: result.newQuantity,
        alerts: result.alerts,
      },
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    const message = error instanceof Error ? error.message : 'Failed to update inventory';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

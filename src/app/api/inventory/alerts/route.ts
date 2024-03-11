import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '@/lib/inventory/inventory-service';

export async function GET(request: NextRequest) {
  try {
    const vendorId = request.nextUrl.searchParams.get('vendorId');
    
    const alerts = await inventoryService.getLowStockProducts(
      vendorId || undefined
    );

    const summary = {
      total: alerts.length,
      outOfStock: alerts.filter((a) => a.severity === 'out_of_stock').length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary,
      },
    });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, vendorId, threshold } = body;

    if (!productId || !vendorId || threshold === undefined) {
      return NextResponse.json(
        { error: 'productId, vendorId, and threshold are required' },
        { status: 400 }
      );
    }

    if (typeof threshold !== 'number' || threshold < 0) {
      return NextResponse.json(
        { error: 'threshold must be a non-negative number' },
        { status: 400 }
      );
    }

    await inventoryService.setLowStockThreshold(productId, vendorId, threshold);

    return NextResponse.json({
      success: true,
      message: 'Low stock threshold updated successfully',
    });
  } catch (error) {
    console.error('Error updating threshold:', error);
    return NextResponse.json(
      { error: 'Failed to update threshold' },
      { status: 500 }
    );
  }
}

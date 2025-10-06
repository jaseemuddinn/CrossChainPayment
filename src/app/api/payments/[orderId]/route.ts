import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService } from '@/services/payment.service';

/**
 * GET /api/payments/[orderId]
 * Get payment order status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const paymentService = getPaymentService();
    const order = await paymentService.getOrder(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Don't expose sensitive data
    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        status: order.status,
        depositAddress: order.depositAddress,
        depositAmount: order.depositAmount,
        depositCoin: order.depositCoin,
        depositNetwork: order.depositNetwork,
        depositTxHash: order.depositTxHash,
        totalUSD: order.totalUSD,
        items: order.items,
        expiresAt: order.quoteExpiresAt,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        statusHistory: order.statusHistory,
      },
    });

  } catch (error: any) {
    console.error('[API] Get payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

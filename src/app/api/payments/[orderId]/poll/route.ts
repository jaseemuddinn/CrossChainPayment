import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService } from '@/services/payment.service';

/**
 * POST /api/payments/[orderId]/poll
 * Manually poll SideShift for status update
 * Use this as fallback if webhooks aren't working
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const paymentService = getPaymentService();
    const order = await paymentService.pollShiftStatus(orderId);

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        depositTxHash: order.depositTxHash,
        settleTxHash: order.settleTxHash,
        completedAt: order.completedAt,
      },
    });

  } catch (error: any) {
    console.error('[API] Poll payment error:', error);
    
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

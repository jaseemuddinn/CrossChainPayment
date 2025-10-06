import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { connectDB } from '@/lib/mongodb';
import { WebhookEvent } from '@/models/WebhookEvent';
import { getPaymentService, PaymentStatus } from '@/services/payment.service';
import { PaymentOrder } from '@/models/PaymentOrder';

/**
 * POST /api/webhooks/sideshift
 * 
 * SideShift webhook handler
 * Receives real-time updates about shift status
 * 
 * CRITICAL: Set this URL in SideShift dashboard
 * URL: https://yourdomain.com/api/webhooks/sideshift
 * 
 * Webhook events:
 * - shift.created: Shift created
 * - shift.pending: Deposit detected (unconfirmed)
 * - shift.processing: Swapping tokens
 * - shift.settling: Sending to your wallet
 * - shift.settled: Payment complete!
 * - shift.refund: Shift failed, refunding customer
 * - shift.expired: Quote expired
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get webhook payload
    const body = await request.json();
    const headers = Object.fromEntries(request.headers);
    const sourceIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Extract shift info
    const { id: shiftId, status, depositHash, settleHash } = body;

    if (!shiftId) {
      console.error('[Webhook] No shiftId in payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    console.log(`[Webhook] Received: shiftId=${shiftId}, status=${status}`);

    // Log webhook event
    const eventId = nanoid();
    await WebhookEvent.create({
      eventId,
      eventType: `shift.${status}`,
      shiftId,
      payload: body,
      headers,
      processed: false,
      receivedAt: new Date(),
      sourceIP,
    });

    // Find the order
    const order = await PaymentOrder.findOne({ shiftId });

    if (!order) {
      console.error(`[Webhook] Order not found for shiftId: ${shiftId}`);
      
      // Mark webhook as processed even if order not found
      // (might be a test webhook or old order)
      await WebhookEvent.findOneAndUpdate(
        { eventId },
        { 
          processed: true, 
          processedAt: new Date(),
          processingError: 'Order not found'
        }
      );
      
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Map SideShift status to our status
    const statusMap: Record<string, PaymentStatus> = {
      'waiting': 'pending',
      'pending': 'detecting',
      'processing': 'processing',
      'settling': 'settling',
      'settled': 'completed',
      'refund': 'failed',
      'refunded': 'refunded',
      'expired': 'expired',
    };

    const newStatus = statusMap[status];

    if (!newStatus) {
      console.warn(`[Webhook] Unknown status: ${status}`);
      return NextResponse.json({ success: true });
    }

    // Update order status
    const paymentService = getPaymentService();
    await paymentService.updateOrderStatus(order.orderId, newStatus, {
      depositTxHash: depositHash,
      settleTxHash: settleHash,
      note: `Webhook: ${status}`,
    });

    // Mark webhook as processed
    await WebhookEvent.findOneAndUpdate(
      { eventId },
      { 
        processed: true, 
        processedAt: new Date(),
        orderId: order.orderId,
      }
    );

    console.log(`[Webhook] Processed: ${order.orderId} -> ${newStatus}`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    
    // Still return 200 to prevent webhook retries
    // Log the error for manual investigation
    return NextResponse.json({ 
      success: false, 
      error: 'Processing error' 
    }, { status: 200 });
  }
}

/**
 * GET /api/webhooks/sideshift
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'SideShift webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}

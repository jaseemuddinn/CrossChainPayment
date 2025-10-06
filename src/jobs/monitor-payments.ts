import { connectDB } from '@/lib/mongodb';
import { PaymentOrder } from '@/models/PaymentOrder';
import { getPaymentService } from '@/services/payment.service';

/**
 * BACKGROUND JOB: Monitor and handle expired/abandoned payments
 * 
 * Run this as a cron job or serverless function every 5 minutes
 * 
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 * AWS EventBridge, Google Cloud Scheduler, etc.
 */

export async function monitorPayments() {
  await connectDB();
  
  console.log('[Monitor] Starting payment monitor...');
  
  const now = new Date();

  // 1. Handle expired quotes (no deposit received)
  const expiredPending = await PaymentOrder.find({
    status: 'pending',
    quoteExpiresAt: { $lt: now },
    depositTxHash: { $exists: false },
  });

  console.log(`[Monitor] Found ${expiredPending.length} expired pending payments`);

  for (const order of expiredPending) {
    const paymentService = getPaymentService();
    await paymentService.updateOrderStatus(order.orderId, 'expired', {
      note: 'Quote expired without deposit',
    });
    console.log(`[Monitor] Marked ${order.orderId} as expired`);
  }

  // 2. Send expiry reminders (2 minutes before expiry)
  const expiringReminderTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 min from now
  
  const expiringSoon = await PaymentOrder.find({
    status: 'pending',
    quoteExpiresAt: { $lt: expiringReminderTime, $gt: now },
    expiryReminderSent: { $ne: true },
    depositTxHash: { $exists: false },
  });

  console.log(`[Monitor] Found ${expiringSoon.length} payments expiring soon`);

  for (const order of expiringSoon) {
    // TODO: Send email/notification to customer
    console.log(`[Monitor] Reminder: ${order.orderId} expires in 2 minutes`);
    
    // Mark reminder as sent
    order.expiryReminderSent = true;
    await order.save();
  }

  // 3. Clean up very old abandoned orders (24 hours old)
  const abandonedThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const abandonedOrders = await PaymentOrder.find({
    status: 'pending',
    createdAt: { $lt: abandonedThreshold },
    depositTxHash: { $exists: false },
  });

  console.log(`[Monitor] Found ${abandonedOrders.length} abandoned orders`);

  for (const order of abandonedOrders) {
    const paymentService = getPaymentService();
    await paymentService.updateOrderStatus(order.orderId, 'expired', {
      note: 'Abandoned - 24 hours without deposit',
    });
  }

  // 4. Poll stuck payments (processing for >1 hour)
  const stuckThreshold = new Date(now.getTime() - 60 * 60 * 1000);
  
  const stuckPayments = await PaymentOrder.find({
    status: { $in: ['detecting', 'processing', 'settling'] },
    updatedAt: { $lt: stuckThreshold },
  });

  console.log(`[Monitor] Found ${stuckPayments.length} potentially stuck payments`);

  for (const order of stuckPayments) {
    if (!order.shiftId) continue;
    
    try {
      const paymentService = getPaymentService();
      await paymentService.pollShiftStatus(order.orderId);
      console.log(`[Monitor] Polled ${order.orderId}`);
    } catch (error) {
      console.error(`[Monitor] Failed to poll ${order.orderId}:`, error);
    }
  }

  console.log('[Monitor] Payment monitor completed');
  
  return {
    expiredPending: expiredPending.length,
    expiringSoon: expiringSoon.length,
    abandonedOrders: abandonedOrders.length,
    stuckPayments: stuckPayments.length,
  };
}

/**
 * Run monitor as API endpoint (for Vercel Cron)
 * 
 * Create: src/app/api/cron/monitor/route.ts
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await monitorPayments();
    return Response.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Cron] Monitor error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * For local development/testing
 */
if (require.main === module) {
  monitorPayments()
    .then((result) => {
      console.log('Monitor result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Monitor error:', error);
      process.exit(1);
    });
}

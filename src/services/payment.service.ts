import { nanoid } from 'nanoid';
import { PaymentOrder, IPaymentOrder, PaymentStatus } from '@/models/PaymentOrder';
import { getSideShiftClient, QuoteResponse, ShiftResponse } from '@/lib/sideshift';
import { connectDB } from '@/lib/mongodb';

// Re-export PaymentStatus for convenience
export type { PaymentStatus };

/**
 * PAYMENT SERVICE
 * Core business logic for payment processing
 */

export interface CreatePaymentParams {
  // Cart/Order info
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    priceUSD: number;
  }>;
  totalUSD: number;
  
  // Customer info
  customerEmail: string;
  customerWallet?: string; // For refunds
  
  // Crypto preferences
  depositCoin: string;
  depositNetwork: string;
  
  // Optional metadata
  ipAddress?: string;
  userAgent?: string;
}

export interface CreatePaymentResult {
  order: IPaymentOrder;
  depositAddress: string;
  depositAmount: string;
  qrCodeData: string;
  expiresAt: Date;
  expiresInMinutes: number;
}

export class PaymentService {
  private sideshift = getSideShiftClient();
  
  /**
   * STEP 1: Create a new payment order
   * This creates quote, shift, and returns deposit address
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    await connectDB();

    // Generate unique order ID
    const orderId = nanoid(12);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${nanoid(6)}`;

    // Get settlement config from env
    const settleCoin = process.env.SETTLEMENT_COIN || 'usdc';
    const settleNetwork = process.env.SETTLEMENT_NETWORK || 'arbitrum';
    const settleAddress = process.env.SETTLEMENT_ADDRESS;

    if (!settleAddress) {
      throw new Error('SETTLEMENT_ADDRESS not configured');
    }

    // Step 1: Request quote from SideShift
    // We specify settleAmount (what we want to receive in USDC)
    console.log(`[Payment ${orderId}] Requesting quote for $${params.totalUSD} USD`);
    
    const quote = await this.sideshift.requestQuote({
      depositCoin: params.depositCoin,
      depositNetwork: params.depositNetwork,
      settleCoin,
      settleNetwork,
      settleAmount: params.totalUSD.toFixed(6), // USDC amount
      affiliateId: process.env.SIDESHIFT_AFFILIATE_ID!,
    });

    console.log(`[Payment ${orderId}] Quote received: ${quote.depositAmount} ${params.depositCoin.toUpperCase()}`);

    // Step 2: Create fixed shift (generates deposit address)
    const shift = await this.sideshift.createFixedShift({
      quoteId: quote.id,
      settleAddress,
      affiliateId: process.env.SIDESHIFT_AFFILIATE_ID!,
      refundAddress: params.customerWallet, // Optional: for auto-refunds
    });

    console.log(`[Payment ${orderId}] Shift created: ${shift.id}`);
    console.log(`[Payment ${orderId}] Deposit address: ${shift.depositAddress}`);

    // Step 3: Save to database
    const expiresAt = new Date(shift.expiresAt);
    const now = new Date();
    const expiresInMinutes = Math.floor((expiresAt.getTime() - now.getTime()) / 60000);

    const order = await PaymentOrder.create({
      orderId,
      orderNumber,
      items: params.items,
      totalUSD: params.totalUSD,
      customerEmail: params.customerEmail,
      customerWallet: params.customerWallet,
      
      quoteId: quote.id,
      shiftId: shift.id,
      
      depositCoin: params.depositCoin,
      depositNetwork: params.depositNetwork,
      depositAddress: shift.depositAddress,
      depositAmount: shift.depositAmount,
      
      settleCoin,
      settleNetwork,
      settleAddress,
      settleAmount: shift.settleAmount,
      
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: now,
        note: 'Payment created, waiting for deposit',
      }],
      
      quoteExpiresAt: expiresAt,
      exchangeRate: parseFloat(quote.rate),
      quotedAt: new Date(quote.createdAt),
      
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      affiliateId: process.env.SIDESHIFT_AFFILIATE_ID,
    });

    // Generate QR code data (for wallet apps)
    // Format: coin:address?amount=X
    const qrCodeData = this.generatePaymentURI(
      params.depositCoin,
      shift.depositAddress,
      shift.depositAmount || ''
    );

    return {
      order,
      depositAddress: shift.depositAddress,
      depositAmount: shift.depositAmount || '',
      qrCodeData,
      expiresAt,
      expiresInMinutes,
    };
  }

  /**
   * STEP 2: Update order status from SideShift webhook or polling
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: PaymentStatus,
    metadata?: {
      depositTxHash?: string;
      settleTxHash?: string;
      note?: string;
    }
  ): Promise<IPaymentOrder> {
    await connectDB();

    const order = await PaymentOrder.findOne({ orderId });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Don't update if already in terminal state
    if (['completed', 'refunded', 'expired'].includes(order.status)) {
      console.log(`[Payment ${orderId}] Already in terminal state: ${order.status}`);
      return order;
    }

    console.log(`[Payment ${orderId}] Status: ${order.status} -> ${newStatus}`);

    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      note: metadata?.note,
    });

    if (metadata?.depositTxHash) {
      order.depositTxHash = metadata.depositTxHash;
    }

    if (metadata?.settleTxHash) {
      order.settleTxHash = metadata.settleTxHash;
    }

    if (newStatus === 'completed') {
      order.completedAt = new Date();
    }

    await order.save();

    // TODO: Trigger order fulfillment webhook/email
    if (newStatus === 'completed') {
      await this.handleOrderCompletion(order);
    }

    return order;
  }

  /**
   * Poll SideShift for shift status updates
   * Use this for orders without webhook setup
   */
  async pollShiftStatus(orderId: string): Promise<IPaymentOrder> {
    await connectDB();

    const order = await PaymentOrder.findOne({ orderId });
    if (!order || !order.shiftId) {
      throw new Error(`Order ${orderId} not found or has no shiftId`);
    }

    const shiftStatus = await this.sideshift.getShiftStatus(order.shiftId);

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

    const newStatus = statusMap[shiftStatus.status] || 'pending';

    return this.updateOrderStatus(orderId, newStatus, {
      depositTxHash: shiftStatus.depositHash,
      settleTxHash: shiftStatus.settleHash,
      note: `SideShift status: ${shiftStatus.status}`,
    });
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<IPaymentOrder | null> {
    await connectDB();
    return PaymentOrder.findOne({ orderId });
  }

  /**
   * Get customer's orders
   */
  async getCustomerOrders(email: string): Promise<IPaymentOrder[]> {
    await connectDB();
    return PaymentOrder.find({ customerEmail: email }).sort({ createdAt: -1 });
  }

  /**
   * Generate payment URI for QR codes
   */
  private generatePaymentURI(coin: string, address: string, amount: string): string {
    // Standard crypto payment URI format
    // bitcoin:address?amount=X
    // ethereum:address?value=X
    
    const coinURI = coin.toLowerCase();
    
    if (amount) {
      return `${coinURI}:${address}?amount=${amount}`;
    }
    
    return `${coinURI}:${address}`;
  }

  /**
   * Handle order completion (send confirmation email, trigger fulfillment)
   */
  private async handleOrderCompletion(order: IPaymentOrder): Promise<void> {
    console.log(`[Payment ${order.orderId}] 🎉 ORDER COMPLETED!`);
    console.log(`  - Customer: ${order.customerEmail}`);
    console.log(`  - Amount: $${order.totalUSD} USD`);
    console.log(`  - Settled: ${order.settleAmount} ${order.settleCoin.toUpperCase()}`);
    console.log(`  - Tx Hash: ${order.settleTxHash}`);

    // TODO: Implement your business logic here:
    // 1. Send confirmation email to customer
    // 2. Trigger order fulfillment (digital goods delivery, etc.)
    // 3. Update inventory
    // 4. Send to accounting system
    // 5. Notify merchant dashboard
  }
}

// Singleton instance
let paymentService: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentService) {
    paymentService = new PaymentService();
  }
  return paymentService;
}

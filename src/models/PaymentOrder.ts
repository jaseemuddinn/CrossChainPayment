import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * PAYMENT ORDER STATUSES
 * - pending: Quote created, waiting for customer deposit
 * - detecting: Deposit transaction seen on network (unconfirmed)
 * - processing: SideShift is swapping tokens
 * - settling: Funds being sent to your wallet
 * - completed: Payment confirmed and settled
 * - expired: Quote expired before payment
 * - failed: Shift failed (network issues, slippage, etc.)
 * - refunded: Payment returned to customer
 * - underpaid: Customer sent insufficient amount
 * - overpaid: Customer sent too much (requires manual handling)
 */
export type PaymentStatus = 
  | 'pending' 
  | 'detecting' 
  | 'processing' 
  | 'settling' 
  | 'completed' 
  | 'expired' 
  | 'failed' 
  | 'refunded'
  | 'underpaid'
  | 'overpaid';

export interface IPaymentOrder extends Document {
  // Order identification
  orderId: string; // Your internal order ID
  orderNumber: string; // Human-readable order number
  
  // Product/Cart details
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
  
  // SideShift integration
  quoteId?: string;
  shiftId?: string;
  
  // Crypto payment details
  depositCoin: string; // What customer wants to pay with (e.g., 'btc', 'eth')
  depositNetwork: string; // Network (e.g., 'mainnet', 'arbitrum')
  depositAddress?: string; // Generated address for customer
  depositAmount?: string; // Exact amount customer must send
  
  settleCoin: string; // What YOU receive (e.g., 'usdc')
  settleNetwork: string; // Where YOU receive it (e.g., 'arbitrum')
  settleAddress: string; // YOUR wallet address
  settleAmount?: string; // Amount you'll receive
  
  // Transaction tracking
  depositTxHash?: string; // Customer's deposit transaction
  settleTxHash?: string; // Settlement transaction to your wallet
  
  // Status tracking
  status: PaymentStatus;
  statusHistory: Array<{
    status: PaymentStatus;
    timestamp: Date;
    note?: string;
  }>;
  
  // Quote expiration
  quoteExpiresAt?: Date;
  expiryReminderSent?: boolean;
  
  // Rate info (for reconciliation)
  exchangeRate?: number;
  quotedAt?: Date;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  affiliateId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const PaymentOrderSchema = new Schema<IPaymentOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderNumber: { type: String, required: true },
    
    items: [{
      productId: { type: String, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      priceUSD: { type: Number, required: true },
    }],
    totalUSD: { type: Number, required: true },
    
    customerEmail: { type: String, required: true, index: true },
    customerWallet: { type: String },
    
    quoteId: { type: String, index: true },
    shiftId: { type: String, index: true, sparse: true },
    
    depositCoin: { type: String, required: true },
    depositNetwork: { type: String, required: true },
    depositAddress: { type: String, index: true },
    depositAmount: { type: String },
    
    settleCoin: { type: String, required: true },
    settleNetwork: { type: String, required: true },
    settleAddress: { type: String, required: true },
    settleAmount: { type: String },
    
    depositTxHash: { type: String, index: true },
    settleTxHash: { type: String },
    
    status: { 
      type: String, 
      enum: [
        'pending', 'detecting', 'processing', 'settling', 
        'completed', 'expired', 'failed', 'refunded',
        'underpaid', 'overpaid'
      ],
      default: 'pending',
      index: true
    },
    
    statusHistory: [{
      status: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      note: { type: String }
    }],
    
    quoteExpiresAt: { type: Date, index: true },
    expiryReminderSent: { type: Boolean, default: false },
    
    exchangeRate: { type: Number },
    quotedAt: { type: Date },
    
    ipAddress: { type: String },
    userAgent: { type: String },
    affiliateId: { type: String },
    
    completedAt: { type: Date }
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
PaymentOrderSchema.index({ createdAt: -1 });
PaymentOrderSchema.index({ status: 1, quoteExpiresAt: 1 }); // For expiry checker
PaymentOrderSchema.index({ customerEmail: 1, status: 1 });

export const PaymentOrder: Model<IPaymentOrder> = 
  mongoose.models.PaymentOrder || mongoose.model<IPaymentOrder>('PaymentOrder', PaymentOrderSchema);

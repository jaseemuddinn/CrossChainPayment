import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * REFUND REQUESTS
 * Track refund attempts for failed/expired payments
 */
export interface IRefund extends Document {
  // Reference to original order
  orderId: string;
  paymentOrderId: mongoose.Types.ObjectId;
  
  // Refund details
  refundReason: 'expired' | 'failed' | 'customer_request' | 'overpaid' | 'underpaid' | 'duplicate';
  refundAmount: string;
  refundCoin: string;
  refundNetwork: string;
  refundAddress: string; // Customer's wallet
  
  // Processing status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // SideShift refund shift
  refundShiftId?: string;
  refundTxHash?: string;
  
  // Admin notes
  notes?: string;
  processedBy?: string; // Admin user ID
  
  // Timestamps
  createdAt: Date;
  completedAt?: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    orderId: { type: String, required: true, index: true },
    paymentOrderId: { type: Schema.Types.ObjectId, ref: 'PaymentOrder', required: true },
    
    refundReason: { 
      type: String, 
      enum: ['expired', 'failed', 'customer_request', 'overpaid', 'underpaid', 'duplicate'],
      required: true 
    },
    refundAmount: { type: String, required: true },
    refundCoin: { type: String, required: true },
    refundNetwork: { type: String, required: true },
    refundAddress: { type: String, required: true },
    
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    
    refundShiftId: { type: String },
    refundTxHash: { type: String },
    
    notes: { type: String },
    processedBy: { type: String },
    
    completedAt: { type: Date }
  },
  {
    timestamps: true,
  }
);

RefundSchema.index({ status: 1, createdAt: -1 });

export const Refund: Model<IRefund> = 
  mongoose.models.Refund || mongoose.model<IRefund>('Refund', RefundSchema);

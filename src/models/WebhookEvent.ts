import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * WEBHOOK EVENT LOG
 * Critical for debugging and audit trail
 * Records every webhook attempt from SideShift
 */
export interface IWebhookEvent extends Document {
  // Event identification
  eventId: string;
  eventType: string; // 'shift.created', 'shift.settled', etc.
  
  // Related entities
  shiftId?: string;
  orderId?: string;
  
  // Webhook data
  payload: any; // Full webhook payload from SideShift
  headers: Record<string, string>;
  
  // Processing status
  processed: boolean;
  processedAt?: Date;
  processingError?: string;
  retryCount: number;
  
  // Metadata
  receivedAt: Date;
  sourceIP?: string;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    
    shiftId: { type: String, index: true },
    orderId: { type: String, index: true },
    
    payload: { type: Schema.Types.Mixed, required: true },
    headers: { type: Map, of: String },
    
    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date },
    processingError: { type: String },
    retryCount: { type: Number, default: 0 },
    
    receivedAt: { type: Date, default: Date.now, index: true },
    sourceIP: { type: String }
  },
  {
    timestamps: true,
  }
);

// TTL index: Auto-delete webhook events after 90 days
WebhookEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 7776000 });

export const WebhookEvent: Model<IWebhookEvent> = 
  mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

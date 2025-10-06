'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Clock, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentData {
  orderId: string;
  orderNumber: string;
  status: string;
  depositAddress: string;
  depositAmount: string;
  depositCoin: string;
  depositNetwork: string;
  depositTxHash?: string;
  totalUSD: number;
  items: Array<{
    name: string;
    quantity: number;
    priceUSD: number;
  }>;
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

export default function PaymentPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Fetch payment data
  const fetchPayment = async () => {
    try {
      const response = await fetch(`/api/payments/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setPayment(data.data);
        
        // Auto-poll for status updates if not completed
        if (!['completed', 'expired', 'failed', 'refunded'].includes(data.data.status)) {
          // Poll SideShift for updates
          fetch(`/api/payments/${orderId}/poll`, { method: 'POST' })
            .catch(err => console.error('Poll error:', err));
        }
      } else {
        toast.error('Payment not found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load payment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
    
    // Poll every 10 seconds for updates
    const interval = setInterval(() => {
      if (!payment || ['completed', 'expired', 'failed', 'refunded'].includes(payment.status)) {
        clearInterval(interval);
        return;
      }
      fetchPayment();
    }, 10000);

    return () => clearInterval(interval);
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    if (!payment?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(payment.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [payment?.expiresAt]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any; description: string }> = {
      pending: {
        label: 'Waiting for Payment',
        color: 'text-yellow-600 bg-yellow-50',
        icon: Clock,
        description: 'Send the exact amount to the address below'
      },
      detecting: {
        label: 'Payment Detected',
        color: 'text-blue-600 bg-blue-50',
        icon: Loader2,
        description: 'Transaction found! Waiting for confirmations...'
      },
      processing: {
        label: 'Processing',
        color: 'text-blue-600 bg-blue-50',
        icon: Loader2,
        description: 'Converting your payment...'
      },
      settling: {
        label: 'Settling',
        color: 'text-blue-600 bg-blue-50',
        icon: Loader2,
        description: 'Sending funds to merchant...'
      },
      completed: {
        label: 'Payment Complete!',
        color: 'text-green-600 bg-green-50',
        icon: CheckCircle2,
        description: 'Your payment has been confirmed. Check your email for details.'
      },
      expired: {
        label: 'Payment Expired',
        color: 'text-red-600 bg-red-50',
        icon: XCircle,
        description: 'This payment request has expired. Please create a new one.'
      },
      failed: {
        label: 'Payment Failed',
        color: 'text-red-600 bg-red-50',
        icon: XCircle,
        description: 'The payment could not be processed. Contact support.'
      },
      refunded: {
        label: 'Refunded',
        color: 'text-orange-600 bg-orange-50',
        icon: AlertCircle,
        description: 'Your payment has been refunded.'
      },
    };

    return statusMap[status] || statusMap.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <div className="text-slate-600">Loading payment...</div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <div className="text-xl font-bold mb-2">Payment Not Found</div>
          <div className="text-slate-600">This payment may have expired or doesn't exist.</div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(payment.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Status Header */}
        <div className={`rounded-2xl p-6 mb-6 ${statusInfo.color}`}>
          <div className="flex items-center gap-4">
            <StatusIcon className={`w-12 h-12 ${statusInfo.icon === Loader2 ? 'animate-spin' : ''}`} />
            <div className="flex-1">
              <div className="text-2xl font-bold">{statusInfo.label}</div>
              <div className="text-sm opacity-80 mt-1">{statusInfo.description}</div>
            </div>
            {payment.status === 'pending' && (
              <div className="text-right">
                <div className="text-sm opacity-60">Expires in</div>
                <div className="text-3xl font-bold font-mono">{timeLeft}</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Payment Instructions */}
          <div className="space-y-6">
            {/* QR Code */}
            {payment.status === 'pending' && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-lg font-bold mb-2">Scan to Pay</div>
                  <div className="bg-white p-4 inline-block rounded-xl border-4 border-slate-100">
                    <QRCodeSVG 
                      value={`${payment.depositCoin}:${payment.depositAddress}?amount=${payment.depositAmount}`}
                      size={200}
                      level="M"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-lg font-bold mb-4">Payment Details</div>
              
              <div className="space-y-4">
                {/* Amount */}
                <div>
                  <div className="text-sm text-slate-600 mb-1">Send Exactly</div>
                  <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg">
                    <code className="flex-1 font-mono font-bold text-lg">
                      {payment.depositAmount} {payment.depositCoin.toUpperCase()}
                    </code>
                    <button
                      onClick={() => copyToClipboard(payment.depositAmount, 'Amount')}
                      className="p-2 hover:bg-slate-200 rounded"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <div className="text-sm text-slate-600 mb-1">
                    To Address ({payment.depositNetwork})
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg">
                    <code className="flex-1 font-mono text-sm break-all">
                      {payment.depositAddress}
                    </code>
                    <button
                      onClick={() => copyToClipboard(payment.depositAddress, 'Address')}
                      className="p-2 hover:bg-slate-200 rounded flex-shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Transaction Hash */}
                {payment.depositTxHash && (
                  <div>
                    <div className="text-sm text-slate-600 mb-1">Transaction Hash</div>
                    <code className="block bg-slate-50 p-3 rounded-lg font-mono text-xs break-all">
                      {payment.depositTxHash}
                    </code>
                  </div>
                )}
              </div>

              {/* Warning */}
              {payment.status === 'pending' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <strong>⚠️ Important:</strong> Send the exact amount to avoid delays. 
                  Double-check the network before sending!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Info */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-lg font-bold mb-4">Order Summary</div>
              <div className="text-sm text-slate-600 mb-4">
                Order #{payment.orderNumber}
              </div>
              
              {payment.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-slate-600">Qty: {item.quantity}</div>
                  </div>
                  <div className="font-bold">${item.priceUSD}</div>
                </div>
              ))}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>${payment.totalUSD} USD</span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-lg font-bold mb-4">Status History</div>
              <div className="space-y-3">
                {payment.statusHistory.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{entry.status.replace('_', ' ')}</div>
                      <div className="text-xs text-slate-600">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      {entry.note && (
                        <div className="text-xs text-slate-500 mt-1">{entry.note}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

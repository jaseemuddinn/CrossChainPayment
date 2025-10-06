'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ChevronDown } from 'lucide-react';

// Demo product (replace with your actual cart/products)
const DEMO_PRODUCT = {
  items: [
    {
      productId: 'prod_123',
      name: 'Premium Digital Product',
      quantity: 1,
      priceUSD: 49.99,
    },
  ],
  totalUSD: 49.99,
};

// Popular crypto options
// NOTE: Network names must match SideShift API exactly
// Common networks: 'ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'bitcoin', 'bsc'
const CRYPTO_OPTIONS = [
  { coin: 'btc', name: 'Bitcoin', networks: ['bitcoin'] },
  { coin: 'eth', name: 'Ethereum', networks: ['ethereum', 'arbitrum', 'optimism', 'base'] },
  { coin: 'usdc', name: 'USD Coin', networks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'] },
  { coin: 'usdt', name: 'Tether', networks: ['ethereum', 'arbitrum', 'optimism', 'polygon'] },
  { coin: 'sol', name: 'Solana', networks: ['solana'] },
  { coin: 'bnb', name: 'BNB', networks: ['bsc'] },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [selectedCoin, setSelectedCoin] = useState('eth');
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [refundWallet, setRefundWallet] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedCoinData = CRYPTO_OPTIONS.find(c => c.coin === selectedCoin);

  const handleCreatePayment = async () => {
    // Validation
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...DEMO_PRODUCT,
          customerEmail: email,
          customerWallet: refundWallet || undefined,
          depositCoin: selectedCoin,
          depositNetwork: selectedNetwork,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      // Redirect to payment page
      router.push(`/payment/${data.data.orderId}`);
      toast.success('Payment created! Follow instructions to complete.');

    } catch (error: any) {
      console.error('Payment creation error:', error);
      toast.error(error.message || 'Failed to create payment');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Checkout</h1>
          <p className="text-slate-600">Complete your purchase with crypto</p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          {DEMO_PRODUCT.items.map((item) => (
            <div key={item.productId} className="flex justify-between items-center mb-2">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-slate-600">Qty: {item.quantity}</div>
              </div>
              <div className="font-bold">${item.priceUSD}</div>
            </div>
          ))}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span>${DEMO_PRODUCT.totalUSD} USD</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-6">Payment Details</h2>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              We'll send payment confirmation here
            </p>
          </div>

          {/* Crypto Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Pay With *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CRYPTO_OPTIONS.map((crypto) => (
                <button
                  key={crypto.coin}
                  onClick={() => {
                    setSelectedCoin(crypto.coin);
                    setSelectedNetwork(crypto.networks[0]);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedCoin === crypto.coin
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold uppercase">{crypto.coin}</div>
                  <div className="text-sm text-slate-600">{crypto.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Network Selection */}
          {selectedCoinData && selectedCoinData.networks.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Network *
              </label>
              <div className="relative">
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {selectedCoinData.networks.map((network) => (
                    <option key={network} value={network}>
                      {network.charAt(0).toUpperCase() + network.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Refund Wallet (Optional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Refund Wallet (Optional)
            </label>
            <input
              type="text"
              value={refundWallet}
              onChange={(e) => setRefundWallet(e.target.value)}
              placeholder={`Your ${selectedCoin.toUpperCase()} wallet address`}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              For automatic refunds if payment fails
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleCreatePayment}
            disabled={isCreating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Payment...
              </>
            ) : (
              <>Continue to Payment</>
            )}
          </button>

          <p className="text-xs text-center text-slate-500 mt-4">
            Payment expires in 10 minutes. Powered by SideShift.ai
          </p>
        </div>
      </div>
    </div>
  );
}

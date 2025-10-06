import Link from 'next/link';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Accept Crypto Payments
            <br />
            On Any Chain
          </h1>
          <p className="text-xl text-slate-600 mb-12">
            Let customers pay with ANY cryptocurrency while you receive your preferred token.
            <br />
            Powered by SideShift.ai cross-chain swaps.
          </p>

          {/* Demo Product Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto mb-12">
            <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl mb-6 flex items-center justify-center">
              <Zap className="w-24 h-24 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Premium Digital Product</h3>
            <p className="text-slate-600 mb-6">
              Instant delivery after payment confirmation
            </p>
            <div className="text-4xl font-bold mb-6">$49.99 USD</div>
            <Link 
              href="/checkout"
              className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Pay with Crypto
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <Globe className="w-12 h-12 text-blue-600 mb-4 mx-auto" />
              <h3 className="font-bold text-lg mb-2">Multi-Chain</h3>
              <p className="text-slate-600 text-sm">
                Accept BTC, ETH, SOL, and 100+ tokens across multiple networks
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <Zap className="w-12 h-12 text-purple-600 mb-4 mx-auto" />
              <h3 className="font-bold text-lg mb-2">Instant Swaps</h3>
              <p className="text-slate-600 text-sm">
                Auto-convert to your preferred settlement token in real-time
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <Shield className="w-12 h-12 text-green-600 mb-4 mx-auto" />
              <h3 className="font-bold text-lg mb-2">No Custody</h3>
              <p className="text-slate-600 text-sm">
                Non-custodial. Funds go directly to your wallet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

# Cross-Chain Crypto Payment Gateway

Production-ready payment gateway for e-commerce that accepts any cryptocurrency on any blockchain using SideShift.ai for cross-chain swaps.

## 🎯 Features

- **Multi-Chain Support**: Accept BTC, ETH, SOL, USDC, and 100+ tokens across multiple networks
- **Auto-Conversion**: Customer pays in any crypto → you receive your preferred settlement token
- **Real-Time Tracking**: WebSocket + polling for live payment status updates
- **QR Code Payments**: Mobile wallet-friendly payment flow
- **Refund Automation**: Handle failed/expired payments programmatically
- **Webhook Integration**: Real-time updates from SideShift API
- **Production Database**: MongoDB for flexible payment data storage

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MongoDB

Either use MongoDB Atlas (cloud) or local MongoDB:

**Option A: MongoDB Atlas (Recommended)**

1. Create free account at https://www.mongodb.com/atlas
2. Create a cluster
3. Get connection string

**Option B: Local MongoDB**

```bash
# Install MongoDB locally and start it
mongod --dbpath ./data/db
```

### 3. Get SideShift API Credentials

1. Visit https://sideshift.ai
2. Create account (auto-creates when you use the site)
3. Go to https://sideshift.ai/account
4. Copy your **Private Key** (keep secret!)
5. Copy your **Account ID** (affiliate ID)

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# SideShift API
SIDESHIFT_SECRET=your_private_key_here
SIDESHIFT_AFFILIATE_ID=your_affiliate_id_here

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crosschain_payments

# Where YOU want to receive payments
SETTLEMENT_COIN=usdc
SETTLEMENT_NETWORK=arbitrum
SETTLEMENT_ADDRESS=0xYourWalletAddress

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 📁 Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API Routes
│   │   ├── payments/      # Payment creation & status
│   │   ├── crypto/        # Supported coins
│   │   └── webhooks/      # SideShift webhooks
│   ├── checkout/          # Checkout page
│   ├── payment/[orderId]/ # Payment status page
│   └── page.tsx           # Landing page
├── lib/
│   ├── mongodb.ts         # MongoDB connection
│   └── sideshift.ts       # SideShift API client
├── models/
│   ├── PaymentOrder.ts    # Payment schema
│   ├── WebhookEvent.ts    # Webhook log schema
│   └── Refund.ts          # Refund schema
└── services/
    └── payment.service.ts  # Payment business logic
```

## 🔄 Payment Flow

1. **Customer selects product** → Checkout page
2. **Choose crypto** → BTC, ETH, SOL, etc. + network
3. **Create payment** → POST `/api/payments/create`
   - Request quote from SideShift
   - Create fixed-rate shift
   - Generate deposit address
4. **Customer sends crypto** → Display QR code + address
5. **Real-time monitoring**
   - Webhook updates from SideShift
   - Polling fallback every 10 seconds
6. **Order completion** → Funds settled to your wallet
7. **Fulfillment** → Trigger your business logic

## 🔌 API Endpoints

### Create Payment

```typescript
POST /api/payments/create
{
  "items": [...],
  "totalUSD": 49.99,
  "customerEmail": "user@example.com",
  "depositCoin": "eth",
  "depositNetwork": "arbitrum"
}
```

### Get Payment Status

```typescript
GET / api / payments / { orderId };
```

### Poll for Updates

```typescript
POST / api / payments / { orderId } / poll;
```

### Webhook (SideShift)

```typescript
POST / api / webhooks / sideshift;
```

## 🛡️ Security Best Practices

1. **Never expose `SIDESHIFT_SECRET`** in frontend code
2. **Validate webhook signatures** (if implementing HMAC)
3. **Rate limit API endpoints** in production
4. **Use HTTPS** for all production traffic
5. **Verify settlement addresses** before going live
6. **Monitor for underpayment/overpayment** scenarios

## 🚨 Production Deployment Checklist

- [ ] Set up MongoDB Atlas production cluster
- [ ] Configure proper environment variables
- [ ] Set webhook URL in SideShift dashboard: `https://yourdomain.com/api/webhooks/sideshift`
- [ ] Enable HTTPS/SSL certificate
- [ ] Set up email notifications (Resend, SendGrid, etc.)
- [ ] Configure order fulfillment webhooks
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Add rate limiting middleware
- [ ] Test refund flow thoroughly
- [ ] Configure backup wallet for settlements
- [ ] Set up alerts for failed webhooks

## 📊 Database Indexes

MongoDB indexes are auto-created from schemas:

- `orderId` (unique)
- `shiftId` (unique)
- `customerEmail`
- `status`
- `createdAt`
- `quoteExpiresAt`

## 🔧 Customization

### Change Settlement Preferences

Edit `.env`:

```env
SETTLEMENT_COIN=usdc
SETTLEMENT_NETWORK=arbitrum
SETTLEMENT_ADDRESS=your_wallet
```

### Add More Coins

Edit `src/app/checkout/page.tsx`:

```typescript
const CRYPTO_OPTIONS = [
  { coin: "btc", name: "Bitcoin", networks: ["mainnet"] },
  // Add more...
];
```

### Custom Order Fulfillment

Edit `src/services/payment.service.ts`:

```typescript
private async handleOrderCompletion(order: IPaymentOrder) {
  // Your logic here:
  // - Send confirmation email
  // - Deliver digital goods
  // - Update inventory
  // - Notify webhooks
}
```

## 🐛 Troubleshooting

### Payment not updating?

- Check webhook URL is accessible publicly
- Verify SideShift credentials in `.env`
- Check browser console and server logs

### Quote expired errors?

- Quotes expire in ~10 minutes
- Customer must complete payment before expiry
- Auto-poll handles expiration gracefully

### Wrong network selected?

- Each coin/network combo must be supported by SideShift
- Check `/api/crypto/supported` for valid combinations

## 📚 Resources

- [SideShift API Docs](https://docs.sideshift.ai)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Mongoose Docs](https://mongoosejs.com)

## 📝 License

MIT

## 🤝 Support

For SideShift API issues: https://help.sideshift.ai
For this integration: Open an issue on GitHub

---

**Built with Next.js 14, MongoDB, TypeScript, and SideShift.ai**

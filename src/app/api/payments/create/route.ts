import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPaymentService } from '@/services/payment.service';

const CreatePaymentSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    quantity: z.number().positive(),
    priceUSD: z.number().positive(),
  })),
  totalUSD: z.number().positive(),
  customerEmail: z.string().email(),
  customerWallet: z.string().optional(),
  depositCoin: z.string(),
  depositNetwork: z.string(),
});

/**
 * POST /api/payments/create
 * Create a new payment order with SideShift
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = CreatePaymentSchema.parse(body);

    // Get IP and user agent for fraud detection
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create payment
    const paymentService = getPaymentService();
    const result = await paymentService.createPayment({
      ...validatedData,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.order.orderId,
        orderNumber: result.order.orderNumber,
        depositAddress: result.depositAddress,
        depositAmount: result.depositAmount,
        depositCoin: result.order.depositCoin,
        depositNetwork: result.order.depositNetwork,
        qrCodeData: result.qrCodeData,
        expiresAt: result.expiresAt,
        expiresInMinutes: result.expiresInMinutes,
        status: result.order.status,
      },
    });

  } catch (error: any) {
    console.error('[API] Create payment error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error.name === 'SideShiftAPIError') {
      return NextResponse.json(
        { success: false, error: 'Payment provider error', details: error.message },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

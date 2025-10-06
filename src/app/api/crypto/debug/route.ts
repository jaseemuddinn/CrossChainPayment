import { NextResponse } from 'next/server';
import { getSideShiftClient } from '@/lib/sideshift';

/**
 * GET /api/crypto/debug
 * Debug endpoint to see all supported coins and networks
 * REMOVE IN PRODUCTION
 */
export async function GET() {
  try {
    const sideshift = getSideShiftClient();
    const coins = await sideshift.getSupportedCoins();

    // Format for easy reading
    const formatted = coins.map(coin => ({
      coin: coin.coin,
      name: coin.name,
      networks: coin.networks,
    }));

    return NextResponse.json({
      success: true,
      total: formatted.length,
      data: formatted,
    });

  } catch (error: any) {
    console.error('[API] Debug error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.data 
      },
      { status: 500 }
    );
  }
}

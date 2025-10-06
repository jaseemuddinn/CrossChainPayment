import { NextRequest, NextResponse } from 'next/server';
import { getSideShiftClient } from '@/lib/sideshift';

/**
 * GET /api/crypto/supported
 * Get list of supported coins and networks
 */
export async function GET() {
  try {
    const sideshift = getSideShiftClient();
    const coins = await sideshift.getSupportedCoins();

    // Filter to most popular coins for better UX
    const popularCoins = ['btc', 'eth', 'usdc', 'usdt', 'sol', 'bnb', 'matic', 'arb'];
    
    const filtered = coins
      .filter(coin => popularCoins.includes(coin.coin))
      .map(coin => ({
        coin: coin.coin,
        name: coin.name,
        networks: coin.networks,
      }));

    return NextResponse.json({
      success: true,
      data: filtered,
    });

  } catch (error: any) {
    console.error('[API] Get supported coins error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supported coins' },
      { status: 500 }
    );
  }
}

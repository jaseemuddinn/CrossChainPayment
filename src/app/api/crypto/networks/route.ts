import { NextResponse } from 'next/server';
import { getSideShiftClient } from '@/lib/sideshift';

/**
 * GET /api/crypto/networks
 * Get supported networks for a specific coin
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coin = searchParams.get('coin');

    if (!coin) {
      return NextResponse.json(
        { success: false, error: 'Coin parameter required' },
        { status: 400 }
      );
    }

    const sideshift = getSideShiftClient();
    const coins = await sideshift.getSupportedCoins();
    
    const coinData = coins.find(c => c.coin === coin);
    
    if (!coinData) {
      return NextResponse.json(
        { success: false, error: 'Coin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        coin: coinData.coin,
        name: coinData.name,
        networks: coinData.networks,
      },
    });

  } catch (error: any) {
    console.error('[API] Get networks error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch networks' },
      { status: 500 }
    );
  }
}

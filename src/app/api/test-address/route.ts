import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify settlement address configuration
 * Visit: http://localhost:3000/api/test-address
 */
export async function GET() {
  const address = process.env.SETTLEMENT_ADDRESS;
  const network = process.env.SETTLEMENT_NETWORK;
  const coin = process.env.SETTLEMENT_COIN;

  const isPlaceholder = address?.includes('Your') || 
                        address?.includes('0x...') || 
                        address?.includes('your') ||
                        !address ||
                        address === '0xYourWalletAddressHere';

  const warnings = [];
  const errors = [];

  // Check if address is set
  if (!address) {
    errors.push('SETTLEMENT_ADDRESS is not set in .env');
  } else if (isPlaceholder) {
    errors.push('SETTLEMENT_ADDRESS is still a placeholder - UPDATE IT!');
  }

  // Validate address format based on network
  if (address && !isPlaceholder) {
    if (network?.includes('ethereum') || network?.includes('arbitrum') || 
        network?.includes('optimism') || network?.includes('polygon') || 
        network?.includes('base') || network?.includes('bsc')) {
      // EVM address validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        errors.push(`Invalid Ethereum address format. Expected: 0x followed by 40 hex characters`);
      }
    } else if (network?.includes('bitcoin')) {
      // Bitcoin address validation (basic)
      if (!/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)) {
        warnings.push('Bitcoin address format may be invalid');
      }
    } else if (network?.includes('solana')) {
      // Solana address validation (basic)
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        warnings.push('Solana address format may be invalid');
      }
    }
  }

  // Check network is set
  if (!network) {
    errors.push('SETTLEMENT_NETWORK is not set in .env');
  }

  // Check coin is set
  if (!coin) {
    errors.push('SETTLEMENT_COIN is not set in .env');
  }

  const isValid = errors.length === 0;
  const status = isValid ? (warnings.length > 0 ? 'warning' : 'ok') : 'error';

  return NextResponse.json({
    status,
    valid: isValid,
    settlement: {
      coin,
      network,
      address: address || 'NOT SET',
      addressLength: address?.length || 0,
    },
    checks: {
      addressSet: !!address && !isPlaceholder,
      networkSet: !!network,
      coinSet: !!coin,
      formatValid: errors.length === 0,
    },
    errors,
    warnings,
    message: isValid 
      ? '✅ Settlement configuration looks good!'
      : '❌ Fix the errors above before accepting payments',
    nextSteps: isValid 
      ? [
          '1. Test with a small payment first',
          '2. Verify funds arrive at your address',
          '3. Then enable for production'
        ]
      : [
          '1. Copy .env.example to .env if not done',
          '2. Add your real wallet address to SETTLEMENT_ADDRESS',
          '3. Verify network name matches SideShift API',
          '4. Restart dev server'
        ]
  });
}

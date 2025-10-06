import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format crypto amount for display
 */
export function formatCryptoAmount(amount: string | number, decimals: number = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals);
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Shorten crypto address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Get block explorer URL for transaction
 */
export function getExplorerUrl(txHash: string, network: string): string {
  const explorers: Record<string, string> = {
    mainnet: `https://etherscan.io/tx/${txHash}`,
    arbitrum: `https://arbiscan.io/tx/${txHash}`,
    optimism: `https://optimistic.etherscan.io/tx/${txHash}`,
    polygon: `https://polygonscan.com/tx/${txHash}`,
    base: `https://basescan.org/tx/${txHash}`,
    bsc: `https://bscscan.com/tx/${txHash}`,
    bitcoin: `https://blockchair.com/bitcoin/transaction/${txHash}`,
    solana: `https://solscan.io/tx/${txHash}`,
  };

  return explorers[network] || `https://etherscan.io/tx/${txHash}`;
}

/**
 * Calculate time remaining from expiry date
 */
export function getTimeRemaining(expiryDate: Date): {
  total: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const total = new Date(expiryDate).getTime() - new Date().getTime();
  const expired = total <= 0;

  return {
    total,
    minutes: expired ? 0 : Math.floor(total / 60000),
    seconds: expired ? 0 : Math.floor((total % 60000) / 1000),
    expired,
  };
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Get human-readable network name
 */
export function getNetworkName(network: string): string {
  const names: Record<string, string> = {
    mainnet: 'Ethereum',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    polygon: 'Polygon',
    base: 'Base',
    bsc: 'BNB Chain',
    bitcoin: 'Bitcoin',
    solana: 'Solana',
  };

  return names[network] || network;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate crypto address format
 */
export function isValidAddress(address: string, type: 'ethereum' | 'bitcoin' | 'solana'): boolean {
  const patterns = {
    ethereum: /^0x[a-fA-F0-9]{40}$/,
    bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/,
    solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  };

  return patterns[type]?.test(address) || false;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}

/**
 * Detect if user is on mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Generate wallet deep link
 */
export function getWalletDeepLink(coin: string, address: string, amount?: string): string {
  const baseLink = `${coin}:${address}`;
  return amount ? `${baseLink}?amount=${amount}` : baseLink;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

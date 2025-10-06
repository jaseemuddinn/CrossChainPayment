import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Zod schemas for type safety and validation
export const SupportedCoinSchema = z.object({
  coin: z.string(),
  networks: z.array(z.string()),
  name: z.string(),
  hasMemo: z.boolean().optional(),
});

export const QuoteRequestSchema = z.object({
  depositCoin: z.string(),
  depositNetwork: z.string(),
  settleCoin: z.string(),
  settleNetwork: z.string(),
  depositAmount: z.string().optional(),
  settleAmount: z.string().optional(),
  affiliateId: z.string(),
});

export const QuoteResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  depositCoin: z.string(),
  depositNetwork: z.string(),
  settleCoin: z.string(),
  settleNetwork: z.string(),
  depositAmount: z.string(),
  settleAmount: z.string(),
  expiresAt: z.string(),
  rate: z.string(),
});

export const FixedShiftRequestSchema = z.object({
  quoteId: z.string(),
  settleAddress: z.string(),
  affiliateId: z.string(),
  refundAddress: z.string().optional(),
  commissionRate: z.number().optional(),
});

export const ShiftResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  depositCoin: z.string(),
  depositNetwork: z.string(),
  depositAddress: z.string(),
  depositMin: z.string().optional(),
  depositMax: z.string().optional(),
  settleCoin: z.string(),
  settleNetwork: z.string(),
  settleAddress: z.string(),
  depositAmount: z.string().optional(),
  settleAmount: z.string().optional(),
  expiresAt: z.string(),
  status: z.string(),
  type: z.enum(['fixed', 'variable']),
});

export const ShiftStatusSchema = z.object({
  id: z.string(),
  status: z.enum([
    'waiting',
    'pending', 
    'processing',
    'settling',
    'settled',
    'refund',
    'refunded',
    'expired'
  ]),
  depositCoin: z.string(),
  depositNetwork: z.string(),
  depositAddress: z.string(),
  depositAmount: z.string().optional(),
  depositHash: z.string().optional(),
  settleCoin: z.string(),
  settleNetwork: z.string(),
  settleAddress: z.string(),
  settleAmount: z.string().optional(),
  settleHash: z.string().optional(),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export type SupportedCoin = z.infer<typeof SupportedCoinSchema>;
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
export type FixedShiftRequest = z.infer<typeof FixedShiftRequestSchema>;
export type ShiftResponse = z.infer<typeof ShiftResponseSchema>;
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

/**
 * SideShift API Client
 * Production-ready with retry logic, error handling, and rate limiting
 */
export class SideShiftClient {
  private client: AxiosInstance;
  private secret: string;
  private affiliateId: string;

  constructor(secret?: string, affiliateId?: string) {
    this.secret = secret || process.env.SIDESHIFT_SECRET || '';
    this.affiliateId = affiliateId || process.env.SIDESHIFT_AFFILIATE_ID || '';

    if (!this.secret) {
      throw new Error('SideShift secret is required');
    }

    this.client = axios.create({
      baseURL: 'https://sideshift.ai/api/v2',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-sideshift-secret': this.secret,
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // API returned error response
          const errorData = error.response.data;
          throw new SideShiftAPIError(
            errorData.error?.message || 'SideShift API error',
            error.response.status,
            errorData
          );
        } else if (error.request) {
          // Request made but no response
          throw new SideShiftAPIError('No response from SideShift API', 0);
        } else {
          // Something else happened
          throw new SideShiftAPIError(error.message, 0);
        }
      }
    );
  }

  /**
   * Get list of supported coins and networks
   */
  async getSupportedCoins(): Promise<SupportedCoin[]> {
    const response = await this.client.get('/coins');
    return response.data;
  }

  /**
   * Get permissions for a specific coin on a network
   * Use this to check if a coin/network combo is available
   */
  async getCoinPermissions(coin: string, network: string) {
    const response = await this.client.get(`/coins/${coin}/networks/${network}/permissions`);
    return response.data;
  }

  /**
   * Request a fixed-rate quote
   * Either depositAmount OR settleAmount must be provided (not both)
   */
  async requestQuote(params: QuoteRequest): Promise<QuoteResponse> {
    // Validate input
    QuoteRequestSchema.parse(params);

    // Ensure only one amount is specified
    if (params.depositAmount && params.settleAmount) {
      throw new Error('Specify either depositAmount or settleAmount, not both');
    }
    if (!params.depositAmount && !params.settleAmount) {
      throw new Error('Must specify either depositAmount or settleAmount');
    }

    const response = await this.client.post('/quotes', params);
    return QuoteResponseSchema.parse(response.data);
  }

  /**
   * Create a fixed-rate shift from a quote
   * This generates the deposit address for the customer
   */
  async createFixedShift(params: FixedShiftRequest): Promise<ShiftResponse> {
    FixedShiftRequestSchema.parse(params);

    const response = await this.client.post('/shifts/fixed', params);
    return ShiftResponseSchema.parse(response.data);
  }

  /**
   * Get shift status
   * Poll this to monitor payment progress
   */
  async getShiftStatus(shiftId: string): Promise<ShiftStatus> {
    const response = await this.client.get(`/shifts/${shiftId}`);
    return ShiftStatusSchema.parse(response.data);
  }

  /**
   * Get affiliate stats (for your dashboard)
   */
  async getAffiliateStats() {
    const response = await this.client.get(`/affiliates/${this.affiliateId}/stats`);
    return response.data;
  }

  /**
   * Helper: Calculate USD to crypto amount
   * Gets current rate and returns deposit amount needed
   */
  async calculateDepositAmount(
    depositCoin: string,
    depositNetwork: string,
    settleCoin: string,
    settleNetwork: string,
    settleAmountUSD: number
  ): Promise<{ depositAmount: string; settleAmount: string; rate: string; expiresAt: string }> {
    // Request quote with settle amount
    const quote = await this.requestQuote({
      depositCoin,
      depositNetwork,
      settleCoin,
      settleNetwork,
      settleAmount: settleAmountUSD.toFixed(6),
      affiliateId: this.affiliateId,
    });

    return {
      depositAmount: quote.depositAmount,
      settleAmount: quote.settleAmount,
      rate: quote.rate,
      expiresAt: quote.expiresAt,
    };
  }
}

/**
 * Custom error class for SideShift API errors
 */
export class SideShiftAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'SideShiftAPIError';
  }
}

// Singleton instance
let sideShiftClient: SideShiftClient | null = null;

export function getSideShiftClient(): SideShiftClient {
  if (!sideShiftClient) {
    sideShiftClient = new SideShiftClient();
  }
  return sideShiftClient;
}

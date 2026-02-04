import { Request } from 'express';
import { z } from 'zod';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      userEmail?: string;
    }
  }
}

// ==================== Constants ====================
export const DEFAULT_USER_BALANCE = 1_000_000; // cents ($10,000)
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAGIC_TOKEN_EXPIRY = '10m';
export const SESSION_TOKEN_EXPIRY = '7d';

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_SIGNIN_MAX = 5;
export const RATE_LIMIT_MAGIC_MAX = 10;

// Trade limits
export const MIN_LEVERAGE = 1;
export const MAX_LEVERAGE = 100;
export const MAX_MARGIN = 10_000_000; // cents ($100,000)

// Price decimals
export const DEFAULT_DECIMALS = 2;

// ==================== Zod Schemas ====================

export const AssetSymbolSchema = z.enum(['BTC', 'ETH', 'SOL']);
export type AssetSym = z.infer<typeof AssetSymbolSchema>;

export const TradeSideSchema = z.enum(['LONG', 'SHORT']);
export type Side = z.infer<typeof TradeSideSchema>;

// Sign-in request
export const SigninSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type SigninBody = z.infer<typeof SigninSchema>;

// Magic token exchange
export const MagicExchangeSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type MagicExchangeBody = z.infer<typeof MagicExchangeSchema>;

// Trade creation
export const TradeCreateSchema = z.object({
  asset: AssetSymbolSchema,
  type: z.enum(['long', 'short']),
  margin: z.number().positive('Margin must be positive').max(10_000_000, 'Margin too large'),
  leverage: z.number().int().min(1, 'Minimum leverage is 1x').max(100, 'Maximum leverage is 100x'),
  slippage: z.number().optional().default(100),
});
export type TradeCreateBody = z.infer<typeof TradeCreateSchema>;

// Trade close
export const TradeCloseSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
});
export type TradeCloseBody = z.infer<typeof TradeCloseSchema>;

// ==================== Validation Helper ====================

import { Response, NextFunction } from 'express';

export function validate<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return res.status(400).json({ 
        ok: false, 
        error: 'Validation failed', 
        details: errors 
      });
    }
    req.body = result.data;
    next();
  };
}

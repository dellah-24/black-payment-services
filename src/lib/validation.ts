/**
 * Input Validation Schemas using Zod
 * Provides type-safe validation for all user inputs
 */

import { z } from 'zod';

// Chain key validation
export const ChainKeySchema = z.enum([
  'tron',
  'ethereum',
  'bsc',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'celo',
  'linea',
  'base',
  'solana',
]);

// Ethereum address validation
export const EthereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');

// TRON address validation
export const TronAddressSchema = z
  .string()
  .regex(/^T[a-zA-Z0-9]{33}$/, 'Invalid TRON address format');

// Generic crypto address validation
export const CryptoAddressSchema = z.union([
  EthereumAddressSchema,
  TronAddressSchema,
]);

// Amount validation (positive number as string)
export const AmountSchema = z
  .string()
  .refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be a positive number'
  );

// BigInt amount validation
export const BigIntAmountSchema = z.bigint().positive('Amount must be positive');

// Password validation
export const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password must contain at least one special character'
  );

// Mnemonic validation
export const MnemonicSchema = z
  .string()
  .refine(
    (val) => {
      const words = val.trim().split(/\s+/);
      return words.length === 12 || words.length === 24;
    },
    'Mnemonic must be 12 or 24 words'
  );

// Private key validation
export const PrivateKeySchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid private key format');

// Transfer parameters validation
export const TransferSchema = z.object({
  to: CryptoAddressSchema,
  amount: AmountSchema,
  chain: ChainKeySchema,
});

// Wallet import validation
export const WalletImportSchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
  password: PasswordSchema,
});

// Wallet creation validation
export const WalletCreateSchema = z.object({
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

// Profile update validation
export const ProfileUpdateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores'
    )
    .optional(),
  email: z.string().email('Invalid email format').optional(),
  avatar_url: z.string().url('Invalid URL format').optional(),
});

// MoonPay configuration validation
export const MoonPayConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
  isTestnet: z.boolean().optional().default(false),
});

// Fiat request parameters validation
export const FiatRequestSchema = z.object({
  fiatCurrency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .optional(),
  fiatAmount: z.number().positive('Amount must be positive').optional(),
  cryptoAmount: z.number().positive('Amount must be positive').optional(),
  chain: ChainKeySchema.optional(),
  config: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      redirectURL: z.string().url().optional(),
    })
    .optional(),
});

// Gas settings validation
export const GasSettingsSchema = z.object({
  maxFeePerGas: BigIntAmountSchema.optional(),
  maxPriorityFeePerGas: BigIntAmountSchema.optional(),
  gasLimit: BigIntAmountSchema.optional(),
});

// Transaction hash validation
export const TransactionHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format');

// Email validation
export const EmailSchema = z.string().email('Invalid email format');

// URL validation
export const UrlSchema = z.string().url('Invalid URL format');

// Non-empty string validation
export const NonEmptyStringSchema = z
  .string()
  .min(1, 'String cannot be empty');

// Positive integer validation
export const PositiveIntSchema = z
  .number()
  .int()
  .positive('Must be a positive integer');

// Sign-in schema
export const SigninSchema = z.object({
  email: EmailSchema,
  password: NonEmptyStringSchema,
});

// Signup credentials schema (email, password, confirmPassword)
export const SignupCredentialsSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Signup profile schema
export const SignupProfileSchema = z.object({
  firstName: NonEmptyStringSchema,
  lastName: NonEmptyStringSchema,
  phone: z.string().optional(),
  dateOfBirth: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid date' }),
  country: NonEmptyStringSchema,
  nationality: z.string().optional(),
  state: z.string().optional(),
  city: NonEmptyStringSchema,
  addressLine1: NonEmptyStringSchema,
  addressLine2: z.string().optional(),
  postalCode: NonEmptyStringSchema,
});

// Pagination validation
export const PaginationSchema = z.object({
  page: PositiveIntSchema.optional().default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .optional()
    .default(20),
});

// Search query validation
export const SearchQuerySchema = z.object({
  query: NonEmptyStringSchema,
  ...PaginationSchema.shape,
});

// Export types inferred from schemas
export type ChainKey = z.infer<typeof ChainKeySchema>;
export type TransferParams = z.infer<typeof TransferSchema>;
export type WalletImportParams = z.infer<typeof WalletImportSchema>;
export type WalletCreateParams = z.infer<typeof WalletCreateSchema>;
export type ProfileUpdateParams = z.infer<typeof ProfileUpdateSchema>;
export type MoonPayConfigParams = z.infer<typeof MoonPayConfigSchema>;
export type FiatRequestParams = z.infer<typeof FiatRequestSchema>;
export type GasSettingsParams = z.infer<typeof GasSettingsSchema>;
export type PaginationParams = z.infer<typeof PaginationSchema>;
export type SearchQueryParams = z.infer<typeof SearchQuerySchema>;

/**
 * Validate data against a schema and return typed result
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns success/error result
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

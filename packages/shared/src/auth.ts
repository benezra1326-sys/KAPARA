import { z } from 'zod';

/** Email one-time code sign-in. Codes are 6 digits, single use, short-lived. */
export const OtpRequest = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.string().max(10).optional(),
});
export type OtpRequest = z.infer<typeof OtpRequest>;

export const OtpRequestResult = z.object({
  sent: z.boolean(),
  /** "email" when really sent, "demo" when no mail provider is configured (development only). */
  delivery: z.enum(['email', 'demo']),
  expiresInSeconds: z.number().int(),
  /** Present only in demo delivery, never in production. */
  devCode: z.string().optional(),
});
export type OtpRequestResult = z.infer<typeof OtpRequestResult>;

export const OtpVerify = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  /** Used only when the account is created. Defaults to the launch region. */
  regionCode: z.string().max(40).optional(),
  locale: z.string().max(10).optional(),
});
export type OtpVerify = z.infer<typeof OtpVerify>;

/** Sign in with Apple / Google: the app sends the provider's ID token, verified server-side. */
export const SocialSignIn = z.object({
  idToken: z.string().min(20).max(8192),
  /** Raw nonce the app generated (Apple: sha256 of it was sent to Apple). */
  nonce: z.string().max(200).optional(),
  regionCode: z.string().max(40).optional(),
  locale: z.string().max(10).optional(),
});
export type SocialSignIn = z.infer<typeof SocialSignIn>;

export const RefreshRequest = z.object({ refreshToken: z.string().min(20).max(200) });
export type RefreshRequest = z.infer<typeof RefreshRequest>;

export const AuthTokens = z.object({
  accessToken: z.string(),
  /** Opaque, rotated on every refresh. Store in secure storage only. */
  refreshToken: z.string(),
  /** Seconds until the access token expires. */
  expiresIn: z.number().int(),
  userId: z.string(),
  /** True when the account was just created: the app routes to onboarding. */
  isNewUser: z.boolean(),
  demo: z.boolean().optional(),
});
export type AuthTokens = z.infer<typeof AuthTokens>;

/** Which sign-in methods are really configured on this server (the app hides or labels the others). */
export const AuthMethods = z.object({
  emailOtp: z.enum(['email', 'demo', 'unavailable']),
  apple: z.boolean(),
  google: z.boolean(),
  demoLogin: z.boolean(),
});
export type AuthMethods = z.infer<typeof AuthMethods>;

/** Live Lemon Squeezy checkout — safe to commit (public product URL). */
export const DEFAULT_PRO_CHECKOUT_URL =
  'https://mcp-guardian.lemonsqueezy.com/checkout/buy/8a8276e9-603f-4e39-baa7-6e24aa2a75e0';

export function resolveProCheckoutUrl(): string {
  const fromEnv =
    process.env['GUARDIAN_PRO_CHECKOUT_URL']?.trim()
    || process.env['NEXT_PUBLIC_PRO_CHECKOUT_URL']?.trim();
  return fromEnv || DEFAULT_PRO_CHECKOUT_URL;
}

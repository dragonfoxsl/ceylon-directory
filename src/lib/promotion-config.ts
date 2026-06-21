/**
 * Payment details shown on the promote page (`/dashboard/[id]/promote`).
 *
 * These are configured by the site operator via environment variables so the
 * real bank / PayHere details never live in the repo. Read server-side only —
 * the promote page is a Server Component, so no `NEXT_PUBLIC_` prefix is needed
 * and the values stay out of the client bundle.
 *
 * Set whichever methods you offer; the page renders only the ones that are
 * fully configured, and falls back to a "contact us" notice if none are.
 *
 *   PROMO_BANK_NAME, PROMO_ACCOUNT_NAME, PROMO_ACCOUNT_NUMBER  (all three → bank card)
 *   PROMO_PRICE_LKR                                            (numeric, optional)
 *   PROMO_PAYHERE_URL                                          (https link → PayHere card)
 *   PROMO_CONTACT_EMAIL                                        (shown in the fallback)
 */

type BankDetails = {
  name: string;
  accountName: string;
  accountNumber: string;
};

export type PromotionPaymentConfig = {
  bank: BankDetails | null;
  /** Pre-formatted price, e.g. "LKR 7,500" — null when PROMO_PRICE_LKR is unset. */
  price: string | null;
  payhereUrl: string | null;
  contactEmail: string | null;
  /** True when at least one real payment method is configured. */
  configured: boolean;
};

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatPrice(raw: string | undefined): string | null {
  const value = clean(raw);
  if (!value) return null;
  const numeric = Number(value.replace(/[,\s]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) {
    return `LKR ${numeric.toLocaleString("en-LK")}`;
  }
  // Allow free-text amounts too (e.g. "From LKR 7,500 / week").
  return /lkr/i.test(value) ? value : `LKR ${value}`;
}

export function getPromotionPaymentConfig(): PromotionPaymentConfig {
  const bankName = clean(process.env.PROMO_BANK_NAME);
  const accountName = clean(process.env.PROMO_ACCOUNT_NAME);
  const accountNumber = clean(process.env.PROMO_ACCOUNT_NUMBER);

  const bank =
    bankName && accountName && accountNumber
      ? { name: bankName, accountName, accountNumber }
      : null;

  const payhereUrl = clean(process.env.PROMO_PAYHERE_URL);
  // Only honour http(s) links (defensive — never render a javascript: URL).
  const safePayhere =
    payhereUrl && /^https?:\/\//i.test(payhereUrl) ? payhereUrl : null;

  return {
    bank,
    price: formatPrice(process.env.PROMO_PRICE_LKR),
    payhereUrl: safePayhere,
    contactEmail: clean(process.env.PROMO_CONTACT_EMAIL),
    configured: !!(bank || safePayhere),
  };
}

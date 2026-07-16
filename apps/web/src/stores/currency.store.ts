import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  /** Rate relative to UGX (1 UGX = rate of target currency) */
  rateFromUGX: number;
  locale: string;
}

/** All rates expressed as: 1 UGX = X <currency> */
export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling',    rateFromUGX: 1,          locale: 'en-UG' },
  { code: 'USD', symbol: '$',   name: 'US Dollar',           rateFromUGX: 0.000265,   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   name: 'Euro',                rateFromUGX: 0.000243,   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',       rateFromUGX: 0.000209,   locale: 'en-GB' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling',     rateFromUGX: 0.034,      locale: 'sw-KE' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling',  rateFromUGX: 0.66,       locale: 'sw-TZ' },
  { code: 'RWF', symbol: 'RF',  name: 'Rwandan Franc',       rateFromUGX: 0.30,       locale: 'fr-RW' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand',  rateFromUGX: 0.0049,     locale: 'en-ZA' },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira',      rateFromUGX: 0.43,       locale: 'en-NG' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi',       rateFromUGX: 0.0040,     locale: 'en-GH' },
  { code: 'ETB', symbol: 'Br',  name: 'Ethiopian Birr',      rateFromUGX: 0.030,      locale: 'am-ET' },
  { code: 'EGP', symbol: 'E£',  name: 'Egyptian Pound',      rateFromUGX: 0.013,      locale: 'ar-EG' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',        rateFromUGX: 0.00192,    locale: 'zh-CN' },
];

interface CurrencyState {
  currencyCode: string;
  setCurrency: (code: string) => void;
  /** Convert a UGX amount to the selected currency */
  convert: (ugxAmount: number) => number;
  /** Format a UGX amount with the selected currency symbol */
  format: (ugxAmount: number) => string;
  getCurrency: () => Currency;
}

/** Overwrite the hardcoded fallback rates with live ones (base UGX). */
export async function loadLiveRates() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const res = await fetch(`${apiUrl}/config/fx`);
    if (!res.ok) return;
    const data = await res.json();
    const rates: Record<string, number> = data?.rates ?? {};
    if (!Object.keys(rates).length) return;
    for (const c of SUPPORTED_CURRENCIES) {
      // API base is the platform currency (normally UGX); rates map 1 base → X target
      if (typeof rates[c.code] === 'number' && rates[c.code] > 0) {
        c.rateFromUGX = rates[c.code];
      }
    }
  } catch {
    // keep compiled fallbacks
  }
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currencyCode: 'UGX',

      setCurrency: (code: string) => {
        const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
        if (found) set({ currencyCode: code });
      },

      getCurrency: () => {
        const { currencyCode } = get();
        return SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) ?? SUPPORTED_CURRENCIES[0];
      },

      convert: (ugxAmount: number) => {
        const currency = get().getCurrency();
        return ugxAmount * currency.rateFromUGX;
      },

      format: (ugxAmount: number) => {
        const currency = get().getCurrency();
        const converted = ugxAmount * currency.rateFromUGX;
        const fractionDigits = ['UGX', 'KES', 'TZS', 'RWF'].includes(currency.code) ? 0 : 2;
        try {
          return new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.code,
            maximumFractionDigits: fractionDigits,
          }).format(converted);
        } catch {
          return `${currency.symbol}${converted.toLocaleString()}`;
        }
      },
    }),
    {
      name: 'currency_pref',
    }
  )
);

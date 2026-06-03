'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe, DollarSign } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useCurrencyStore, SUPPORTED_CURRENCIES } from '@/stores/currency.store';

export function LangCurrencySwitcher() {
  const { i18n, t } = useTranslation();
  const { currencyCode, setCurrency } = useCurrencyStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'lang' | 'currency'>('lang');
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];
  const currentCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) ?? SUPPORTED_CURRENCIES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    // Update document direction for RTL languages
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    document.documentElement.dir = lang?.dir ?? 'ltr';
    document.documentElement.lang = code;
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-white/90 hover:text-white text-xs font-medium transition"
        aria-label="Language and currency switcher"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>
        <span className="opacity-60">|</span>
        <span>{currentCurrency.code}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setTab('lang')}
              className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
                tab === 'lang' ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Globe className="h-4 w-4" />
              {t('common.language')}
            </button>
            <button
              onClick={() => setTab('currency')}
              className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
                tab === 'currency' ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              {t('common.currency')}
            </button>
          </div>

          {/* Language list */}
          {tab === 'lang' && (
            <div className="max-h-72 overflow-y-auto py-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${
                    i18n.language === lang.code ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold bg-slate-100 text-slate-600">{lang.flag}</span>
                  <div className="text-left">
                    <div className="font-medium">{lang.nativeName}</div>
                    <div className="text-xs text-slate-400">{lang.name}</div>
                  </div>
                  {i18n.language === lang.code && (
                    <span className="ml-auto text-sky-500 text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Currency list */}
          {tab === 'currency' && (
            <div className="max-h-72 overflow-y-auto py-1">
              {SUPPORTED_CURRENCIES.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => { setCurrency(currency.code); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${
                    currencyCode === currency.code ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <span className="w-8 text-center font-mono font-bold text-slate-500 text-sm">{currency.symbol}</span>
                  <div className="text-left">
                    <div className="font-medium">{currency.code}</div>
                    <div className="text-xs text-slate-400">{currency.name}</div>
                  </div>
                  {currencyCode === currency.code && (
                    <span className="ml-auto text-sky-500 text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

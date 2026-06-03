'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { CreditCard, Smartphone, Globe, ToggleLeft, ToggleRight, Save, RefreshCcw, Shield, Percent } from 'lucide-react';

const PROVIDER_META: Record<string, { name: string; icon: React.ElementType; color: string; description: string; fields: { key: string; label: string; secret?: boolean; placeholder?: string }[] }> = {
  MTN_MOMO: {
    name: 'MTN Mobile Money',
    icon: Smartphone,
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    description: 'MTN MoMo Collections API for Uganda, Ghana, Cameroon',
    fields: [
      { key: 'apiUser', label: 'API User ID', placeholder: 'UUID from MoMo Developer Portal' },
      { key: 'apiKey', label: 'API Key', secret: true, placeholder: 'Generated API key' },
      { key: 'primaryKey', label: 'Subscription Key (Primary)', secret: true, placeholder: 'Ocp-Apim-Subscription-Key' },
      { key: 'callbackUrl', label: 'Callback URL', placeholder: 'https://api.yoursite.com/api/v1/payments/callback/mtn_momo' },
      { key: 'environment', label: 'Environment', placeholder: 'sandbox or production' },
    ],
  },
  AIRTEL_MONEY: {
    name: 'Airtel Money',
    icon: Smartphone,
    color: 'bg-red-50 border-red-200 text-red-800',
    description: 'Airtel Money Collections for Uganda, Kenya, Tanzania',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'From Airtel Developer Portal' },
      { key: 'clientSecret', label: 'Client Secret', secret: true },
      { key: 'environment', label: 'Environment', placeholder: 'sandbox or production' },
    ],
  },
  PESAPAL: {
    name: 'Pesapal',
    icon: CreditCard,
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    description: 'Visa, Mastercard, Bank Transfer, M-Pesa via Pesapal',
    fields: [
      { key: 'consumerKey', label: 'Consumer Key', secret: true, placeholder: 'From Pesapal merchant dashboard' },
      { key: 'consumerSecret', label: 'Consumer Secret', secret: true },
      { key: 'ipnUrl', label: 'IPN Callback URL', placeholder: 'https://api.yoursite.com/api/v1/payments/ipn' },
      { key: 'environment', label: 'Environment', placeholder: 'sandbox or live' },
    ],
  },
  FLUTTERWAVE: {
    name: 'Flutterwave',
    icon: Globe,
    color: 'bg-orange-50 border-orange-200 text-orange-800',
    description: 'Cards, Mobile Money, Bank Transfer across Africa',
    fields: [
      { key: 'publicKey', label: 'Public Key', placeholder: 'FLWPUBK-...' },
      { key: 'secretKey', label: 'Secret Key', secret: true, placeholder: 'FLWSECK-...' },
      { key: 'encryptionKey', label: 'Encryption Key', secret: true },
      { key: 'webhookSecret', label: 'Webhook Secret', secret: true },
      { key: 'environment', label: 'Environment', placeholder: 'sandbox or live' },
    ],
  },
  STRIPE: {
    name: 'Stripe',
    icon: CreditCard,
    color: 'bg-purple-50 border-purple-200 text-purple-800',
    description: 'International cards, Apple Pay, Google Pay',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_test_...' },
      { key: 'secretKey', label: 'Secret Key', secret: true, placeholder: 'sk_test_...' },
      { key: 'webhookSecret', label: 'Webhook Secret', secret: true, placeholder: 'whsec_...' },
    ],
  },
};

const PROVIDERS = Object.keys(PROVIDER_META);

export default function PaymentGatewaysPage() {
  const queryClient = useQueryClient();
  const [activeProvider, setActiveProvider] = useState('MTN_MOMO');
  const [editState, setEditState] = useState<Record<string, Record<string, any>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const { data: gateways, isLoading } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: adminApi.getPaymentGateways,
  });

  const updateMutation = useMutation({
    mutationFn: ({ provider, data }: { provider: string; data: any }) =>
      adminApi.updatePaymentGateway(provider, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateways'] });
      toast.success('Payment gateway updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const gwMap: Record<string, any> = {};
  if (gateways) {
    (gateways as any[]).forEach((gw: any) => { gwMap[gw.provider] = gw; });
  }

  const getFieldValue = (provider: string, fieldKey: string) => {
    if (editState[provider]?.config?.[fieldKey] !== undefined) return editState[provider].config[fieldKey];
    const gw = gwMap[provider];
    if (gw?.config && typeof gw.config === 'object') return (gw.config as Record<string, string>)[fieldKey] || '';
    return '';
  };

  const setFieldValue = (provider: string, fieldKey: string, value: string) => {
    setEditState((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        config: { ...(prev[provider]?.config || gwMap[provider]?.config || {}), [fieldKey]: value },
      },
    }));
  };

  const getGwProp = (provider: string, prop: string) => {
    if (editState[provider]?.[prop] !== undefined) return editState[provider][prop];
    return gwMap[provider]?.[prop];
  };

  const setGwProp = (provider: string, prop: string, val: any) => {
    setEditState((prev) => ({ ...prev, [provider]: { ...prev[provider], [prop]: val } }));
  };

  const handleSave = (provider: string) => {
    const gw = gwMap[provider] || {};
    const edit = editState[provider] || {};
    updateMutation.mutate({
      provider,
      data: {
        isEnabled: edit.isEnabled ?? gw.isEnabled ?? false,
        isSandbox: edit.isSandbox ?? gw.isSandbox ?? true,
        config: edit.config ?? gw.config ?? {},
        commission: Number(edit.commission ?? gw.commission ?? 0),
        metadata: { displayName: PROVIDER_META[provider]?.name },
      },
    });
    setEditState((prev) => { const n = { ...prev }; delete n[provider]; return n; });
  };

  const meta = PROVIDER_META[activeProvider];
  const isEdited = !!editState[activeProvider];
  const isEnabled = getGwProp(activeProvider, 'isEnabled') ?? false;
  const isSandbox = getGwProp(activeProvider, 'isSandbox') ?? true;
  const commission = getGwProp(activeProvider, 'commission') ?? 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Gateways</h1>
        <p className="text-sm text-slate-500 mt-1">Configure payment providers, API keys, and commissions</p>
      </div>

      <div className="flex gap-6">
        {/* Provider List */}
        <nav className="w-52 flex-shrink-0 space-y-1">
          {PROVIDERS.map((p) => {
            const pm = PROVIDER_META[p];
            const Icon = pm.icon;
            const gw = gwMap[p];
            return (
              <button key={p} onClick={() => setActiveProvider(p)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeProvider === p ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{pm.name}</span>
                <span className={`w-2 h-2 rounded-full ${gw?.isEnabled ? 'bg-green-400' : 'bg-slate-300'}`} />
              </button>
            );
          })}
        </nav>

        {/* Config Panel */}
        <div className="flex-1 card border border-slate-100 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div>
              <h2 className="font-semibold text-slate-900 text-lg">{meta.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
            </div>
            <button onClick={() => handleSave(activeProvider)} disabled={updateMutation.isPending || !isEdited}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isEdited ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}>
              {updateMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button onClick={() => setGwProp(activeProvider, 'isEnabled', !isEnabled)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${isEnabled ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
              {isEnabled ? <ToggleRight className="w-6 h-6 text-green-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">{isEnabled ? 'Enabled' : 'Disabled'}</p>
                <p className="text-xs text-slate-500">Accept payments</p>
              </div>
            </button>
            <button onClick={() => setGwProp(activeProvider, 'isSandbox', !isSandbox)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${isSandbox ? 'bg-amber-50 border-amber-200' : 'bg-sky-50 border-sky-200'}`}>
              <Shield className={`w-6 h-6 ${isSandbox ? 'text-amber-600' : 'text-sky-600'}`} />
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">{isSandbox ? 'Sandbox' : 'Production'}</p>
                <p className="text-xs text-slate-500">{isSandbox ? 'Test mode' : 'Live payments'}</p>
              </div>
            </button>
            <div className="flex items-center gap-3 p-4 rounded-xl border bg-slate-50 border-slate-200">
              <Percent className="w-6 h-6 text-slate-500" />
              <div className="text-left flex-1">
                <p className="text-xs text-slate-500 mb-1">Commission</p>
                <input type="number" min="0" max="100" step="0.1"
                  value={commission} onChange={(e) => setGwProp(activeProvider, 'commission', e.target.value)}
                  className="w-20 text-sm font-medium input py-1 px-2" placeholder="0" />
              </div>
            </div>
          </div>

          {/* API Configuration Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> API Configuration
            </h3>
            {meta.fields.map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{field.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type={field.secret && !showSecrets[`${activeProvider}-${field.key}`] ? 'password' : 'text'}
                    value={getFieldValue(activeProvider, field.key)}
                    onChange={(e) => setFieldValue(activeProvider, field.key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className="input flex-1"
                  />
                  {field.secret && (
                    <button onClick={() => setShowSecrets((p) => ({ ...p, [`${activeProvider}-${field.key}`]: !p[`${activeProvider}-${field.key}`] }))}
                      className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap px-2 py-1 border rounded-lg">
                      {showSecrets[`${activeProvider}-${field.key}`] ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

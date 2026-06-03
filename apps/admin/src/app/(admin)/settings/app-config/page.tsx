'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Save, RefreshCcw, Server } from 'lucide-react';
import { adminApi } from '@/lib/api';

type FormState = {
  apiBaseUrl: string;
  apiBackupUrl: string;
  buyerVersion: string;
  sellerVersion: string;
  riderVersion: string;
};

const DEFAULTS: FormState = {
  apiBaseUrl: 'https://store.saktech.org/api/v1',
  apiBackupUrl: '',
  buyerVersion: '1.0.0',
  sellerVersion: '1.0.0',
  riderVersion: '1.0.0',
};

export default function AppConfigSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-public-app-config'],
    queryFn: () => adminApi.getPublicAppConfig(),
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      apiBaseUrl: data.apiBaseUrl || DEFAULTS.apiBaseUrl,
      apiBackupUrl: data.apiBackupUrl || '',
      buyerVersion: data.buyerVersion || DEFAULTS.buyerVersion,
      sellerVersion: data.sellerVersion || DEFAULTS.sellerVersion,
      riderVersion: data.riderVersion || DEFAULTS.riderVersion,
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updatePublicAppConfig({
        apiBaseUrl: form.apiBaseUrl.trim(),
        apiBackupUrl: form.apiBackupUrl.trim() || null,
        buyerVersion: form.buyerVersion.trim(),
        sellerVersion: form.sellerVersion.trim(),
        riderVersion: form.riderVersion.trim(),
      }),
    onSuccess: () => {
      toast.success('App configuration updated');
      refetch();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) {
        toast.error(msg.join(', '));
      } else {
        toast.error(msg || 'Failed to update app configuration');
      }
    },
  });

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const InputRow = ({
    label,
    keyName,
    placeholder,
    type = 'text',
    help,
  }: {
    label: string;
    keyName: keyof FormState;
    placeholder: string;
    type?: string;
    help?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {help && <p className="text-xs text-slate-400 mb-2">{help}</p>}
      <input
        type={type}
        value={form[keyName]}
        onChange={(e) => update(keyName, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-3 text-slate-500">
        <RefreshCcw className="w-4 h-4 animate-spin" />
        Loading app configuration...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-6 h-6 text-sky-600" />
            App Config
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage dynamic API base URLs and mobile app versions. Changes are picked up by apps automatically.
          </p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
        >
          {saveMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <div className="space-y-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <InputRow
          label="Primary API Base URL"
          keyName="apiBaseUrl"
          placeholder="https://store.saktech.org/api/v1"
          type="url"
          help="Used by web and mobile clients as the main backend endpoint."
        />

        <InputRow
          label="Backup API Base URL"
          keyName="apiBackupUrl"
          placeholder="https://backup.saktech.org/api/v1"
          type="url"
          help="Optional failover endpoint. Leave empty to disable backup routing."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputRow
            label="Buyer App Version"
            keyName="buyerVersion"
            placeholder="1.0.0"
          />
          <InputRow
            label="Seller App Version"
            keyName="sellerVersion"
            placeholder="1.0.0"
          />
          <InputRow
            label="Rider App Version"
            keyName="riderVersion"
            placeholder="1.0.0"
          />
        </div>
      </div>
    </div>
  );
}

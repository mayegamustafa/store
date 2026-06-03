'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Truck, CheckCircle, ArrowLeft, Clock, Banknote, Gift } from 'lucide-react';

export default function RiderRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', city: '', vehicle: 'motorcycle', idNumber: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Received!</h1>
          <p className="text-sm text-slate-500 mb-6">
            We&apos;ll review your application and contact you within 3 business days.
          </p>
          <Link href="/" className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-8 max-w-lg">
      <Link href="/" className="flex items-center gap-1.5 text-sm text-primary mb-6 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Home
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Become a Rider</h1>
          <p className="text-sm text-slate-500">Earn by delivering orders in your city</p>
        </div>
      </div>

      {/* Perks */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Flexible Hours', Icon: Clock },
          { label: 'Daily Earnings', Icon: Banknote },
          { label: 'Bonus Rewards',  Icon: Gift },
        ].map((p) => (
          <div key={p.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-1">
              <p.Icon className="w-4 h-4 text-accent" />
            </div>
            <p className="text-xs font-semibold text-slate-700">{p.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        {[
          { label: 'Full Name',      field: 'fullName',  placeholder: 'Jane Achieng',            type: 'text' },
          { label: 'Email Address',  field: 'email',     placeholder: 'jane@example.com',          type: 'email' },
          { label: 'Phone Number',   field: 'phone',     placeholder: '+256 700 000 000',           type: 'tel' },
          { label: 'City / Town',    field: 'city',      placeholder: 'Kampala',                    type: 'text' },
          { label: 'National ID No.', field: 'idNumber', placeholder: '12345678',                   type: 'text' },
        ].map((f) => (
          <div key={f.field}>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{f.label}</label>
            <input
              type={f.type}
              value={(form as any)[f.field]}
              onChange={(e) => update(f.field, e.target.value)}
              placeholder={f.placeholder}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vehicle Type</label>
          <select
            value={form.vehicle}
            onChange={(e) => update('vehicle', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            <option value="motorcycle">Motorcycle (Boda Boda)</option>
            <option value="bicycle">Bicycle</option>
            <option value="tuktuk">Tuk-Tuk</option>
            <option value="car">Car / Van</option>
          </select>
        </div>

        <p className="text-xs text-slate-500">
          By submitting, you agree to our{' '}
          <Link href="/terms" className="text-primary underline">Terms of Service</Link> and{' '}
          <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
        </p>

        <button
          onClick={() => setSubmitted(true)}
          className="btn-accent w-full py-2.5 rounded-xl text-sm font-semibold"
        >
          Submit Application
        </button>
      </div>
    </div>
  );
}

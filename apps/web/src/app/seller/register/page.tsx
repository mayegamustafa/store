'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';

const STEPS = ['Business Info', 'Store Details', 'Submit'];

export default function SellerRegisterPage() {
  const [step, setStep]       = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm]       = useState({
    businessName: '', ownerName: '', email: '', phone: '',
    businessType: 'individual', storeName: '', category: '', description: '', address: '',
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
          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Submitted!</h1>
          <p className="text-sm text-slate-500 mb-6">
            We&apos;ll review your application and get back to you within 2 business days.
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
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Become a Seller</h1>
          <p className="text-sm text-slate-500">Open your store and start selling today</p>
        </div>
      </div>

      {/* steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i < step ? 'bg-green-500 text-white' : i === step ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        {step === 0 && (
          <>
            <h2 className="text-sm font-bold text-slate-800 mb-2">Business Information</h2>
            {[
              { label: 'Business / Owner Name', field: 'businessName', placeholder: 'Kamau Traders Ltd.' },
              { label: 'Owner Full Name',        field: 'ownerName',    placeholder: 'John Kamau' },
              { label: 'Email Address',          field: 'email',        placeholder: 'john@business.com' },
              { label: 'Phone Number',           field: 'phone',        placeholder: '+256 700 000 000' },
            ].map((f) => (
              <div key={f.field}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{f.label}</label>
                <input
                  type="text"
                  value={(form as any)[f.field]}
                  onChange={(e) => update(f.field, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Business Type</label>
              <select
                value={form.businessType}
                onChange={(e) => update('businessType', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="individual">Individual / Sole Proprietor</option>
                <option value="limited">Limited Company</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-sm font-bold text-slate-800 mb-2">Store Details</h2>
            {[
              { label: 'Store Name',   field: 'storeName',   placeholder: 'My Awesome Shop' },
              { label: 'Main Address', field: 'address',     placeholder: 'Kampala, Uganda' },
            ].map((f) => (
              <div key={f.field}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{f.label}</label>
                <input
                  type="text"
                  value={(form as any)[f.field]}
                  onChange={(e) => update(f.field, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Category</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Select category…</option>
                {['Electronics', 'Fashion', 'Food & Grocery', 'Home & Garden', 'Health & Beauty', 'Sports', 'Automotive', 'Books', 'Other'].map((c) => (
                  <option key={c} value={c.toLowerCase()}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Store Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Tell customers what you sell…"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="text-center py-4">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Review & Submit</h2>
            <div className="text-left space-y-2 mb-6">
              {Object.entries(form).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-medium text-slate-800 text-right ml-4 max-w-[60%] truncate">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mb-2">
              By submitting, you agree to our{' '}
              <Link href="/terms" className="text-primary underline">Terms of Service</Link>.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Back
          </button>
        )}
        <button
          onClick={() => {
            if (step < STEPS.length - 1) setStep(step + 1);
            else setSubmitted(true);
          }}
          className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
        >
          {step < STEPS.length - 1 ? (
            <><span>Continue</span><ChevronRight className="w-4 h-4" /></>
          ) : 'Submit Application'}
        </button>
      </div>
    </div>
  );
}

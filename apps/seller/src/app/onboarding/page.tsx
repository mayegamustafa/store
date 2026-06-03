'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSellerStore } from '@/stores/seller.store';
import { sellerApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Store, User, FileText, ArrowRight } from 'lucide-react';
import { getRuntimeApiBaseUrl } from '@/lib/runtime-config';

const STEPS = [
  { id: 1, title: 'Account', icon: User },
  { id: 2, title: 'Store Info', icon: Store },
  { id: 3, title: 'Documents', icon: FileText },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setUser, setSellerProfile } = useSellerStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '',
    storeName: '', storeDescription: '', businessType: 'INDIVIDUAL',
    storeCategory: 'GENERAL',
    nationalId: '', tinNumber: '',
  });

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const phone = `+256${form.phone.replace(/^0/, '')}`;
      // Split the single "Full Name" field into firstName / lastName
      const nameParts = form.name.trim().split(/\s+/);
      const firstName = nameParts[0] || form.name;
      const lastName  = nameParts.slice(1).join(' ') || nameParts[0];

      // 1. Register the seller account
      const regJson = await fetch(`${getRuntimeApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email: form.email || undefined,
          password: form.password,
          role: 'SELLER',
        }),
      }).then((r) => r.json());

      // If user already exists (409), fall back to login
      let authRes: any = regJson;
      if (regJson.statusCode === 409) {
        authRes = await sellerApi.login({ phone, password: form.password });
      } else if (regJson.statusCode) {
        throw new Error(regJson.message || 'Registration failed');
      }

      // Map API user shape to store shape (backend returns firstName/lastName)
      const u = authRes.user ?? authRes;
      if (!u?.id) throw new Error('No user returned from server');
      const mappedUser = {
        id: u.id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || phone,
        phone: u.phone,
        email: u.email,
        role: u.role,
      };
      setUser(mappedUser, authRes.accessToken);

      // 2. Onboard seller profile (token now in localStorage via setUser)
      const profileRes: any = await sellerApi.onboard({
        storeName: form.storeName,
        storeDescription: form.storeDescription,
        businessType: form.businessType,
        storeCategory: form.storeCategory,
        nationalId: form.nationalId,
        tinNumber: form.tinNumber || undefined,
      });

      setSellerProfile(profileRes);
      toast.success('Application submitted! We will notify you once approved.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || err?.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Image src="/logo.png" alt="TotalStore" width={40} height={40} className="rounded-xl object-contain" />
            <span className="text-xl font-bold text-slate-900">TotalStore</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Become a Seller</h1>
          <p className="text-slate-500 text-sm mt-1">Sell to hundreds of thousands of customers across Africa</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > s.id ? 'bg-green-500 text-white' :
                step === s.id ? 'bg-sky-500 text-white' :
                'bg-slate-200 text-slate-500'
              }`}>
                {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
              </div>
              <span className={`text-sm font-medium ${step === s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                {s.title}
              </span>
              {i < STEPS.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 ml-2" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 text-lg">Your Account</h2>
              {[
                { key: 'name', label: 'Full Name *', type: 'text', placeholder: 'Your full name' },
                { key: 'phone', label: 'Phone Number *', type: 'tel', placeholder: '701234567', prefix: '+256' },
                { key: 'email', label: 'Email (optional)', type: 'email', placeholder: 'you@example.com' },
                { key: 'password', label: 'Password *', type: 'password', placeholder: 'Min. 6 characters' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">{f.label}</label>
                  {f.prefix ? (
                    <div className="flex">
                      <span className="flex items-center px-3 bg-slate-100 border border-r-0 rounded-l-xl text-sm text-slate-600">{f.prefix}</span>
                      <input
                        type={f.type}
                        value={(form as any)[f.key]}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="flex-1 border border-l-0 rounded-r-xl px-3 py-2 text-sm"
                      />
                    </div>
                  ) : (
                    <input
                      type={f.type}
                      value={(form as any)[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full border rounded-xl px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  if (!form.name || !form.phone || !form.password) {
                    toast.error('Please fill required fields');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 text-lg">Store Information</h2>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Store Name *</label>
                <input
                  value={form.storeName}
                  onChange={(e) => update('storeName', e.target.value)}
                  placeholder="e.g. Lagos Electronics"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Store Description</label>
                <textarea
                  value={form.storeDescription}
                  onChange={(e) => update('storeDescription', e.target.value)}
                  rows={3}
                  placeholder="Tell buyers about your store..."
                  className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Business Type</label>
                <select
                  value={form.businessType}
                  onChange={(e) => update('businessType', e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                >
                  <option value="INDIVIDUAL">Individual / Sole Trader</option>
                  <option value="COMPANY">Registered Company</option>
                  <option value="PARTNERSHIP">Partnership</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Store Category</label>
                <select
                  value={form.storeCategory}
                  onChange={(e) => update('storeCategory', e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                >
                  <option value="GENERAL">General Store</option>
                  <option value="SUPERMARKET">Supermarket / Grocery</option>
                  <option value="FOOD_RESTAURANT">Food & Restaurant</option>
                  <option value="BAKERY">Bakery & Pastry</option>
                  <option value="PHARMACY">Pharmacy & Health</option>
                  <option value="ELECTRONICS">Electronics & Gadgets</option>
                  <option value="FASHION">Fashion & Clothing</option>
                  <option value="BEAUTY">Beauty & Cosmetics</option>
                  <option value="HARDWARE">Hardware & Tools</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 border rounded-xl py-3 text-sm hover:bg-slate-50">Back</button>
                <button
                  onClick={() => {
                    if (!form.storeName) { toast.error('Store name is required'); return; }
                    setStep(3);
                  }}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 text-lg">KYC Documents</h2>
              <p className="text-sm text-slate-500">
                We need to verify your identity. Documents will be reviewed within 24-48 hours.
              </p>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">National ID Number (optional)</label>
                <input
                  value={form.nationalId}
                  onChange={(e) => update('nationalId', e.target.value)}
                  placeholder="CM9XXXXXXXXXXX"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">TIN Number (optional)</label>
                <input
                  value={form.tinNumber}
                  onChange={(e) => update('tinNumber', e.target.value)}
                  placeholder="1234567890"
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
                By submitting, you agree to TotalStore's Seller Terms of Service and confirm that all information provided is accurate.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 border rounded-xl py-3 text-sm hover:bg-slate-50">Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already a seller?{' '}
          <Link href="/login" className="text-sky-600 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}

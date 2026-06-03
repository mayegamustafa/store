'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSellerStore } from '@/stores/seller.store';
import { sellerApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { Lock, Eye, EyeOff, ChevronDown, Mail, Phone } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const COUNTRY_CODES = [
  { code: '+256', flag: '🇺🇬', label: 'UG' },
  { code: '+254', flag: '🇰🇪', label: 'KE' },
  { code: '+255', flag: '🇹🇿', label: 'TZ' },
  { code: '+250', flag: '🇷🇼', label: 'RW' },
  { code: '+234', flag: '🇳🇬', label: 'NG' },
  { code: '+233', flag: '🇬🇭', label: 'GH' },
  { code: '+251', flag: '🇪🇹', label: 'ET' },
  { code: '+27',  flag: '🇿🇦', label: 'ZA' },
  { code: '+1',   flag: '🇺🇸', label: 'US' },
  { code: '+44',  flag: '🇬🇧', label: 'GB' },
];

export default function SellerLoginPage() {
  const router = useRouter();
  const { setUser } = useSellerStore();
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [dialCode, setDialCode] = useState('+256');
  const [showDialDropdown, setShowDialDropdown] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const fullPhone = `${dialCode}${phone.replace(/^0/, '')}`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = loginMode === 'email'
        ? { email: email.trim(), password }
        : { phone: fullPhone, password };
      const res: any = await sellerApi.login(payload);
      const u = res.user ?? res;
      if (u?.role !== 'SELLER') { toast.error('This portal is for sellers only.'); return; }
      const mappedUser = {
        id: u.id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.phone || u.email || 'Seller',
        phone: u.phone, email: u.email, role: u.role,
      };
      setUser(mappedUser, res.accessToken);
      toast.success(`Welcome back, ${u.firstName ?? 'Seller'}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed.');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (response: any) => {
    if (!response.credential) return;
    setGoogleLoading(true);
    try {
      const res: any = await sellerApi.googleSignIn(response.credential);
      const u = res.user ?? res;
      if (u?.role !== 'SELLER') { toast.error('This Google account is not linked to a seller account.'); return; }
      const mappedUser = {
        id: u.id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'Seller',
        phone: u.phone, email: u.email, role: u.role,
      };
      setUser(mappedUser, res.accessToken);
      toast.success(`Welcome, ${u.firstName ?? 'Seller'}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Google sign-in failed.');
    } finally { setGoogleLoading(false); }
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.code === dialCode) ?? COUNTRY_CODES[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 w-14 h-14 flex items-center justify-center">
            <Image src="/logo.png" alt="TotalStore" width={56} height={56} className="rounded-xl object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Seller Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to manage your store</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-5">
            {googleLoading ? (
              <div className="w-full h-10 bg-slate-100 rounded-lg flex items-center justify-center text-sm text-slate-500">Signing in with Google...</div>
            ) : (
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error('Google sign-in failed')} text="signin_with" shape="rectangular" width="100%" />
            )}
          </div>
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-slate-400">or sign in with email / phone</span></div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Toggle between email and phone */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button type="button" onClick={() => setLoginMode('phone')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${loginMode === 'phone' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Phone className="w-3.5 h-3.5" /> Phone
              </button>
              <button type="button" onClick={() => setLoginMode('email')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${loginMode === 'email' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
            </div>

            {loginMode === 'phone' ? (
              <div>
                <label className="label text-sm font-medium text-slate-700 mb-1.5 block">Phone Number</label>
                <div className="flex relative">
                  <div className="relative">
                    <button type="button" onClick={() => setShowDialDropdown(!showDialDropdown)}
                      className="flex items-center gap-1 px-3 bg-slate-100 border border-r-0 rounded-l-xl text-sm text-slate-700 hover:bg-slate-200 transition-colors min-w-[80px] h-full py-3">
                      <span>{selectedCountry.flag}</span>
                      <span>{selectedCountry.code}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    {showDialDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                        {COUNTRY_CODES.map(c => (
                          <button key={c.code} type="button" onClick={() => { setDialCode(c.code); setShowDialDropdown(false); }}
                            className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${c.code === dialCode ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700'}`}>
                            <span>{c.flag}</span><span>{c.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 border border-l-0 rounded-r-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="701234567" required />
                </div>
                <p className="text-xs text-slate-400 mt-1">Select your country code above</p>
              </div>
            ) : (
              <div>
                <label className="label text-sm font-medium text-slate-700 mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full border rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="you@example.com" required />
                </div>
              </div>
            )}
            <div>
              <label className="label text-sm font-medium text-slate-700 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-600 mt-5">
            New seller? <Link href="/onboarding" className="text-sky-600 font-medium hover:underline">Apply here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

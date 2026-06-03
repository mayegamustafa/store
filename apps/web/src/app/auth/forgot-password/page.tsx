'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle, Lock, KeyRound } from 'lucide-react';
import { useSettings } from '@/contexts/settings';
import { getRuntimeApiBaseUrl } from '@/lib/runtime-config';

export default function ForgotPasswordPage() {
  const [email, setEmail]             = useState('');
  const [code, setCode]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading]         = useState(false);
  const [step, setStep]               = useState<'email' | 'code' | 'done'>('email');
  const [error, setError]             = useState('');
  const settings = useSettings();
  const logoUrl = settings.SITE_LOGO_URL || '/logo.png';
  const siteName = settings.SITE_NAME || 'TotalStore';

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${getRuntimeApiBaseUrl()}/auth/forgot-password`, { email });
      setStep('code');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !newPassword) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${getRuntimeApiBaseUrl()}/auth/reset-password`, { email, code, newPassword });
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Password Reset!</h1>
          <p className="text-sm text-slate-500 mb-6">
            Your password has been reset successfully. Please log in with your new password.
          </p>
          <Link href="/auth/login" className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold w-full flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-2">
              <img src={logoUrl} alt={siteName} className="h-12 w-auto object-contain mx-auto" />
            </Link>
          </div>
          <button onClick={() => { setStep('email'); setError(''); }} className="flex items-center gap-1.5 text-sm text-primary mb-6 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-1">Enter reset code</h1>
            <p className="text-sm text-slate-500 mb-6">
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below along with your new password.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reset Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length < 6 || newPassword.length < 6}
                className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-2">
            <img src={logoUrl} alt={siteName} className="h-12 w-auto object-contain mx-auto" />
          </Link>
        </div>
        <Link href="/auth/login" className="flex items-center gap-1.5 text-sm text-primary mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-1">Forgot password?</h1>
          <p className="text-sm text-slate-500 mb-6">
            Enter your email and we&apos;ll send you a reset code.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send Reset Code'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

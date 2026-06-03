'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Phone, Mail, Lock } from 'lucide-react';
import { useSettings } from '@/contexts/settings';
import { GoogleLogin } from '@react-oauth/google';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Phone or email required'),
  password: z.string().min(8, 'Password must be 8+ characters').optional(),
  otp: z.string().length(6, 'OTP must be 6 digits').optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleSendOtp = async () => {
    const phone = getValues('identifier');
    if (!phone) return toast.error('Enter your phone number first');
    setLoading(true);
    try {
      await authApi.sendOtp(phone);
      setOtpSent(true);
      toast.success('OTP sent to ' + phone);
    } catch {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      let res;
      if (mode === 'password') {
        const isPhone = data.identifier.startsWith('+') || /^\d{10,}$/.test(data.identifier);
        res = await authApi.login({
          [isPhone ? 'phone' : 'email']: data.identifier,
          password: data.password,
        });
      } else {
        res = await authApi.verifyOtp(data.identifier, data.otp!);
      }
      login(res.data.accessToken, res.data.refreshToken, res.data.user);
      toast.success(`Welcome back, ${res.data.user.firstName}!`);
      router.push('/');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const settings = useSettings();
  const siteName = settings.SITE_NAME || 'TotalStore';
  const logoUrl = settings.SITE_LOGO_URL || '/logo.png';

  const handleGoogleSuccess = async (response: any) => {
    try {
      const res = await authApi.googleSignIn(response.credential);
      login(res.data.accessToken, res.data.refreshToken, res.data.user);
      toast.success(`Welcome, ${res.data.user.firstName}!`);
      router.push('/');
    } catch {
      toast.error('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-3">
            <img src={logoUrl} alt={siteName} className="h-14 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold">Sign in to {siteName}</h1>
          <p className="text-slate-500 mt-1">Africa's #1 Online Marketplace</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setMode('password')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === 'password' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
          >
            Password
          </button>
          <button
            onClick={() => setMode('otp')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === 'otp' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
          >
            OTP (Phone)
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          {/* Identifier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {mode === 'otp' ? 'Phone Number' : 'Phone or Email'}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                {...register('identifier')}
                placeholder={mode === 'otp' ? '+256701234567' : 'email@example.com or +256...'}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
              />
            </div>
            {errors.identifier && <p className="text-red-500 text-xs mt-1">{errors.identifier.message}</p>}
          </div>

          {/* Password */}
          {mode === 'password' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          )}

          {/* OTP */}
          {mode === 'otp' && (
            <div>
              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full py-2.5 border-2 border-sky-400 text-sky-600 font-semibold rounded-lg hover:bg-sky-50 transition text-sm"
                >
                  {loading ? 'Sending...' : 'Send OTP to Phone'}
                </button>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter OTP</label>
                  <input
                    {...register('otp')}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm text-center tracking-widest text-lg"
                  />
                  {errors.otp && <p className="text-red-500 text-xs mt-1">{errors.otp.message}</p>}
                  <button type="button" onClick={handleSendOtp} className="text-sky-600 text-xs mt-1 hover:underline">
                    Resend OTP
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'password' && (
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-sky-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'otp' && !otpSent)}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Social login */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 whitespace-nowrap">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed')}
              text="signin_with"
              shape="rectangular"
              width="360"
            />
          </div>

          <p className="text-center text-sm text-slate-500">
            New to TotalStore?{' '}
            <Link href="/auth/register" className="text-sky-600 font-medium hover:underline">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

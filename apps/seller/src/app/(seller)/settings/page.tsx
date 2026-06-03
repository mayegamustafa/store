'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '@/lib/api';
import {
  Settings, User, CreditCard, FileCheck, Save, CheckCircle,
  Clock, AlertCircle, ChevronDown, ChevronRight, Bell,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type Section = 'account' | 'payout' | 'business' | 'kyc' | 'notifications' | string;

const KYC_STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  NOT_SUBMITTED: { label: 'Not Submitted', color: 'text-slate-500 bg-slate-100', icon: AlertCircle },
  PENDING:       { label: 'Under Review', color: 'text-amber-600 bg-amber-100', icon: Clock },
  APPROVED:      { label: 'Verified',     color: 'text-green-700 bg-green-100', icon: CheckCircle },
  REJECTED:      { label: 'Rejected',     color: 'text-red-600 bg-red-100',     icon: AlertCircle },
};

function SectionCard({
  title, icon: Icon, open, onToggle, children,
}: { title: string; icon: any; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary" />
          <span className="font-semibold text-slate-800">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="p-5 pt-0 border-t border-slate-50">{children}</div>}
    </div>
  );
}

export default function SellerSettingsPage() {
  const queryClient = useQueryClient();
  const [openSection, setOpenSection] = useState<Section>('account');

  const toggle = (s: Section) => setOpenSection(prev => (prev === s ? ('none' as any) : s));

  // -- Queries --
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['seller-account-info'],
    queryFn: () => sellerApi.getAccountInfo().then((r: any) => r.data ?? r),
    staleTime: 60_000,
  });

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: () => sellerApi.getProfile().then((r: any) => r.data ?? r),
    staleTime: 60_000,
  });

  // -- Account form --
  const [accountForm, setAccountForm] = useState<Record<string, string>>({});
  const accountMutation = useMutation({
    mutationFn: () => sellerApi.updateAccountInfo(accountForm),
    onSuccess: () => {
      toast.success('Account info updated!');
      queryClient.invalidateQueries({ queryKey: ['seller-account-info'] });
      setAccountForm({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  // -- Business form --
  const [bizForm, setBizForm] = useState<Record<string, string>>({});
  const bizMutation = useMutation({
    mutationFn: () => sellerApi.updateProfile(bizForm),
    onSuccess: () => {
      toast.success('Business info updated!');
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
      setBizForm({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  // -- Payout form --
  const [payForm, setPayForm] = useState<Record<string, string>>({});
  const payMutation = useMutation({
    mutationFn: () => sellerApi.updateProfile(payForm),
    onSuccess: () => {
      toast.success('Payout settings saved!');
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
      setPayForm({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  // -- Newsletter subscribe --
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const newsletterMutation = useMutation({
    mutationFn: () => {
      const email = newsletterEmail || account?.email || '';
      const name = `${account?.firstName ?? ''} ${account?.lastName ?? ''}`.trim();
      return sellerApi.subscribeNewsletter(email, name);
    },
    onSuccess: () => toast.success('Subscribed! You will receive store updates by email.'),
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('already')) toast.success('You are already subscribed!');
      else toast.error(msg || 'Subscription failed');
    },
  });

  if (loadingProfile || loadingAccount) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const p = profile ?? {};
  const a = account ?? {};
  const kycInfo = KYC_STATUS_MAP[p.kycStatus ?? 'NOT_SUBMITTED'] ?? KYC_STATUS_MAP.NOT_SUBMITTED;
  const KycIcon = kycInfo.icon;

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Manage your account and preferences</p>
        </div>
      </div>

      {/* Account Info */}
      <SectionCard title="Account Info" icon={User} open={openSection === 'account'} onToggle={() => toggle('account')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input
              className="input w-full"
              defaultValue={a.firstName ?? ''}
              onChange={e => setAccountForm(f => ({ ...f, firstName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input
              className="input w-full"
              defaultValue={a.lastName ?? ''}
              onChange={e => setAccountForm(f => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="input w-full bg-slate-50"
              defaultValue={a.email ?? ''}
              readOnly
              title="Email cannot be changed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              className="input w-full"
              defaultValue={a.phone ?? ''}
              onChange={e => setAccountForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => accountMutation.mutate()}
            disabled={accountMutation.isPending || Object.keys(accountForm).length === 0}
            className="flex items-center gap-2 btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {accountMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </SectionCard>

      {/* Business Info */}
      <SectionCard title="Business Info" icon={FileCheck} open={openSection === 'business'} onToggle={() => toggle('business')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
            <input
              className="input w-full"
              defaultValue={p.businessName ?? ''}
              onChange={e => setBizForm(f => ({ ...f, businessName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
            <select
              className="input w-full"
              defaultValue={p.businessType ?? 'individual'}
              onChange={e => setBizForm(f => ({ ...f, businessType: e.target.value }))}
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Reg. No.</label>
            <input
              className="input w-full"
              defaultValue={p.businessRegNo ?? ''}
              onChange={e => setBizForm(f => ({ ...f, businessRegNo: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID</label>
            <input
              className="input w-full"
              defaultValue={p.taxId ?? ''}
              onChange={e => setBizForm(f => ({ ...f, taxId: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => bizMutation.mutate()}
            disabled={bizMutation.isPending || Object.keys(bizForm).length === 0}
            className="flex items-center gap-2 btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {bizMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </SectionCard>

      {/* Payout Settings */}
      <SectionCard title="Payout Settings" icon={CreditCard} open={openSection === 'payout'} onToggle={() => toggle('payout')}>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payout Method</label>
            <select
              className="input w-full"
              defaultValue={p.payoutMethod ?? 'mobile_money'}
              onChange={e => setPayForm(f => ({ ...f, payoutMethod: e.target.value }))}
            >
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          {(payForm.payoutMethod ?? p.payoutMethod) !== 'bank' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Network</label>
                <select
                  className="input w-full"
                  defaultValue={p.momoNetwork ?? 'MTN'}
                  onChange={e => setPayForm(f => ({ ...f, momoNetwork: e.target.value }))}
                >
                  <option value="MTN">MTN MoMo</option>
                  <option value="AIRTEL">Airtel Money</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                <input
                  className="input w-full"
                  defaultValue={p.momoNumber ?? ''}
                  onChange={e => setPayForm(f => ({ ...f, momoNumber: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                <input
                  className="input w-full"
                  defaultValue={p.bankName ?? ''}
                  onChange={e => setPayForm(f => ({ ...f, bankName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                <input
                  className="input w-full"
                  defaultValue={p.bankAccountNo ?? ''}
                  onChange={e => setPayForm(f => ({ ...f, bankAccountNo: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Code</label>
                <input
                  className="input w-full"
                  defaultValue={p.bankBranchCode ?? ''}
                  onChange={e => setPayForm(f => ({ ...f, bankBranchCode: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending || Object.keys(payForm).length === 0}
            className="flex items-center gap-2 btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {payMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </SectionCard>

      {/* KYC Status */}
      <SectionCard title="KYC Verification" icon={FileCheck} open={openSection === 'kyc'} onToggle={() => toggle('kyc')}>
        <div className="mt-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${kycInfo.color}`}>
            <KycIcon className="w-4 h-4" />
            {kycInfo.label}
          </div>
          {p.kycStatus === 'NOT_SUBMITTED' && (
            <p className="text-sm text-slate-500 mt-3">
              Submit your KYC documents to get verified and unlock higher selling limits.
              Contact support or the admin to begin the verification process.
            </p>
          )}
          {p.kycStatus === 'PENDING' && (
            <p className="text-sm text-slate-500 mt-3">
              Your documents are being reviewed. This usually takes 1-2 business days.
            </p>
          )}
          {p.kycStatus === 'APPROVED' && (
            <p className="text-sm text-green-600 mt-3">
              Your identity has been verified. You have access to all seller features.
            </p>
          )}
          {p.kycStatus === 'REJECTED' && (
            <div className="mt-3">
              <p className="text-sm text-red-600">
                Your KYC was rejected. Please contact support for assistance.
              </p>
            </div>
          )}

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Seller Status</span>
              <span className={`font-semibold ${p.status === 'ACTIVE' ? 'text-green-600' : p.status === 'PENDING' ? 'text-amber-600' : 'text-red-600'}`}>
                {p.status ?? 'PENDING'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Account Type</span>
              <span className="font-semibold text-slate-800">{p.businessType === 'company' ? 'Company' : 'Individual'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">Commission Rate</span>
              <span className="font-semibold text-slate-800">
                {p.commissionRate != null ? `${p.commissionRate}%` : 'Default'}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Newsletter & Notifications */}
      <SectionCard
        title="Notifications & Newsletter"
        icon={Bell}
        open={openSection === 'notifications'}
        onToggle={() => toggle('notifications')}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Subscribe to receive product updates, promotional tips, and platform announcements
            directly to your email.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Email address
            </label>
            <input
              type="email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder={account?.email ?? 'your@email.com'}
              value={newsletterEmail}
              onChange={e => setNewsletterEmail(e.target.value)}
            />
          </div>
          <button
            onClick={() => newsletterMutation.mutate()}
            disabled={newsletterMutation.isPending}
            className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 transition disabled:opacity-60"
          >
            <Bell className="w-4 h-4" />
            {newsletterMutation.isPending ? 'Subscribing…' : 'Subscribe to Newsletter'}
          </button>
          {newsletterMutation.isSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
              <CheckCircle className="w-4 h-4" />
              Successfully subscribed!
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

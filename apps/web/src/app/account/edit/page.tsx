'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { usersApi, uploadApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function EditProfilePage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatar: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return; }
    const u = user as any;
    setForm({
      firstName: u.firstName ?? '',
      lastName:  u.lastName  ?? '',
      phone:     u.phone     ?? '',
      avatar:    u.avatar    ?? '',
    });
  }, [user, router]);

  if (!user) return null;

  const handleAvatarChange = async (file: File) => {
    setUploading(true);
    try {
      const res: any = await uploadApi.single(file);
      const url: string = res.data?.url ?? res.url ?? res.data?.filePath ?? res.filePath ?? '';
      if (!url) throw new Error('No URL returned');
      setForm(f => ({ ...f, avatar: url }));
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        // avoid sending empty string to @unique phone field
        phone: form.phone.trim() || null,
      };
      const updated: any = await usersApi.update(payload);
      const updatedUser = updated.data ?? updated;
      setUser({ ...user, ...updatedUser });
      toast.success('Profile updated!');
      router.push('/account');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.firstName?.[0] ?? (user as any).email?.[0] ?? 'U').toUpperCase();

  return (
    <div className="container-app py-8 max-w-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account" className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Edit Profile</h1>
          <p className="text-sm text-slate-500">Update your personal information</p>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-primary flex items-center justify-center relative">
            {form.avatar ? (
              <Image src={form.avatar} alt="Avatar" fill sizes="96px" className="object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-2 text-xs text-primary font-medium hover:underline disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Change Photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
        />
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              placeholder="Last name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
            value={(user as any).email ?? ''}
            readOnly
            title="Email cannot be changed"
          />
          <p className="text-xs text-slate-400 mt-1">Email address cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
          <input
            type="tel"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+256 700 000 000"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="w-full mt-5 flex items-center justify-center gap-2 btn-primary py-3 rounded-2xl font-semibold text-sm disabled:opacity-60"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

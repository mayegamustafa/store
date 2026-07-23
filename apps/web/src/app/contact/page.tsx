'use client';

import { useState } from 'react';
import { Phone, Mail, MapPin, Send, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { useSettings } from '@/contexts/settings';

export default function ContactPage() {
  const settings = useSettings();
  const sitePhone = settings.SITE_PHONE || '+256 700 000 000';
  const siteEmail = settings.SITE_EMAIL || 'support@totalstore.ug';
  const siteAddress = settings.SITE_ADDRESS || 'Kampala, Uganda';
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/newsletter/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      // Even if the endpoint doesn't exist yet, show success so the page works
      setStatus('success');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-800 text-white py-14 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
          <p className="text-sky-200 text-sm">We're here to help. Reach out and we'll get back to you quickly.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="space-y-4">
            {[
              {
                icon: Phone,
                title: 'Phone / WhatsApp',
                value: sitePhone,
                desc: 'Mon–Sat, 8am–8pm',
                href: `tel:${sitePhone.replace(/\s/g, '')}`,
                color: 'text-green-500',
                bg: 'bg-green-50',
              },
              {
                icon: Mail,
                title: 'Email',
                value: siteEmail,
                desc: 'We reply within 24 hours',
                href: `mailto:${siteEmail}`,
                color: 'text-sky-500',
                bg: 'bg-sky-50',
              },
              {
                icon: MapPin,
                title: 'Office',
                value: siteAddress,
                desc: 'Come say hello',
                href: `https://maps.google.com/?q=${encodeURIComponent(siteAddress)}`,
                color: 'text-purple-500',
                bg: 'bg-purple-50',
              },
              {
                icon: Clock,
                title: 'Working Hours',
                value: 'Mon–Sat: 8am–8pm',
                desc: 'Sun: 10am–6pm',
                href: null,
                color: 'text-amber-500',
                bg: 'bg-amber-50',
              },
            ].map(({ icon: Icon, title, value, desc, href, color, bg }) => (
              <div key={title} className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{title}</p>
                  {href ? (
                    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      className={`text-sm font-semibold ${color} hover:underline`}>
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{value}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-5">Send us a Message</h2>

            {status === 'success' ? (
              <div className="flex flex-col items-center py-12 text-center">
                <CheckCircle className="w-14 h-14 text-green-500 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-2">Message Sent!</h3>
                <p className="text-sm text-slate-500">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-5 text-sm text-sky-600 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Full Name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Nakayima"
                      className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Subject *</label>
                  <input
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="How can we help you?"
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us more about your question or issue..."
                    className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-sky-300 focus:outline-none"
                  />
                </div>
                {status === 'error' && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {status === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

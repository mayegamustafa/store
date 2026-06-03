'use client';

import Link from 'next/link';

const LAST_UPDATED = 'January 2025';
const COMPANY = 'TotalStore';
const EMAIL = 'privacy@totalstore.co.ke';

export default function CookiesPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Cookie Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none text-slate-700 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">1. What Are Cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit {COMPANY}. They help us provide a better
            shopping experience by remembering your preferences and login sessions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">2. Cookies We Use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Essential Cookies:</strong> Required for login, shopping cart, and checkout functionality. These cannot be disabled.</li>
            <li><strong>Authentication Cookies:</strong> Keep you signed in so you don&apos;t have to log in on every page.</li>
            <li><strong>Preference Cookies:</strong> Remember your language, currency, and display preferences.</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site so we can improve it.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">3. Third-Party Cookies</h2>
          <p>
            We may use third-party services such as payment processors (Pesapal, MTN MoMo) and analytics providers.
            These services may set their own cookies. We do not control these cookies and recommend reviewing
            their privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">4. Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. Disabling essential cookies may affect the
            functionality of our website, including your ability to log in and make purchases.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">5. Contact Us</h2>
          <p>If you have questions about our use of cookies, contact us at <a href={`mailto:${EMAIL}`} className="text-sky-600 underline">{EMAIL}</a>.</p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-slate-200 text-sm text-slate-500">
        <Link href="/privacy" className="text-sky-600 hover:underline mr-4">Privacy Policy</Link>
        <Link href="/terms" className="text-sky-600 hover:underline">Terms of Service</Link>
      </div>
    </div>
  );
}

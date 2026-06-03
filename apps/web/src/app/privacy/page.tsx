'use client';

import Link from 'next/link';

const LAST_UPDATED = 'January 2025';
const COMPANY      = 'TotalStore';
const EMAIL        = 'privacy@totalstore.co.ke';

export default function PrivacyPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none text-slate-700 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">1. Introduction</h2>
          <p>
            Welcome to {COMPANY}. We are committed to protecting your personal information and your right to privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit
            our website and make purchases from us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">2. Information We Collect</h2>
          <p>We collect information you provide directly, including:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Name, email address, phone number, and delivery address when you create an account or place an order.</li>
            <li>Payment information processed securely through our payment partners (we never store full card numbers).</li>
            <li>Communications with us, including customer support chats and emails.</li>
            <li>Reviews, ratings, and other content you post on the platform.</li>
          </ul>
          <p className="mt-3">We also collect data automatically, such as:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Device information (browser type, operating system, IP address).</li>
            <li>Browsing behaviour on our site (pages visited, products viewed).</li>
            <li>Cookies and similar tracking technologies.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To process and fulfill your orders and send you related updates.</li>
            <li>To manage your account and provide customer support.</li>
            <li>To personalise your shopping experience and recommend relevant products.</li>
            <li>To send promotional communications (you can opt out at any time).</li>
            <li>To detect fraud and improve the security of our platform.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">4. Sharing Your Information</h2>
          <p>We do not sell your personal data. We may share it with:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Sellers</strong> — to fulfil your orders (name, address, phone).</li>
            <li><strong>Delivery partners</strong> — to arrange last-mile delivery.</li>
            <li><strong>Payment processors</strong> — to complete transactions securely.</li>
            <li><strong>Service providers</strong> — analytics, cloud hosting, email delivery.</li>
            <li><strong>Law enforcement</strong> — when required by applicable law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">5. Cookies</h2>
          <p>
            We use cookies to keep you signed in, remember your cart, and improve site performance.
            You can disable cookies in your browser settings; however, some features may not work correctly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">6. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as necessary to provide
            services, comply with legal obligations, resolve disputes, and enforce our agreements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and data (subject to legal retention requirements).</li>
            <li>Opt out of marketing communications at any time.</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, contact us at <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a>.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">8. Security</h2>
          <p>
            We implement industry-standard security measures to protect your data. However, no method of
            transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes
            by email or by displaying a notice on our website. Your continued use of our services after
            changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a>.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-slate-100 text-sm text-slate-500">
        See also: <Link href="/terms" className="text-primary underline">Terms of Service</Link>
      </div>
    </div>
  );
}

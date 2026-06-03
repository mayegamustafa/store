'use client';

import Link from 'next/link';

const LAST_UPDATED = 'January 2025';
const COMPANY      = 'TotalStore';
const EMAIL        = 'legal@totalstore.co.ke';

export default function TermsPage() {
  return (
    <div className="container-app py-10 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none text-slate-700 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using {COMPANY} (&quot;Platform&quot;), you agree to be bound by these Terms of Service.
            If you do not agree to all terms, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">2. Use of the Platform</h2>
          <p>You agree to use the Platform only for lawful purposes. You must not:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Use the Platform in any way that violates applicable local, national, or international law.</li>
            <li>Transmit unsolicited promotional or advertising material (spam).</li>
            <li>Attempt to gain unauthorised access to any part of the Platform.</li>
            <li>Use the Platform to conduct any fraudulent activity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">3. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all
            activities that occur under your account. Notify us immediately at{' '}
            <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a> if you suspect
            unauthorised access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">4. Orders and Payments</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All prices are displayed in Ugandan Shillings (UGX) and are inclusive of applicable taxes unless stated otherwise.</li>
            <li>We reserve the right to refuse or cancel orders at our discretion (e.g., suspected fraud, pricing errors).</li>
            <li>Payment must be completed at checkout. Orders are confirmed only upon successful payment.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">5. Delivery</h2>
          <p>
            Delivery timelines are estimates and may vary based on location and availability. We are not liable
            for delays caused by circumstances outside our control (e.g., weather, strikes, customs).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">6. Returns and Refunds</h2>
          <p>
            You may return eligible items within 7 days of delivery provided they are unused, in original
            packaging, and accompanied by proof of purchase. Refunds are processed within 5–10 business days
            after we receive and inspect the returned item. Perishable goods and personalised items are
            non-returnable unless defective.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">7. Seller Obligations</h2>
          <p>Sellers on the Platform agree to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>List only products they are legally permitted to sell.</li>
            <li>Provide accurate product descriptions, images, and pricing.</li>
            <li>Fulfil orders promptly and maintain adequate stock levels.</li>
            <li>Handle customer complaints professionally and in good faith.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">8. Intellectual Property</h2>
          <p>
            All content on the Platform — including logos, graphics, software, and text — is owned by or
            licensed to {COMPANY}. You may not reproduce, distribute, or create derivative works without
            our written permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, {COMPANY} is not liable for any indirect, incidental,
            special, or consequential damages arising from your use of the Platform. Our total liability
            for any claim shall not exceed the amount you paid for the transaction giving rise to the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">10. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Uganda. Any disputes shall be resolved in the courts
            of Kampala, Uganda.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">11. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Continued use of the Platform after changes are posted
            constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">12. Contact</h2>
          <p>
            Questions about these Terms? Email us at{' '}
            <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a>.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-slate-100 text-sm text-slate-500">
        See also: <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>
      </div>
    </div>
  );
}

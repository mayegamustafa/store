import Link from 'next/link';
import { HelpCircle, ChevronDown } from 'lucide-react';

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    faqs: [
      { q: 'How do I become a seller on TotalStore?', a: 'Register at totalstore.ug/seller/register, fill in your business details, and submit for review. Our team approves new sellers within 2 business days.' },
      { q: 'Is there a fee to sign up?', a: 'Registration is completely free. TotalStore only earns a commission (typically 8–12%) when you make a sale.' },
      { q: 'What documents do I need?', a: 'For businesses: Certificate of Incorporation, TIN, and a valid ID. For individuals: National ID or Passport only.' },
      { q: 'How long does approval take?', a: 'Usually 1–2 business days. You\'ll receive an SMS and email once approved.' },
    ],
  },
  {
    title: 'Products & Listings',
    faqs: [
      { q: 'How many products can I list?', a: 'There is no limit on the number of products. Free plan sellers can list up to 100 products; premium sellers have unlimited listings.' },
      { q: 'What categories can I sell in?', a: 'You can sell in Electronics, Fashion, Home & Living, Food & Groceries, Health & Beauty, Baby & Kids, Sports, and more. Restricted categories (e.g. pharmaceuticals) require additional certification.' },
      { q: 'How do I add product variants (sizes, colours)?', a: 'In the product creation form, scroll to "Variants". You can add as many combinations as needed, each with its own price and stock.' },
      { q: 'Can I offer discounts or run promotions?', a: 'Yes. You can set a "Compare At" price for strike-through discounts, or enrol products in TotalStore Flash Sales campaigns.' },
    ],
  },
  {
    title: 'Orders & Fulfilment',
    faqs: [
      { q: 'How am I notified of new orders?', a: 'You receive an SMS and push notification instantly when a customer places an order. You can also see all orders in your Seller Dashboard.' },
      { q: 'How long do I have to process an order?', a: 'Orders should be confirmed and handed to the rider within 24 hours. Failing to fulfil orders on time may result in penalties.' },
      { q: 'Do I arrange my own delivery?', a: 'No. TotalStore\'s rider network handles delivery. You simply need to package the order and make it ready for collection.' },
      { q: 'Can I cancel an order?', a: 'You can raise a cancellation request for an order if stock is unavailable. Excessive cancellations will affect your seller rating.' },
    ],
  },
  {
    title: 'Payments & Payouts',
    faqs: [
      { q: 'When do I receive payment?', a: 'Funds are released 48 hours after successful delivery confirmation. Payouts are made every Tuesday and Friday via MTN MoMo or bank transfer.' },
      { q: 'What is TotalStore\'s commission?', a: 'Commission varies by category (8–15%). The exact rate is shown before you list a product and in your earnings reports.' },
      { q: 'How do I track my earnings?', a: 'Go to Seller Dashboard → Finance for a full breakdown of revenue, commissions, pending payouts, and completed transfers.' },
      { q: 'What if a customer requests a refund?', a: 'If the return is approved, the order value (minus commission) is deducted from your next payout. You\'ll be notified throughout the process.' },
    ],
  },
  {
    title: 'Performance & Support',
    faqs: [
      { q: 'What happens if my seller rating drops?', a: 'Sellers with ratings below 3.0 receive a warning. Continued low performance may result in restricted visibility or suspension.' },
      { q: 'How do I contact seller support?', a: 'Email sellersupp@totalstore.ug, call +256 700 000 000 (Mon–Sat, 8am–8pm), or use the live chat in your Seller Dashboard.' },
      { q: 'Can I have multiple stores?', a: 'Currently, one store per business registration is allowed. Contact our team if you need multi-store access.' },
    ],
  },
];

export default function SellerFAQPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Seller FAQ</h1>
          <p className="text-indigo-200 text-sm">Everything you need to know about selling on TotalStore</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b px-6 py-4">
              <h2 className="font-bold text-slate-900">{section.title}</h2>
            </div>
            <div className="divide-y">
              {section.faqs.map(({ q, a }) => (
                <details key={q} className="group px-6 py-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none gap-3">
                    <span className="text-sm font-medium text-slate-800">{q}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-indigo-600 rounded-2xl p-7 text-white text-center">
          <h3 className="font-bold text-lg mb-2">Still have questions?</h3>
          <p className="text-indigo-200 text-sm mb-5">Our seller support team is ready to help you succeed.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:sellersupp@totalstore.ug"
              className="bg-white text-indigo-700 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-indigo-50 transition">
              Email Support
            </a>
            <Link href="/seller/register"
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition border border-indigo-400">
              Start Selling Today
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

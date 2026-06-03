import Link from 'next/link';
import { Shield } from 'lucide-react';

const POLICIES = [
  {
    id: 'listing',
    title: '1. Product Listing Policy',
    content: [
      'All product listings must accurately represent the item being sold. Misleading titles, descriptions, or images are strictly prohibited.',
      'Products must belong to an approved category. Counterfeit, stolen, hazardous, or illegal goods are banned and will result in immediate account suspension.',
      'Sellers must clearly indicate whether a product is new, refurbished, or used.',
      'Product images must be clear, high-quality, and must match the actual item. Stock images from the internet without proper rights are not allowed.',
      'All prices must be listed in the applicable local currency (UGX, KES, NGN, GHS, etc.) inclusive of VAT where applicable.',
    ],
  },
  {
    id: 'fulfilment',
    title: '2. Order Fulfilment Policy',
    content: [
      'Sellers must confirm and package orders within 24 hours of receiving a new order notification.',
      'Orders must be ready for rider pickup within the agreed handover window. Late handovers negatively affect your seller score.',
      'If you cannot fulfil an order due to stock issues, you must cancel with adequate notice. Excessive cancellations (over 5% monthly) may result in account restrictions.',
      'All items must be securely packaged to prevent damage during transit. TotalStore is not liable for damage caused by poor packaging.',
    ],
  },
  {
    id: 'pricing',
    title: '3. Pricing Policy',
    content: [
      'Prices must be competitive and must not include artificially inflated "original" prices to create false discount impressions.',
      'Sellers may not list items at prices that violate price control regulations in your jurisdiction.',
      'Price gouging during national emergencies, holidays, or periods of high demand is strictly prohibited.',
      'TotalStore reserves the right to remove listings with prices deemed unreasonably high or low.',
    ],
  },
  {
    id: 'communication',
    title: '4. Seller–Buyer Communication',
    content: [
      'All communication with buyers must take place through TotalStore\'s messaging system. Sharing contact information or directing buyers off-platform is prohibited.',
      'Sellers must respond to customer queries within 12 hours during business days.',
      'Harassment, threats, or abuse of buyers will result in immediate suspension.',
      'Sellers may not solicit buyers to cancel TotalStore transactions and transact directly.',
    ],
  },
  {
    id: 'returns',
    title: '5. Returns & Refunds Policy',
    content: [
      'Sellers must honour TotalStore\'s standard 7-day return policy for eligible items.',
      'If a buyer receives a wrong, damaged, or counterfeit item, the seller bears full responsibility for the return cost and refund.',
      'Sellers may dispute return requests through the Seller Dashboard within 72 hours of receiving a return request.',
      'Approved refund amounts are deducted from the seller\'s next payout cycle.',
    ],
  },
  {
    id: 'payouts',
    title: '6. Payments & Payout Policy',
    content: [
      'Payouts are released 48 hours after successful delivery confirmed by the buyer or rider.',
      'Payouts are processed every Tuesday and Friday via MTN MoMo or bank transfer.',
      'TotalStore deducts a commission (8–15% depending on category) before releasing seller earnings.',
      'Sellers must maintain a valid payout method. Unclaimed payouts after 90 days may be forfeited subject to written notice.',
      'TotalStore may withhold payouts during fraud investigations or unresolved disputes.',
    ],
  },
  {
    id: 'performance',
    title: '7. Seller Performance Standards',
    content: [
      'Maintain a minimum seller rating of 3.5/5.0 to remain in good standing.',
      'Order cancellation rate must remain below 5% per month.',
      'Late fulfilment rate must remain below 10% per month.',
      'Sellers who fall below standards receive warnings, then temporary restrictions, then suspension if improvement is not seen.',
    ],
  },
  {
    id: 'suspension',
    title: '8. Account Suspension & Termination',
    content: [
      'TotalStore reserves the right to suspend or terminate seller accounts for violation of any of these policies.',
      'Sellers will be notified of any suspension via email and SMS, with reasons provided.',
      'Sellers may appeal suspensions within 14 days by contacting sellersupp@totalstore.ug.',
      'TotalStore is not liable for any loss of earnings resulting from account suspension due to policy violations.',
    ],
  },
];

export default function SellerPoliciesPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Seller Policies</h1>
          <p className="text-slate-300 text-sm mb-1">Last updated: March 2026</p>
          <p className="text-slate-400 text-sm">By selling on TotalStore you agree to the following policies</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Table of contents */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide">Contents</h2>
          <ol className="space-y-1.5">
            {POLICIES.map((p) => (
              <li key={p.id}>
                <a href={`#${p.id}`} className="text-sm text-sky-600 hover:underline">
                  {p.title}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Policy sections */}
        <div className="space-y-6">
          {POLICIES.map((section) => (
            <div key={section.id} id={section.id} className="bg-white rounded-2xl shadow-sm p-6 scroll-mt-20">
              <h2 className="font-bold text-slate-900 text-lg mb-4">{section.title}</h2>
              <ul className="space-y-3">
                {section.content.map((c, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                    <span className="w-5 h-5 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          Questions about these policies?{' '}
          <Link href="/contact" className="text-sky-600 hover:underline">Contact us</Link>{' '}
          or email{' '}
          <a href="mailto:sellersupp@totalstore.ug" className="text-sky-600 hover:underline">
            sellersupp@totalstore.ug
          </a>
        </div>
      </div>
    </div>
  );
}

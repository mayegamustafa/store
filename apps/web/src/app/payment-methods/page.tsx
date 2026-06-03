'use client';

import { CreditCard, Smartphone, Banknote, ShieldCheck } from 'lucide-react';

export default function PaymentMethodsPage() {
  const methods = [
    {
      icon: Smartphone,
      title: 'Mobile Money',
      description: 'Pay conveniently using MTN Mobile Money or Airtel Money via Pesapal.',
      details: ['MTN MoMo', 'Airtel Money', 'Instant confirmation', 'No extra charges'],
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      icon: CreditCard,
      title: 'Card Payment',
      description: 'Securely pay with Visa or Mastercard through our Pesapal payment gateway.',
      details: ['Visa', 'Mastercard', 'SSL encrypted', '3D Secure verified'],
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Banknote,
      title: 'Cash on Delivery',
      description: 'Pay in cash when your order is delivered to your doorstep.',
      details: ['Pay on arrival', 'No upfront payment', 'Available nationwide', 'Exact change preferred'],
      color: 'bg-green-50 text-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
          <p className="mt-2 text-gray-600">Choose your preferred way to pay at TotalStore</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {methods.map((method) => (
            <div key={method.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${method.color}`}>
                <method.icon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{method.title}</h2>
              <p className="text-sm text-gray-600 mb-4">{method.description}</p>
              <ul className="space-y-2">
                {method.details.map((detail) => (
                  <li key={detail} className="flex items-center text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Secure Payments</h3>
              <p className="text-sm text-gray-600 mt-1">
                All online transactions are processed securely through Pesapal, a PCI-DSS compliant payment gateway.
                Your payment information is encrypted and never stored on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

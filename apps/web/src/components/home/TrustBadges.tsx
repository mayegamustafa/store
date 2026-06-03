import { ShieldCheck, Headphones, RefreshCcw, Truck, CreditCard } from 'lucide-react';

const BADGES = [
  { icon: Truck,       title: 'Free Delivery',   desc: 'Orders above UGX 100k',    color: 'text-sky-500',     bg: 'bg-sky-50' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: '48+ payment gateways',      color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: RefreshCcw,  title: 'Easy Returns',    desc: '14-day hassle-free returns', color: 'text-amber-500',   bg: 'bg-amber-50' },
  { icon: Headphones,  title: '24/7 Support',    desc: 'Always here to help',        color: 'text-violet-500',  bg: 'bg-violet-50' },
  { icon: CreditCard,  title: 'Pay with MoMo',   desc: 'MTN & Airtel Money',         color: 'text-rose-500',    bg: 'bg-rose-50' },
];

export function TrustBadges() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-card overflow-x-auto scrollbar-hide">
      <div className="flex items-center divide-x divide-slate-100 min-w-max md:min-w-0">
        {BADGES.map(({ icon: Icon, title, desc, color, bg }) => (
          <div key={title} className="flex items-center gap-3 px-5 py-4 group">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 whitespace-nowrap">{title}</p>
              <p className="text-[11px] text-slate-400 whitespace-nowrap mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

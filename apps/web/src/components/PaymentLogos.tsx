/**
 * Payment method logos for checkout using actual brand images.
 */
import Image from 'next/image';

export function MtnBadge() {
  return (
    <span className="inline-flex items-center justify-center px-2 py-1 bg-yellow-400 rounded-md">
      <Image src="/logos/mtn.svg" alt="MTN" width={40} height={20} className="h-5 w-auto" />
    </span>
  );
}

export function AirtelBadge() {
  return (
    <span className="inline-flex items-center justify-center px-2 py-1 bg-white rounded-md border border-slate-200">
      <Image src="/logos/airtel.png" alt="Airtel" width={80} height={32} className="h-7 w-auto" />
    </span>
  );
}

export function VisaBadge() {
  return (
    <span className="inline-flex items-center px-2 py-1 bg-blue-700 text-white rounded-md text-[10px] font-bold tracking-wider italic">
      VISA
    </span>
  );
}

export function MastercardBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-1 bg-slate-800 text-white rounded-md text-[10px] font-bold tracking-wider">
      <svg className="w-4 h-3" viewBox="0 0 32 20" fill="none">
        <circle cx="11" cy="10" r="8" fill="#EB001B" />
        <circle cx="21" cy="10" r="8" fill="#F79E1B" />
        <path d="M16 3.87a8 8 0 0 1 0 12.26 8 8 0 0 1 0-12.26z" fill="#FF5F00" />
      </svg>
      MC
    </span>
  );
}

export function PesapalBadge() {
  return (
    <span className="inline-flex items-center justify-center px-1 py-1 bg-white rounded-md border border-slate-200">
      <Image src="/logos/pesapal.png" alt="Pesapal" width={60} height={20} className="h-5 w-auto" />
    </span>
  );
}

export function PaymentLogosRow({ type }: { type: 'mobile' | 'card' | 'all' }) {
  if (type === 'mobile') {
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        <MtnBadge />
        <AirtelBadge />
        <PesapalBadge />
      </div>
    );
  }
  if (type === 'card') {
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        <VisaBadge />
        <MastercardBadge />
        <PesapalBadge />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <MtnBadge />
      <AirtelBadge />
      <VisaBadge />
      <MastercardBadge />
      <PesapalBadge />
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { brandsApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark } from 'lucide-react';

const FALLBACK = [
  { id: 'samsung',  name: 'Samsung',  monogram: 'SA', circleBg: 'bg-blue-600',   href: '/products?brand=samsung' },
  { id: 'apple',    name: 'Apple',    monogram: 'AP', circleBg: 'bg-slate-800',   href: '/products?brand=apple' },
  { id: 'nike',     name: 'Nike',     monogram: 'NK', circleBg: 'bg-orange-500', href: '/products?brand=nike' },
  { id: 'adidas',   name: 'Adidas',   monogram: 'AD', circleBg: 'bg-zinc-900',   href: '/products?brand=adidas' },
  { id: 'lg',       name: 'LG',       monogram: 'LG', circleBg: 'bg-red-600',    href: '/products?brand=lg' },
  { id: 'huawei',   name: 'Huawei',   monogram: 'HW', circleBg: 'bg-rose-600',   href: '/products?brand=huawei' },
  { id: 'hisense',  name: 'Hisense',  monogram: 'HS', circleBg: 'bg-sky-600',    href: '/products?brand=hisense' },
  { id: 'nestle',   name: 'Nestlé',   monogram: 'NE', circleBg: 'bg-amber-500',  href: '/products?brand=nestle' },
  { id: 'unilever', name: 'Unilever', monogram: 'UL', circleBg: 'bg-blue-800',   href: '/products?brand=unilever' },
  { id: 'lenovo',   name: 'Lenovo',   monogram: 'LV', circleBg: 'bg-red-700',    href: '/products?brand=lenovo' },
  { id: 'sony',     name: 'Sony',     monogram: 'SN', circleBg: 'bg-slate-700',  href: '/products?brand=sony' },
  { id: 'hp',       name: 'HP',       monogram: 'HP', circleBg: 'bg-indigo-600', href: '/products?brand=hp' },
];

export default function BrandsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list().then((r: any) => r.data?.data ?? r.data ?? []).catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const brands: any[] = Array.isArray(data) && data.length > 0 ? data : FALLBACK;

  return (
    <div className="container-app py-8">
      <div className="flex items-center gap-3 mb-6">
        <Bookmark className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Top Brands</h1>
          <p className="text-sm text-slate-500 mt-0.5">Official stores — genuine products</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {brands.map((b: any) => (
            <Link
              key={b.id}
              href={b.href ?? `/products?brand=${b.id}`}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-primary/30 transition group"
            >
              {b.logo ? (
                <div className="w-14 h-14 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden bg-white">
                  <Image src={b.logo} alt={b.name} width={48} height={48} className="object-contain" />
                </div>
              ) : (
                <div className={`w-14 h-14 rounded-2xl ${b.circleBg ?? 'bg-zinc-800'} flex items-center justify-center`}>
                  <span className="text-sm font-black text-white tracking-wide">{b.monogram}</span>
                </div>
              )}
              <p className="text-xs font-semibold text-slate-700 text-center leading-tight group-hover:text-primary transition">
                {b.name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

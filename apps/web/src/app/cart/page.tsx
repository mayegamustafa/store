'use client';

import { useCartStore } from '@/stores/cart.store';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery } from '@tanstack/react-query';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/settings/public`).then(r => r.json()),
    staleTime: 300_000,
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const freeThreshold = Number(settingsData?.FREE_DELIVERY_THRESHOLD ?? 150000);
  const defaultFee = Number(settingsData?.DELIVERY_FEE_DEFAULT ?? 5000);
  const deliveryFee = subtotal >= freeThreshold ? 0 : defaultFee;
  const total = subtotal + deliveryFee - couponDiscount;

  const applyCouponMutation = useMutation({
    mutationFn: (code: string) =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ code, orderAmount: subtotal }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.valid) {
        setCouponDiscount(data.discountAmount);
        setAppliedCoupon(couponCode);
        toast.success(`Coupon applied! You save UGX ${data.discountAmount.toLocaleString()}`);
      } else {
        toast.error(data.message || 'Invalid coupon');
      }
    },
  });

  if (items.length === 0) {
    return (
      <div className="container-app py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-6">Add items to your cart to checkout</p>
        <Link href="/products" className="btn-primary px-6 py-2.5 rounded-xl inline-block">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <div className="container-app">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm flex gap-4">
                <div className="relative w-24 h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden">
                  <Image
                    src={item.image || '/placeholder.png'}
                    alt={item.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.productId}`}
                    className="text-sm font-medium text-slate-800 hover:text-sky-600 line-clamp-2 leading-snug"
                  >
                    {item.name}
                  </Link>
                  {item.sellerName && (
                    <p className="text-xs text-slate-500 mt-1">{item.sellerName}</p>
                  )}
                  {item.variantId && (
                    <p className="text-xs text-slate-400 mt-0.5">Variant: {item.variantId}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            removeItem(item.id);
                            toast.success('Item removed');
                          }
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-l-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1.5 hover:bg-slate-100 rounded-r-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-bold text-sky-600 text-sm">
                      UGX {(item.price * item.quantity).toLocaleString()}
                    </span>
                    <button
                      onClick={() => {
                        removeItem(item.id);
                        toast.success('Item removed');
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-600" />
                Promo Code
              </h3>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-green-700 font-medium">{appliedCoupon} applied!</span>
                  <button
                    onClick={() => { setCouponDiscount(0); setAppliedCoupon(''); setCouponCode(''); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm uppercase"
                  />
                  <button
                    onClick={() => applyCouponMutation.mutate(couponCode)}
                    disabled={!couponCode || applyCouponMutation.isPending}
                    className="btn-primary px-3 py-2 text-sm rounded-lg"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span>UGX {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery fee</span>
                  <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                    {deliveryFee === 0 ? 'FREE' : `UGX ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon discount</span>
                    <span>-UGX {couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                {deliveryFee === 0 && (
                  <p className="text-xs text-green-600">Free delivery on orders above UGX 150,000!</p>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-slate-900 text-base">
                  <span>Total</span>
                  <span className="text-sky-600">UGX {total.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => router.push(`/checkout?coupon=${appliedCoupon}`)}
                className="w-full btn-primary py-3 rounded-xl mt-4 font-semibold flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ordersApi, paymentsApi, addressesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { MapPin, CreditCard, Smartphone, Truck, Plus, Check, Banknote, Navigation, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { PaymentLogosRow } from '@/components/PaymentLogos';

const PAYMENT_METHODS = [
  {
    id: 'PESAPAL_MOBILE',
    label: 'Mobile Money (MTN, Airtel)',
    IconComp: Smartphone,
    iconColor: 'text-yellow-600',
    description: 'You will be redirected securely to Pesapal to complete payment.',
    color: 'bg-yellow-50 border-yellow-300',
    activeColor: 'bg-yellow-100 border-yellow-500',
  },
  {
    id: 'PESAPAL',
    label: 'Card Payment (Visa, Mastercard)',
    IconComp: CreditCard,
    iconColor: 'text-blue-600',
    description: 'Pesapal Secure Checkout — Visa, Mastercard, Bank Transfer',
    color: 'bg-blue-50 border-blue-300',
    activeColor: 'bg-blue-100 border-blue-500',
  },
  {
    id: 'CASH_ON_DELIVERY',
    label: 'Cash on Delivery',
    IconComp: Banknote,
    iconColor: 'text-slate-600',
    description: 'Pay when you receive your order',
    color: 'bg-slate-50 border-slate-300',
    activeColor: 'bg-slate-100 border-slate-500',
  },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const coupon = searchParams.get('coupon') || '';

  const [step, setStep] = useState<'address' | 'payment'>('address');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('PESAPAL_MOBILE');
  const [addingAddress, setAddingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '',
    phone: user?.phone || '',
    addressLine1: '',
    city: '',
    district: '',
    country: '',
  });

  const { items } = useCartStore();

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => addressesApi.list().then((r: any) => ({ addresses: r.data?.data ?? r.data ?? [] })),
    enabled: !!user,
  });

  const [placingOrder, setPlacingOrder] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/settings/public`).then(r => r.json()),
    staleTime: 300_000,
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const freeThreshold = Number(settingsData?.FREE_DELIVERY_THRESHOLD ?? 150000);
  const defaultFee = Number(settingsData?.DELIVERY_FEE_DEFAULT ?? 5000);
  const deliveryFee = subtotal >= freeThreshold ? 0 : defaultFee;
  const total = subtotal + deliveryFee;

  const addresses: any[] = profile?.addresses ?? [];

  const isValidPhone = (phone: string) => /^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''));

  const handlePlaceOrder = async () => {
    if (!selectedAddressId && addresses.length > 0) {
      toast.error('Please select a delivery address');
      return;
    }
    setPlacingOrder(true);
    try {
      const apiMethod = selectedPayment === 'PESAPAL_MOBILE' ? 'PESAPAL' : selectedPayment;
      const orderRes: any = await ordersApi.create({
        addressId: selectedAddressId || undefined,
        paymentMethod: apiMethod,
        couponCode: coupon || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, variantId: i.variantId })),
      });
      const order = orderRes?.data ?? orderRes;
      useCartStore.getState().clearCart();

      if (selectedPayment === 'CASH_ON_DELIVERY') {
        toast.success('Order placed successfully!');
        router.push(`/orders/${order.id}`);
        return;
      }

      // Initiate payment in the same async chain (important for mobile browsers)
      const payRes: any = await paymentsApi.initiate({ orderId: order.id, method: apiMethod });
      const result = payRes?.data ?? payRes;
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        router.push(`/orders/${order.id}?payment=pending`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to place order');
      setPlacingOrder(false);
    }
  };

  const saveAddress = async () => {
    setSavingAddress(true);
    try {
      const res: any = await addressesApi.create(newAddress);
      const saved = res?.data?.data ?? res?.data ?? { id: Date.now().toString(), ...newAddress };
      await refetchProfile();
      setSelectedAddressId(saved.id ?? '');
      setAddingAddress(false);
      setNewAddress({
        label: 'Home',
        fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '',
        phone: user?.phone || '',
        addressLine1: '',
        city: '',
        district: '',
        country: '',
      });
      toast.success('Address saved!');
    } catch {
      toast.error('Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const detectGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS not supported by your browser');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          // Try Google Maps Geocoding API first (more accurate for Uganda)
          let resolved = false;
          try {
            const cfgRes = await fetch('/api/v1/config/maps').catch(() => null);
            const cfg = cfgRes?.ok ? await cfgRes.json() : null;
            const googleKey = cfg?.googleMapsApiKey;
            if (googleKey) {
              const gRes = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}&result_type=street_address|route|sublocality|locality`
              );
              const gData = await gRes.json();
              if (gData.status === 'OK' && gData.results?.length > 0) {
                const components = gData.results[0].address_components as Array<{ long_name: string; types: string[] }>;
                const get = (type: string) => components.find(c => c.types.includes(type))?.long_name || '';
                setNewAddress((prev) => ({
                  ...prev,
                  addressLine1: [get('street_number'), get('route'), get('sublocality_level_1')].filter(Boolean).join(' ') || gData.results[0].formatted_address.split(',')[0],
                  city: get('locality') || get('administrative_area_level_2') || get('sublocality'),
                  district: get('administrative_area_level_2') || get('administrative_area_level_3') || get('sublocality'),
                  region: get('administrative_area_level_1'),
                  country: get('country') || 'Uganda',
                }));
                resolved = true;
              }
            }
          } catch { /* fall through to Nominatim */ }

          if (!resolved) {
            // Nominatim fallback with Uganda-optimized field mapping
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            const addr = data.address || {};
            const houseNum = addr.house_number ? `${addr.house_number} ` : '';
            const street = addr.road || addr.pedestrian || addr.footway || addr.path || '';
            setNewAddress((prev) => ({
              ...prev,
              addressLine1: street ? `${houseNum}${street}` : (addr.suburb || addr.neighbourhood || data.display_name?.split(',')[0] || ''),
              city: addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county || '',
              district: addr.county || addr.state_district || addr.district || addr.suburb || '',
              region: addr.state || addr.region || '',
              country: addr.country || 'Uganda',
            }));
          }

          toast.success('Location detected!');
        } catch {
          toast.error('Failed to reverse geocode location');
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        if (err.code === 1) toast.error('Location permission denied — please allow location access in browser settings');
        else if (err.code === 2) toast.error('Location unavailable — check GPS signal');
        else toast.error('Could not determine your location');
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  if (!user) {
    return (
      <div className="container-app py-20 text-center">
        <p className="text-slate-600 mb-4">Please login to checkout</p>
        <Link href="/auth/login" className="btn-primary px-6 py-2.5 rounded-xl inline-block">Login</Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <div className="container-app">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>

        {/* Steps */}
        <div className="flex items-center gap-4 mb-6">
          {[{ key: 'address', label: '1. Delivery Address' }, { key: 'payment', label: '2. Payment' }].map(
            (s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step === s.key
                      ? 'bg-sky-500 text-white'
                      : step === 'payment' && s.key === 'address'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step === 'payment' && s.key === 'address' ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-sm font-medium ${
                    step === s.key ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Step 1: Address */}
            {step === 'address' && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-sky-500" />
                  Delivery Address
                </h2>
                <div className="space-y-3 mb-4">
                  {addresses.map((addr: any) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                        selectedAddressId === addr.id
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
                            {addr.label}
                          </span>
                          <p className="font-medium text-slate-800 mt-1">{addr.fullName}</p>
                          <p className="text-sm text-slate-600">{addr.addressLine1}</p>
                          <p className="text-sm text-slate-600">{addr.city}, {addr.district}, {addr.country}</p>
                          <p className="text-sm text-slate-500">{addr.phone}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedAddressId === addr.id ? 'border-sky-500 bg-sky-500' : 'border-slate-300'
                        }`}>
                          {selectedAddressId === addr.id && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {addingAddress ? (
                  <div className="border-2 border-dashed border-sky-300 rounded-xl p-4 space-y-3">
                    <h3 className="font-medium text-slate-800">New Address</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={detectGpsLocation}
                          disabled={detectingGps}
                          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-sky-300 text-sky-600 text-sm py-2 rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50"
                        >
                          {detectingGps ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Navigation className="w-4 h-4" />
                          )}
                          {detectingGps ? 'Detecting location...' : 'Auto-detect my location (GPS)'}
                        </button>
                      </div>
                      {[
                        { key: 'fullName', label: 'Full Name' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'addressLine1', label: 'Street / Zone', full: true },
                        { key: 'city', label: 'City' },
                        { key: 'district', label: 'District' },
                      ].map((f) => (
                        <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                          <label className="text-xs text-slate-600 mb-1 block">{f.label}</label>
                          <input
                            value={(newAddress as any)[f.key]}
                            onChange={(e) => setNewAddress((p) => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveAddress}
                        disabled={savingAddress}
                        className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2 disabled:opacity-50"
                      >
                        {savingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {savingAddress ? 'Saving...' : 'Save Address'}
                      </button>
                      <button onClick={() => setAddingAddress(false)} className="border px-4 py-2 text-sm rounded-lg hover:bg-slate-50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingAddress(true)}
                    className="flex items-center gap-2 text-sky-600 text-sm hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Add new address
                  </button>
                )}

                <button
                  onClick={() => {
                    if (!selectedAddressId && addresses.length > 0) {
                      toast.error('Select an address first');
                      return;
                    }
                    setStep('payment');
                  }}
                  className="w-full btn-primary py-3 rounded-xl mt-5 font-semibold"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 'payment' && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-sky-500" />
                  Payment Method
                </h2>
                <div className="space-y-3 mb-5">
                  {PAYMENT_METHODS.map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                        selectedPayment === method.id ? method.activeColor : method.color
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <method.IconComp className={`w-6 h-6 ${method.iconColor}`} />
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{method.label}</p>
                            <p className="text-xs text-slate-500">{method.description}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPayment === method.id ? 'border-sky-500 bg-sky-500' : 'border-slate-300'
                        }`}>
                          {selectedPayment === method.id && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      {/* Phone input for Mobile Money — REMOVED: Pesapal handles phone collection */}
                      {selectedPayment === method.id && method.id === 'PESAPAL_MOBILE' && (
                        <div className="mt-3 pt-3 border-t border-yellow-200">
                          <p className="text-xs text-yellow-800 font-medium mb-1">Pay with Mobile Money (MTN, Airtel)</p>
                          <p className="text-xs text-yellow-600">You will be redirected securely to Pesapal to enter your phone number and complete payment.</p>
                          <PaymentLogosRow type="mobile" />
                        </div>
                      )}
                      {/* Pesapal card info */}
                      {selectedPayment === method.id && method.id === 'PESAPAL' && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-blue-700 mb-1 font-medium">You will be securely redirected to Pesapal to complete payment.</p>
                          <PaymentLogosRow type="card" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('address')}
                    className="border px-4 py-3 rounded-xl text-sm hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placingOrder}
                    className="flex-1 btn-primary py-3 rounded-xl font-semibold"
                  >
                    {placingOrder
                      ? 'Processing...'
                      : `Place Order · UGX ${total.toLocaleString()}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl p-5 shadow-sm h-fit">
            <h3 className="font-semibold text-slate-800 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image || '/placeholder.png'}
                      alt={item.name}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 line-clamp-2 leading-snug">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-800 flex-shrink-0">
                    UGX {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>UGX {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                  {deliveryFee === 0 ? 'FREE' : `UGX ${deliveryFee.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Total</span>
                <span className="text-sky-600">UGX {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container-app py-8 text-center text-slate-500">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

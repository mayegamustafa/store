'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, reviewsApi, cartApi } from '@/lib/api';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  Star, ShoppingCart, Heart, Share2, ChevronRight, Minus, Plus,
  Shield, Truck, RefreshCw, Check, Copy, ExternalLink,
  Store, BadgeCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StartChatButton } from '@/components/chat/StartChatButton';
import ProductCard, { StarRating, StoreCategoryBadge } from '@/components/ProductCard';
import AdBanner from '@/components/ads/AdBanner';

// ── Share helper ─────────────────────────────────────────────────────────────
function useShareProduct() {
  const [copied, setCopied] = useState(false);
  const share = useCallback(async (name: string, slug: string) => {
    const url = `${window.location.origin}/products/${slug}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share({ title: name, url }); return; }
      catch (e) { if ((e as any)?.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch { toast.error('Could not copy link'); }
  }, []);
  return { share, copied };
}

export default function ProductPageView() {
  const { slug } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const addToStore = useCartStore((s) => s.addItem);
  const { toggle: toggleWishlist, has: inWishlist } = useWishlistStore();
  const { share, copied } = useShareProduct();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'specs'>('description');

  // Redirect if slug is missing or is the literal string "undefined"
  useEffect(() => {
    if (!slug || slug === 'undefined') router.replace('/');
  }, [slug, router]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug as string).then((r: any) => r.data?.data ?? r.data),
    enabled: !!slug && slug !== 'undefined',
    retry: false,
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', (product as any)?.id],
    queryFn: () => reviewsApi.getProductReviews((product as any).id, 1, 10)
      .then((r: any) => r.data?.data ?? r.data),
    enabled: !!(product as any)?.id,
  });

  const { data: relatedRaw } = useQuery({
    queryKey: ['related', slug],
    queryFn: () => productsApi.related(slug as string, 8).then((r: any) => r.data?.data ?? r.data ?? []),
    enabled: !!slug && slug !== 'undefined',
  });

  const { data: boughtTogetherRaw } = useQuery({
    queryKey: ['boughtTogether', slug],
    queryFn: () => productsApi.boughtTogether(slug as string).then((r: any) => r.data?.data ?? r.data ?? []),
    enabled: !!slug && slug !== 'undefined',
  });

  const relatedProducts: any[] = Array.isArray(relatedRaw) ? relatedRaw : [];
  const boughtTogether: any[] = Array.isArray(boughtTogetherRaw) ? boughtTogetherRaw : [];

  const addToCartMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number; variantId?: string }) =>
      cartApi.addItem({ productId: data.productId, quantity: data.quantity, variantId: data.variantId }),
    onSuccess: (_res, variables) => {
      const price = (selectedVariant as any)?.price ? Number((selectedVariant as any).price) : Number(p.basePrice ?? p.price ?? 0);
      addToStore({
        id: `${variables.productId}${variables.variantId ? '-' + variables.variantId : ''}`,
        productId: variables.productId,
        variantId: variables.variantId,
        name: p.name,
        price,
        image: p.images?.[0] ?? '',
        quantity: variables.quantity,
        sellerName: (p as any).seller?.storeName ?? '',
      });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: () => toast.error('Failed to add to cart'),
  });

  const handleAddToCart = () => {
    if (!user) { router.push('/auth/login'); return; }
    addToCartMutation.mutate({ productId: p.id, quantity, variantId: (selectedVariant as any)?.id });
  };

  const handleBuyNow = () => {
    if (!user) { router.push('/auth/login'); return; }
    addToCartMutation.mutate(
      { productId: p.id, quantity, variantId: (selectedVariant as any)?.id },
      { onSuccess: () => router.push('/cart') }
    );
  };

  if (isLoading) {
    return (
      <div className="container-app py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
          <div className="bg-slate-200 rounded-xl h-96" />
          <div className="space-y-4">
            <div className="bg-slate-200 h-8 rounded w-3/4" />
            <div className="bg-slate-200 h-4 rounded w-1/2" />
            <div className="bg-slate-200 h-12 rounded w-1/3" />
            <div className="bg-slate-200 h-10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center max-w-sm">
          <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Product not found</h2>
          <p className="text-sm text-slate-500 mb-6">This product may have been removed or the link is invalid.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.back()} className="px-4 py-2 text-sm border rounded-xl hover:bg-slate-50 transition-colors">Go back</button>
            <Link href="/" className="px-4 py-2 text-sm btn-primary rounded-xl">Shop home</Link>
          </div>
        </div>
      </div>
    );
  }

  const p = product as any;
  const images = p.images?.length ? p.images : ['/placeholder.png'];
  const productPrice = Number(p.price ?? p.basePrice ?? 0);
  const comparePrice = Number(p.compareAtPrice ?? p.comparePrice ?? 0);
  const discountPercent = comparePrice > productPrice
    ? Math.round(((comparePrice - productPrice) / comparePrice) * 100)
    : 0;
  const rating = Number(p.averageRating ?? p.rating ?? 0);
  const reviewCount = Number(p.reviewCount ?? p._count?.reviews ?? 0);
  const sellerRating = Number(p.seller?.rating ?? 0);
  const storeCategory = p.seller?.storeCategory as string | undefined;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container-app py-3">
          <nav className="flex items-center gap-1 text-sm text-slate-500">
            <Link href="/" className="hover:text-sky-600">Home</Link>
            <ChevronRight className="w-4 h-4" />
            {p.category && (
              <>
                <Link href={`/category/${p.category.slug}`} className="hover:text-sky-600">{p.category.name}</Link>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
            <span className="text-slate-800 truncate max-w-xs">{p.name}</span>
          </nav>
        </div>
      </div>

      <div className="container-app py-6">
        {/* Main product card */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">

            {/* Image Gallery */}
            <div className="p-6 lg:border-r">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 mb-4">
                <Image src={images[selectedImage]} alt={p.name} fill className="object-contain" />
                {discountPercent > 0 && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-md">
                    -{discountPercent}%
                  </div>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-sky-500' : 'border-slate-200'}`}
                  >
                    <Image src={img} alt="" width={64} height={64} className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
              <div className="mt-4 hidden lg:block">
                <AdBanner placement="product_gallery_bottom" variant="card" className="h-24" />
              </div>
            </div>

            {/* Product Info */}
            <div className="p-6">
              {/* Seller + store type */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {p.seller?.storeSlug ? (
                  <Link href={`/shops/${p.seller.storeSlug}`}
                    className="text-xs text-sky-600 font-medium uppercase tracking-wide flex items-center gap-1 hover:underline">
                    <Store className="w-3 h-3" />
                    {p.seller?.storeName || p.brand}
                  </Link>
                ) : (
                  <span className="text-xs text-sky-600 font-medium uppercase tracking-wide">
                    {p.seller?.storeName || p.brand}
                  </span>
                )}
                <StoreCategoryBadge category={storeCategory} />
                {p.seller?.isOfficial && (
                  <span className="flex items-center gap-0.5 text-[10px] text-sky-600 font-medium">
                    <BadgeCheck className="w-3 h-3" /> Official
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-3 leading-tight">{p.name}</h1>

              {/* Product star rating */}
              <div className="flex items-center gap-3 mb-1">
                <StarRating rating={rating} count={reviewCount} size="md" />
                <span className="text-xs text-slate-400">|</span>
                <span className="text-sm text-slate-600">{p.soldCount ?? 0} sold</span>
              </div>

              {/* Shop rating */}
              {sellerRating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-500">Shop rating:</span>
                  <StarRating rating={sellerRating} size="sm" />
                  <span className="text-xs text-slate-500">{sellerRating.toFixed(1)}</span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-end gap-3 mb-5">
                <span className="text-3xl font-bold text-sky-600">UGX {productPrice.toLocaleString()}</span>
                {comparePrice > 0 && (
                  <span className="text-lg text-slate-400 line-through">UGX {comparePrice.toLocaleString()}</span>
                )}
                {discountPercent > 0 && (
                  <span className="text-sm font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Save {discountPercent}%</span>
                )}
              </div>

              {/* Variants */}
              {p.variants?.length > 0 && (
                <div className="mb-5 space-y-3">
                  {Object.entries(
                    p.variants.reduce((acc: Record<string, string[]>, v: any) => {
                      if (!acc[v.name]) acc[v.name] = [];
                      acc[v.name].push(v.value);
                      return acc;
                    }, {})
                  ).map(([name, values]) => (
                    <div key={name}>
                      <p className="text-sm font-medium text-slate-700 mb-2">{name}:</p>
                      <div className="flex flex-wrap gap-2">
                        {(values as string[]).map((value) => (
                          <button key={value}
                            onClick={() => setSelectedVariant((prev) => ({ ...prev, [name]: value }))}
                            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                              selectedVariant[name] === value ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-300 hover:border-slate-400'
                            }`}
                          >{value}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4 mb-5">
                <span className="text-sm font-medium text-slate-700">Quantity:</span>
                <div className="flex items-center border rounded-lg">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="p-2 hover:bg-slate-100 rounded-l-lg transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(p.stock || 99, q + 1))} className="p-2 hover:bg-slate-100 rounded-r-lg transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-slate-500">{p.stock || 0} in stock</span>
              </div>

              {/* CTAs */}
              <div className="flex gap-3 mb-5">
                <button onClick={handleAddToCart} disabled={addToCartMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-sky-500 text-sky-600 py-3 rounded-xl font-semibold hover:bg-sky-50 transition-colors">
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
                <button onClick={handleBuyNow} className="flex-1 btn-primary py-3 rounded-xl text-lg">
                  Buy Now
                </button>
              </div>

              {/* Contact Seller */}
              {p.seller?.userId && (
                <div className="mb-5">
                  <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">Contact Seller</p>
                  <StartChatButton targetUserId={p.seller.userId} targetName={p.seller.storeName ?? 'Seller'}
                    type="BUYER_SELLER" variant="button" />
                </div>
              )}

              {/* Wishlist + Share */}
              <div className="flex gap-3 mb-6 flex-wrap">
                <button onClick={() => toggleWishlist({ id: p.id, name: p.name, slug: p.slug, image: p.images?.[0], price: productPrice })}
                  className={`flex items-center gap-2 text-sm transition-colors ${inWishlist(p.id) ? 'text-red-500' : 'text-slate-600 hover:text-red-500'}`}>
                  <Heart className={`w-4 h-4 ${inWishlist(p.id) ? 'fill-red-500' : ''}`} />
                  {inWishlist(p.id) ? 'Wishlisted' : 'Wishlist'}
                </button>
                <button onClick={() => share(p.name, p.slug)}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition-colors">
                  {copied
                    ? <><Check className="w-4 h-4 text-green-500" /><span className="text-green-600">Copied!</span></>
                    : <><Share2 className="w-4 h-4" />Share</>}
                </button>
                <a href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Open link
                </a>
              </div>

              {/* Trust badges */}
              <div className="border-t pt-4 grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-5 h-5 text-sky-600" />
                  <span className="text-xs text-slate-600">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Shield className="w-5 h-5 text-sky-600" />
                  <span className="text-xs text-slate-600">Secure Payment</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RefreshCw className="w-5 h-5 text-sky-600" />
                  <span className="text-xs text-slate-600">Easy Returns</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t">
            <div className="flex border-b px-6">
              {(['description', 'reviews', 'specs'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
                    activeTab === tab ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}>{tab}</button>
              ))}
            </div>
            <div className="p-6">
              {activeTab === 'description' && (
                <div className="prose max-w-none text-slate-700 text-sm leading-relaxed">
                  {p.description || 'No description available.'}
                </div>
              )}
              {activeTab === 'reviews' && (() => {
                const reviewList: any[] = Array.isArray(reviews) ? reviews as any[] : (reviews as any)?.data ?? [];
                return (
                  <div className="space-y-4">
                    {reviewList.length === 0 ? (
                      <p className="text-slate-500 text-sm">No reviews yet. Be the first to review!</p>
                    ) : reviewList.map((review: any) => (
                      <div key={review.id} className="border-b pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                            <span className="text-sky-600 text-sm font-bold">{review.user?.name?.[0] || 'U'}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{review.user?.name || 'Anonymous'}</p>
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                        </div>
                        <p className="text-sm text-slate-700">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {activeTab === 'specs' && (
                <div className="text-sm text-slate-700 space-y-2">
                  <p>Brand: <strong>{p.brand || 'N/A'}</strong></p>
                  <p>SKU: <strong>{p.sku || 'N/A'}</strong></p>
                  <p>Stock: <strong>{p.stock || 0} units</strong></p>
                  {storeCategory && storeCategory !== 'GENERAL' && (
                    <p className="flex items-center gap-1.5">Store type: <StoreCategoryBadge category={storeCategory} /></p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mid-page ad banner */}
        <AdBanner placement="product_detail_mid" variant="full" className="h-28 mb-6" />

        {/* Frequently Bought Together */}
        {boughtTogether.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Frequently Bought Together</h2>
            <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-sm overflow-x-auto">
              {/* Current product thumb */}
              <div className="flex flex-col items-center gap-2 shrink-0 w-32">
                <div className="w-28 h-28 bg-slate-100 rounded-xl overflow-hidden relative border-2 border-sky-500">
                  {images[0] && <Image src={images[0]} alt={p.name} fill className="object-contain p-2" />}
                </div>
                <p className="text-xs text-center font-medium line-clamp-2">{p.name}</p>
                <p className="text-xs font-bold text-sky-600">UGX {productPrice.toLocaleString()}</p>
              </div>
              {boughtTogether.map((bp: any) => {
                const bpPrice = Number(bp.basePrice ?? bp.price ?? 0);
                return (
                  <div key={bp.id} className="flex items-start gap-2 shrink-0">
                    <div className="flex flex-col items-center justify-center h-32">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-32">
                      <Link href={`/products/${bp.slug}`} className="w-28 h-28 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 group">
                        {bp.images?.[0] && <Image src={bp.images[0]} alt={bp.name} fill className="object-contain p-2 group-hover:scale-105 transition" />}
                      </Link>
                      <p className="text-xs text-center font-medium line-clamp-2">{bp.name}</p>
                      <p className="text-xs font-bold text-sky-600">UGX {bpPrice.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
              <div className="ml-auto flex flex-col items-center justify-center gap-3 shrink-0 pl-6 border-l self-center">
                <p className="text-sm text-slate-500">Bundle total</p>
                <p className="text-xl font-bold text-sky-600">
                  UGX {(productPrice + boughtTogether.reduce((s: number, bp: any) => s + Number(bp.basePrice ?? bp.price ?? 0), 0)).toLocaleString()}
                </p>
                <button onClick={() => {
                    if (!user) { router.push('/auth/login'); return; }
                    const ids = [p.id, ...boughtTogether.map((bp: any) => bp.id)];
                    Promise.all(ids.map((id) => cartApi.addItem({ productId: id, quantity: 1 })))
                      .then(() => { queryClient.invalidateQueries({ queryKey: ['cart'] }); toast.success('All items added to cart'); })
                      .catch(() => toast.error('Some items could not be added'));
                  }}
                  className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap">
                  Add all to cart
                </button>
              </div>
            </div>
          </section>
        )}

        {/* You Might Also Like */}
        {relatedProducts.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900">You Might Also Like</h2>
              {p.category?.slug && (
                <Link href={`/category/${p.category.slug}`} className="text-sm text-sky-600 hover:underline flex items-center gap-1">
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {relatedProducts.map((rp: any) => (
                <ProductCard key={rp.id} product={rp} size="sm" />
              ))}
            </div>
          </section>
        )}

        {/* Bottom ad */}
        <AdBanner placement="product_detail_bottom" variant="inline" className="mb-6" />
      </div>
    </div>
  );
}

import axios from 'axios';
import toast from 'react-hot-toast';
import { getRuntimeApiBaseUrl, getRuntimeConfig, refreshRuntimeConfig } from './runtime-config';

const api = axios.create({ baseURL: getRuntimeApiBaseUrl() });

// M3b.5: Detect the backend's structured `402 PLAN_LIMIT` response from
// ProductsService.create() (and any future plan-gated endpoint) and surface a
// helpful upgrade toast with a CTA. The original 402 still rejects so caller
// `onError` handlers can render inline errors too — this just guarantees a
// useful global toast even if a mutation forgets to handle errors.
let _lastPlanLimitToastAt = 0;
function maybeShowPlanLimitToast(data: any) {
  if (!data || data.code !== 'PLAN_LIMIT') return;
  // De-dupe: a single product-create click shouldn't fire 5 toasts.
  const now = Date.now();
  if (now - _lastPlanLimitToastAt < 1500) return;
  _lastPlanLimitToastAt = now;

  const planName = data.planName ?? 'your plan';
  const limit = data.limit ?? '—';
  const used = data.used ?? '—';
  const upgradeUrl = typeof data.upgradeUrl === 'string' ? data.upgradeUrl : '/subscription';

  toast.error(
    (t) => (
      // Inline element factory — react-hot-toast accepts a function returning JSX.
      // Note: this file is .ts, so we use createElement rather than JSX.
      require('react').createElement(
        'div',
        { className: 'flex items-center gap-3' },
        require('react').createElement(
          'div',
          null,
          require('react').createElement('div', { className: 'font-semibold' }, 'Plan limit reached'),
          require('react').createElement(
            'div',
            { className: 'text-xs opacity-80' },
            `${planName} allows ${limit} products (you have ${used}).`,
          ),
        ),
        require('react').createElement(
          'button',
          {
            className: 'ml-2 px-3 py-1.5 rounded-md bg-white text-red-600 text-xs font-semibold border border-red-200 hover:bg-red-50',
            onClick: () => {
              toast.dismiss(t.id);
              if (typeof window !== 'undefined') window.location.assign(upgradeUrl);
            },
          },
          'Upgrade',
        ),
      )
    ),
    { duration: 7000 },
  );
}

api.interceptors.request.use((config) => {
  config.baseURL = getRuntimeApiBaseUrl();
  const token = typeof window !== 'undefined' ? localStorage.getItem('sellerToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r.data,
  async (err) => {
    const original = err.config as any;
    const status = err.response?.status;
    const isGatewayFailure = status === 502 || status === 503 || status === 504;
    const isNetworkFailure = err.code === 'ECONNABORTED' || !err.response;
    if ((isGatewayFailure || isNetworkFailure) && !original?._retryFailover) {
      const backup = getRuntimeConfig().apiBackupUrl;
      if (backup && original?.baseURL !== backup) {
        original._retryFailover = true;
        original.baseURL = backup;
        return api(original);
      }
    }

    // M3b.5: Surface the structured PLAN_LIMIT toast before falling through to
    // caller error handlers. Reject still propagates so onError can render inline.
    if (status === 402) maybeShowPlanLimitToast(err.response?.data);

    if (err.response?.status === 401 && original && !original._retryAuth) {
      original._retryAuth = true;
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('sellerRefreshToken') : null;
      if (refreshToken) {
        try {
          const runtime = await refreshRuntimeConfig();
          const { data } = await axios.post(`${runtime.apiBaseUrl}/auth/refresh`, { refreshToken });
          if (typeof window !== 'undefined') {
            if (data?.accessToken) localStorage.setItem('sellerToken', data.accessToken);
            if (data?.refreshToken) localStorage.setItem('sellerRefreshToken', data.refreshToken);
          }
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          // fall through to logout redirect
        }
      }
    }

    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerRefreshToken');
      // window.location does NOT know about basePath, so include it here
      window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/login`;
    }
    return Promise.reject(err);
  }
);

export const sellerApi = {
  // Auth
  login: (data: any) => api.post('/auth/login', data),
  googleSignIn: (credential: string) => api.post('/auth/google-signin', { credential, role: 'SELLER' }),
  // Profile
  getProfile: () => api.get('/sellers/me'),
  updateProfile: (data: any) => api.patch('/sellers/me', data),
  onboard: (data: any) => api.post('/sellers/onboard', data),
  getDashboard: () => api.get('/sellers/me/dashboard'),
  // Account (user record)
  getAccountInfo: () => api.get('/users/me'),
  updateAccountInfo: (data: any) => api.patch('/users/me', data),
  // Products
  getProducts: (page = 1, status?: string) => api.get('/products/mine', { params: { page, limit: 20, status } }),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.patch(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  generateProductDescription: (data: { name: string; brand?: string; category?: string; tags?: string[]; condition?: string }) =>
    api.post('/products/ai-description', data),
  // Orders
  getOrders: (page = 1, status?: string) =>
    api.get('/sellers/me/orders', { params: { page, limit: 20, status } }),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  updateOrderStatus: (orderId: string, status: string, note?: string) =>
    api.patch(`/orders/${orderId}/status`, { status, note }),
  // Finance
  getEarnings: () => api.get('/sellers/me/earnings'),
  requestPayout: (amount: number, method: string, accountNumber: string) =>
    api.post('/sellers/me/payout-request', { amount, method, accountNumber }),
  // Reviews
  getProductReviews: (productId: string, page = 1) =>
    api.get(`/reviews/products/${productId}`, { params: { page, limit: 10 } }),
  // Coupons (validate)
  validateCoupon: (code: string, total: number) =>
    api.get('/coupons/validate', { params: { code, total } }),
  // Upload
  uploadSingle: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadImages: (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return api.post('/upload/multiple', form, { headers: { 'Content-Type': 'multipart/form-data' } }) as Promise<string[]>;
  },
  deleteUpload: (filename: string) => api.delete('/upload/file', { params: { filename } }),
  // Categories
  getCategories: () => api.get('/categories'),
  // Reels
  getMyReels: (page = 1) => api.get('/reels', { params: { page, limit: 20 } }),
  createReel: (data: any) => api.post('/reels', data),
  updateReel: (id: string, data: any) => api.patch(`/reels/${id}`, data),
  deleteReel: (id: string) => api.delete(`/reels/${id}`),
  // Live Streams
  getMyLiveStreams: (page = 1) => api.get('/live-streams', { params: { page, limit: 20 } }),
  createLiveStream: (data: any) => api.post('/live-streams', data),
  updateLiveStream: (id: string, data: any) => api.patch(`/live-streams/${id}`, data),
  startLiveStream: (id: string) => api.patch(`/live-streams/${id}/start`),
  endLiveStream: (id: string) => api.patch(`/live-streams/${id}/end`),
  deleteLiveStream: (id: string) => api.delete(`/live-streams/${id}`),
  // Support (buyer raised tickets for seller's orders)
  getSupportTickets: (page = 1) => api.get('/support/tickets', { params: { page, limit: 15 } }),
  getSupportTicket: (id: string) => api.get(`/support/tickets/${id}`),
  replySupportTicket: (id: string, message: string) => api.post(`/support/tickets/${id}/reply`, { message }),
  // Chat
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (conversationId: string, page = 1) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params: { page, limit: 50 } }),
  sendMessage: (conversationId: string, body: string, type = 'TEXT', mediaUrl?: string) =>
    api.post(`/chat/conversations/${conversationId}/messages`, { body, type, mediaUrl }),
  markConversationRead: (conversationId: string) =>
    api.patch(`/chat/conversations/${conversationId}/read`),
  getUnreadMessages: () => api.get('/chat/unread'),
  // Notifications
  getNotifications: (page = 1) => api.get('/sellers/me/notifications', { params: { page, limit: 15 } }),
  getUnreadCount: () => api.get('/sellers/me/notifications/unread-count'),
  markNotifRead: (id: string) => api.patch(`/sellers/me/notifications/${id}/read`, {}),
  markAllNotifsRead: () => api.post('/sellers/me/notifications/mark-all-read', {}),
  // Newsletter
  subscribeNewsletter: (email: string, name?: string) =>
    api.post('/newsletter/subscribe', { email, name, source: 'seller_portal' }),
  // Wallet
  getWalletBalance: () => api.get('/wallet/seller/balance'),
  getWalletTransactions: (page = 1, limit = 20) =>
    api.get('/wallet/seller/transactions', { params: { page, limit } }),
  requestWithdrawal: (amount: number, method: string, phone?: string) =>
    api.post('/wallet/seller/withdraw', { amount, method, phone }),
  // Subscriptions
  getSubscriptionPlans: () => api.get('/subscriptions/plans'),
  getMySubscription: () => api.get('/subscriptions/my'),
  getSubscriptionHistory: () => api.get('/subscriptions/history'),
  subscribeToPlan: (planId: string) => api.post('/subscriptions/subscribe', { planId }),
  /** Fetches the PDF receipt as a Blob; caller is responsible for triggering download. */
  downloadSubscriptionReceipt: (id: string) =>
    api.get(`/subscriptions/${id}/receipt.pdf`, { responseType: 'blob' }) as unknown as Promise<Blob>,
  // Delivery tracking
  getOrderTracking: (orderId: string) => api.get(`/delivery/orders/${orderId}/tracking`),
};

export default api;

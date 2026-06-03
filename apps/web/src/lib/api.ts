import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
// Falls back to the Zustand persisted store when access_token key is absent
// (e.g. after a hard reload when only the Zustand persist entry survived).
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('access_token');
    if (!token) {
      try {
        const persisted = JSON.parse(localStorage.getItem('totalstore-auth') ?? '{}');
        token = persisted?.state?.token ?? null;
        if (token) localStorage.setItem('access_token', token);
      } catch {}
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 / token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      // Only attempt refresh / redirect if user was previously authenticated
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refreshToken },
          );
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          // Refresh failed — session expired, redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth/login';
          return new Promise(() => {});
        }
      }
      // No refresh token — user was never logged in, just reject so UI handles it
    }
    return Promise.reject(error);
  },
);

export default api;

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  googleSignIn: (credential: string) => api.post('/auth/google-signin', { credential }),
  sendOtp: (phone: string) => api.post('/auth/login/otp/send', { phone }),
  verifyOtp: (phone: string, code: string) => api.post('/auth/login/otp/verify', { phone, code }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params?: any) => api.get('/products', { params }),
  get: (slug: string) => api.get(`/products/${slug}`),
  getBySlug: (slug: string) => api.get(`/products/${slug}`),
  featured: () => api.get('/products/featured'),
  autocomplete: (q: string) => api.get('/products/autocomplete', { params: { q } }),
  related: (slug: string, limit = 8) => api.get(`/products/${slug}/related`, { params: { limit } }),
  boughtTogether: (slug: string) => api.get(`/products/${slug}/bought-together`),
};

// ── Categories ────────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: () => api.get('/categories'),
  get: (slug: string) => api.get(`/categories/${slug}`),
};

// ── Cart ──────────────────────────────────────────────────────────────────────
export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (data: any) => api.post('/cart/items', data),
  updateItem: (itemId: string, quantity: number) => api.patch(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete('/cart/clear'),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  create: (data: any) => api.post('/orders', data),
  list: (params?: any) => api.get('/orders', { params }),
  getBuyerOrders: (page = 1, limit = 20) => api.get('/orders', { params: { page, limit } }),
  get: (id: string) => api.get(`/orders/${id}`),
  cancel: (id: string, reason: string) => api.patch(`/orders/${id}/cancel`, { reason }),
  trackOrder: (orderNumber: string) => api.get(`/orders/track-by-number/${orderNumber}`),
  returnRequest: (orderId: string, data: any) => api.post(`/orders/${orderId}/returns`, data),  downloadReceipt: (id: string) => api.get(`/orders/${id}/receipt`, { responseType: 'blob' }),};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  initiate: (data: { orderId: string; method: string; phone?: string; email?: string }) =>
    api.post(`/payments/orders/${data.orderId}/initiate`, { method: data.method, phone: data.phone, email: data.email }),
  confirm: (orderId: string) => api.get(`/payments/orders/${orderId}/confirm`),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsApi = {
  list: (productId: string) => api.get(`/reviews/products/${productId}`),
  getProductReviews: (productId: string, page = 1, limit = 10) =>
    api.get(`/reviews/products/${productId}`, { params: { page, limit } }),
  create: (productId: string, data: any) => api.post(`/reviews/products/${productId}`, data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  profile: () => api.get('/users/me'),
  update: (data: any) => api.patch('/users/me', data),
};

// ── Addresses ─────────────────────────────────────────────────────────────────
export const addressesApi = {
  list: () => api.get('/users/me/addresses'),
  create: (data: any) => api.post('/users/me/addresses', data),
  update: (id: string, data: any) => api.patch(`/users/me/addresses/${id}`, data),
  setDefault: (id: string) => api.patch(`/users/me/addresses/${id}/default`),
  delete: (id: string) => api.delete(`/users/me/addresses/${id}`),
};

// ── Upload ─────────────────────────────────────────────────────────────────────
export const uploadApi = {
  single: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/single', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Banners ───────────────────────────────────────────────────────────────────
export const bannersApi = {
  list: (placement?: string) => api.get('/settings/banners', { params: placement ? { placement } : {} }),
  getHeroSlides: () => api.get('/settings/banners/hero'),
  getMidBanners: (placement = 'home_middle') => api.get('/settings/banners', { params: { placement } }),
  getSingleBanner: () => api.get('/settings/banners', { params: { placement: 'home_single' } }),
};

export const brandsApi = {
  list: () => api.get('/settings/brands'),
};

export const homeBlocksApi = {
  list: (placement?: string) => api.get('/settings/home-blocks', { params: placement ? { placement } : {} }),
};

// ── Flash Sales ───────────────────────────────────────────────────────────────
export const flashSalesApi = {
  active: () => api.get('/flash-sales/active'),
};

// ── Sellers / Shops ───────────────────────────────────────────────────────────
// (also exported as shopsApi for legacy usage)
export const shopsApi = {
  list: (params?: { page?: number; limit?: number; storeCategory?: string }) =>
    api.get('/settings/shops', { params: { page: 1, limit: 20, ...params } }),
  topRated: () => api.get('/settings/shops', { params: { page: 1, limit: 8, sort: 'rating' } }),
  byCategory: (storeCategory: string) =>
    api.get('/settings/shops', { params: { page: 1, limit: 20, storeCategory } }),
  bySlug: (slug: string) => api.get(`/settings/shops/${slug}`),
};
export const sellersApi = shopsApi;


// ── Blog ─────────────────────────────────────────────────────────────────────
export const blogApi = {
  list: (params?: { page?: number; limit?: number; category?: string; tag?: string }) =>
    api.get('/blog', { params }),
  get: (slug: string) => api.get(`/blog/post/${slug}`),
};

// ── Newsletter ────────────────────────────────────────────────────────────────
export const newsletterApi = {
  subscribe:       (email: string, name?: string) => api.post('/newsletter/subscribe', { email, name, source: 'website' }),
  unsubscribe:     (email: string)                => api.get('/newsletter/unsubscribe', { params: { email } }),
  listSubscribers: (params?: { page?: number; limit?: number; active?: boolean }) =>
    api.get('/newsletter/subscribers', { params }),
  listCampaigns:   ()                             => api.get('/newsletter/campaigns'),
  createCampaign:  (dto: { subject: string; body: string; preview?: string }) =>
    api.post('/newsletter/campaigns', dto),
  updateCampaign:  (id: string, dto: Partial<{ subject: string; body: string; preview: string }>) =>
    api.patch(`/newsletter/campaigns/${id}`, dto),
  sendCampaign:    (id: string)                   => api.post(`/newsletter/campaigns/${id}/send`),
};

// ── Chat / Messaging ──────────────────────────────────────────────────────────
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getUnreadCount: () => api.get('/chat/unread'),
  startConversation: (dto: {
    targetUserId: string;
    type: 'BUYER_SELLER' | 'BUYER_RIDER' | 'ADMIN_SUPPORT' | 'ORDER_GROUP';
    orderId?: string;
    subject?: string;
    initialMessage?: string;
  }) => api.post('/chat/conversations', dto),
  getMessages: (conversationId: string, page = 1) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params: { page, limit: 50 } }),
  sendMessage: (conversationId: string, body: string, type = 'TEXT', mediaUrl?: string) =>
    api.post(`/chat/conversations/${conversationId}/messages`, { body, type, mediaUrl }),
  markRead: (conversationId: string) =>
    api.patch(`/chat/conversations/${conversationId}/read`),
};

// ── Coupons ───────────────────────────────────────────────────────────────────
export const couponsApi = {
  validate: (code: string, total: number) =>
    api.get('/coupons/validate', { params: { code, total } }),
};

// ── Support Tickets ───────────────────────────────────────────────────────────
export const supportApi = {
  createTicket: (data: { subject: string; message: string; category?: string; orderId?: string }) =>
    api.post('/support/tickets', data),
  replyToTicket: (id: string, message: string, attachments?: string[]) =>
    api.post(`/support/tickets/${id}/reply`, { message, attachments }),
  getTickets: (page = 1) => api.get('/support/tickets', { params: { page, limit: 15 } }),
  getTicket: (id: string) => api.get(`/support/tickets/${id}`),
};

// ── Reels ─────────────────────────────────────────────────────────────────────
export const reelsApi = {
  list: (page = 1) => api.get('/reels', { params: { page, limit: 20 } }),
  get: (id: string) => api.get(`/reels/${id}`),
  like: (id: string) => api.patch(`/reels/${id}/like`),
};

// ── Live Streams ──────────────────────────────────────────────────────────────
export const liveStreamsApi = {
  list: (page = 1) => api.get('/live-streams', { params: { page, limit: 20 } }),
  get: (id: string) => api.get(`/live-streams/${id}`),
};

// ── Analytics (page-view tracking) ───────────────────────────────────────────
export const analyticsApi = {
  trackVisit: (data: { page: string; referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string }) =>
    api.post('/analytics/visit', data).catch(() => {}), // fire-and-forget, ignore errors
};

// ── Delivery / Tracking ───────────────────────────────────────────────────────
export const deliveryApi = {
  getDelivery: (orderId: string) => api.get(`/delivery/orders/${orderId}`),
};

// ── Riders ────────────────────────────────────────────────────────────────────
export const ridersApi = {
  register: (data: any) => api.post('/riders/register', data),
  getProfile: () => api.get('/riders/me'),
  setOnline: (isOnline: boolean) => api.patch('/riders/me/online', { isOnline }),
  getDeliveries: () => api.get('/riders/me/deliveries'),
  getEarnings: () => api.get('/riders/me/earnings'),
  updateDeliveryStatus: (deliveryId: string, data: any) =>
    api.patch(`/riders/deliveries/${deliveryId}/status`, data),
};
// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (page = 1, limit = 20) => api.get('/users/me/notifications', { params: { page, limit } }),
  markRead: (notifId: string) => api.patch(`/users/me/notifications/${notifId}/read`),
  markAllRead: () => api.patch('/users/me/notifications/read-all'),
};

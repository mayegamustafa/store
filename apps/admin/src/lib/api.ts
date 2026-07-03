import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({ baseURL: API_URL }) as any;

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r.data,
  (err) => {
    // Don't auto-redirect on the login endpoint itself
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && typeof window !== 'undefined' && !isLoginRequest) {
      localStorage.removeItem('adminToken');
      // window.location does NOT know about basePath, so include it here
      window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/login`;
    }
    return Promise.reject(err);
  }
);

export const adminApi = {
  login: (data: { email?: string; phone?: string; password: string }) =>
    api.post('/auth/login', data),
  getDashboard: () => api.get('/admin/dashboard'),
  getOrders: (page = 1, status?: string) =>
    api.get('/admin/orders', { params: { page, limit: 20, status } }),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  updateOrderStatus: (orderId: string, status: string) =>
    api.patch(`/orders/${orderId}/status`, { status }),
  getSellers: (page = 1, status?: string, search?: string) =>
    api.get('/sellers/all', { params: { page, limit: 20, status, search } }),
  approveSeller: (sellerId: string) => api.patch(`/sellers/${sellerId}/approve`),
  rejectSeller: (sellerId: string, reason: string) => api.patch(`/sellers/${sellerId}/reject`, { reason }),
  suspendSeller: (sellerId: string) => api.patch(`/sellers/${sellerId}/suspend`),
  unsuspendSeller: (sellerId: string) => api.patch(`/sellers/${sellerId}/unsuspend`),
  markSellerOfficial: (sellerId: string, isOfficial: boolean) =>
    api.patch(`/sellers/${sellerId}/mark-official`, { isOfficial }),

  getCoupons: (page = 1, search?: string) =>
    api.get('/coupons', { params: { page, limit: 20, search } }),
  createCoupon: (data: any) => api.post('/coupons', data),
  updateCoupon: (id: string, data: any) => api.patch(`/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/coupons/${id}`),
  toggleCoupon: (id: string, isActive: boolean) => api.patch(`/coupons/${id}`, { isActive }),
  getProducts: (page = 1, status?: string, search?: string) =>
    api.get('/products/admin-list', { params: { page, limit: 20, status, search } }),
  getProduct: (id: string) => api.get(`/products/admin/${id}`),  // fetch by UUID
  createProduct: (data: any) => api.post('/products/admin-create', data),
  updateProduct: (id: string, data: any) => api.patch(`/products/admin/${id}`, data),
  updateProductStock: (id: string, data: { stock?: number; addStock?: number; lowStockAlert?: number }) =>
    api.patch(`/products/admin/${id}/stock`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  approveProduct: (productId: string) => api.patch(`/products/${productId}/approve`),
  rejectProduct: (productId: string, reason?: string) => api.patch(`/products/${productId}/reject`, { reason }),
  generateProductDescription: (data: { name: string; brand?: string; category?: string; tags?: string[]; condition?: string }) =>
    api.post('/products/ai-description', data),
  getRiders: (page = 1, status?: string, search?: string) =>
    api.get('/riders/all', { params: { page, limit: 20, status, search } }),
  approveRider: (riderId: string) => api.patch(`/riders/${riderId}/approve`),
  rejectRider: (riderId: string, reason?: string) => api.patch(`/riders/${riderId}/reject`, { reason }),
  suspendRider: (riderId: string) => api.patch(`/riders/${riderId}/suspend`),
  unsuspendRider: (riderId: string) => api.patch(`/riders/${riderId}/unsuspend`),

  getUsers: (page = 1, search?: string, status?: string) =>
    api.get('/users/admin/list', { params: { page, limit: 20, search, status } }),
  suspendUser: (userId: string) => api.patch(`/users/admin/${userId}/suspend`),
  unsuspendUser: (userId: string) => api.patch(`/users/admin/${userId}/unsuspend`),
  deleteUser: (userId: string) => api.delete(`/users/admin/${userId}`),
  getBanners: () => api.get('/admin/banners'),
  createBanner: (data: any) => api.post('/admin/banners', data),
  updateBanner: (id: string, data: any) => api.patch(`/admin/banners/${id}`, data),
  deleteBanner: (id: string) => api.delete(`/admin/banners/${id}`),
  // Brands
  getBrands: () => api.get('/admin/brands'),
  createBrand: (data: any) => api.post('/admin/brands', data),
  updateBrand: (id: string, data: any) => api.patch(`/admin/brands/${id}`, data),
  deleteBrand: (id: string) => api.delete(`/admin/brands/${id}`),
  // Home Blocks
  getHomeBlocks: () => api.get('/admin/home-blocks'),
  createHomeBlock: (data: any) => api.post('/admin/home-blocks', data),
  updateHomeBlock: (id: string, data: any) => api.patch(`/admin/home-blocks/${id}`, data),
  deleteHomeBlock: (id: string) => api.delete(`/admin/home-blocks/${id}`),
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key: string, value: string) =>
    api.patch(`/admin/settings/${encodeURIComponent(key)}`, { value }),
  bulkUpdateSettings: (settings: { key: string; value: string }[]) =>
    api.put('/admin/settings/bulk', { settings }),
  getRevenueReport: (from: string, to: string) =>
    api.get('/admin/reports/revenue', { params: { from, to } }),
  getTopProducts: () => api.get('/admin/reports/top-products'),
  getCategories: () => api.get('/categories'),
  createCategory: (data: any) => api.post('/categories', data),
  updateCategory: (id: string, data: any) => api.patch(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),

  // Staff management
  getStaff: (page = 1, search?: string, role?: string) =>
    api.get('/admin/staff', { params: { page, limit: 20, search, role } }),
  createStaff: (data: any) => api.post('/admin/staff', data),
  updateStaff: (id: string, data: any) => api.patch(`/admin/staff/${id}`, data),
  suspendStaff: (id: string) => api.patch(`/admin/staff/${id}/suspend`),
  reactivateStaff: (id: string) => api.patch(`/admin/staff/${id}/reactivate`),
  deleteStaff: (id: string) => api.delete(`/admin/staff/${id}`),
  resetStaffPassword: (id: string, newPassword: string) =>
    api.post(`/admin/staff/${id}/reset-password`, { newPassword }),
  getStaffRoles: () => api.get('/admin/staff/roles'),

  // Notification templates & logs
  getNotificationTemplates: () => api.get('/admin/notifications/templates'),
  upsertNotificationTemplate: (data: any) => api.post('/admin/notifications/templates', data),
  updateNotificationTemplate: (id: string, data: any) => api.patch(`/admin/notifications/templates/${id}`, data),
  getNotificationLogs: (params?: { skip?: number; take?: number; channel?: string; event?: string }) =>
    api.get('/admin/notifications/logs', { params: { skip: params?.skip ?? 0, take: params?.take ?? 50, channel: params?.channel, event: params?.event } }),
  testSendSms: (data: { phone: string; message: string }) =>
    api.post('/admin/notifications/test/sms', data),
  testSendWhatsApp: (data: { phone: string; message: string }) =>
    api.post('/admin/notifications/test/whatsapp', data),
  testSendEmail: (data: { email: string; subject: string; body: string }) =>
    api.post('/admin/notifications/test/email', { to: data.email, subject: data.subject, body: data.body }),
  testSendPush: (data: { fcmToken: string; title: string; body: string }) =>
    api.post('/admin/notifications/test/push', data),
  broadcastNotification: (data: { target: 'ALL' | 'BUYERS' | 'RIDERS' | 'SELLERS'; title: string; body: string; data?: Record<string, string>; route?: string; imageUrl?: string }) =>
    api.post('/admin/notifications/broadcast', data),
  sendNotificationToUser: (data: { userId: string; title: string; body: string; channels: string[]; data?: Record<string, string>; route?: string; imageUrl?: string }) =>
    api.post('/admin/notifications/send-to-user', data),

  // Order tracking & delivery
  getOrderTrackingSnapshot: (orderId: string) =>
    api.get(`/delivery/orders/${orderId}`),
  getActiveDeliveries: () => api.get('/admin/orders', { params: { status: 'OUT_FOR_DELIVERY', limit: 100 } }),
  assignRiderToOrder: (orderId: string, riderId: string) =>
    api.post(`/delivery/orders/${orderId}/assign`, { riderId }),
  getApprovedRiders: () =>
    api.get('/riders/all', { params: { status: 'APPROVED', limit: 200 } }),
  downloadReceipt: (orderId: string) =>
    api.get(`/orders/${orderId}/receipt`, { responseType: 'blob' }),
  createRider: (data: any) => api.post('/riders/admin-create', data),

  // ── File uploads ──────────────────────────────────────────────────────────
  uploadSingle: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadMultiple: (files: File[]) => {
    const fd = new FormData(); files.forEach((f) => fd.append('files', f));
    return api.post('/upload/multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteUpload: (filename: string) => api.delete('/upload/file', { params: { filename } }),

  // ── Reels ─────────────────────────────────────────────────────────────────
  getReels: (page = 1, search?: string) => api.get('/reels/admin/all', { params: { page, search } }),
  createReel: (data: any) => api.post('/reels', data),
  updateReel: (id: string, data: any) => api.patch(`/reels/${id}`, data),
  deleteReel: (id: string) => api.delete(`/reels/${id}`),

  // ── Live Streams ─────────────────────────────────────────────────────────
  getLiveStreams: (page = 1, status?: string, search?: string) => api.get('/live-streams/admin/all', { params: { page, status, search } }),
  createLiveStream: (data: any) => api.post('/live-streams', data),
  updateLiveStream: (id: string, data: any) => api.patch(`/live-streams/${id}`, data),
  startLiveStream: (id: string) => api.patch(`/live-streams/${id}/start`),
  endLiveStream: (id: string) => api.patch(`/live-streams/${id}/end`),
  deleteLiveStream: (id: string) => api.delete(`/live-streams/${id}`),

  // ── POS ───────────────────────────────────────────────────────────────────
  posOpenSession: (data: any) => api.post('/pos/sessions', data),
  posCloseSession: (id: string, data: any) => api.patch(`/pos/sessions/${id}/close`, data),
  posGetSession: (id: string) => api.get(`/pos/sessions/${id}`),
  posListSessions: (page = 1, status?: string) => api.get('/pos/sessions', { params: { page, status } }),
  posCreateTransaction: (sessionId: string, data: any) => api.post(`/pos/sessions/${sessionId}/transactions`, data),
  posListTransactions: (page = 1, sessionId?: string) => api.get('/pos/transactions', { params: { page, sessionId } }),
  posVoidTransaction: (id: string) => api.delete(`/pos/transactions/${id}/void`),
  posGetInventory: (page = 1, search?: string, lowStock?: boolean) => api.get('/pos/inventory', { params: { page, search, lowStock } }),
  posUpdateStock: (productId: string, stock: number) => api.patch(`/pos/inventory/${productId}/stock`, { stock }),
  posAdjustStock: (productId: string, delta: number, reason?: string) => api.patch(`/pos/inventory/${productId}/adjust`, { delta, reason }),

  // ── Support Inbox ────────────────────────────────────────────────────────
  getSupportTickets: (page = 1, status?: string, priority?: string, category?: string, search?: string) =>
    api.get('/support/tickets', { params: { page, status, priority, category, search } }),
  getSupportTicket: (id: string) => api.get(`/support/tickets/${id}`),
  getSupportStats: () => api.get('/support/stats'),
  supportStaffReply: (id: string, message: string, attachments?: string[]) =>
    api.post(`/support/tickets/${id}/staff-reply`, { message, attachments }),
  updateSupportTicket: (id: string, data: any) => api.patch(`/support/tickets/${id}`, data),

  // ── Blog ─────────────────────────────────────────────────────────────────
  getBlogPosts: (page = 1) => api.get('/blog/admin/list', { params: { page } }),
  createBlogPost: (data: any) => api.post('/blog/admin', data),
  updateBlogPost: (id: string, data: any) => api.patch(`/blog/admin/${id}`, data),
  deleteBlogPost: (id: string) => api.delete(`/blog/admin/${id}`),

  // ── Manual seller creation ─────────────────────────────────────────────────
  createSeller: (data: any) => api.post('/admin/sellers/create', data),

  // ── Admin notification inbox ───────────────────────────────────────────────
  getAdminInbox: (page = 1) => api.get('/admin/inbox', { params: { page, limit: 15 } }),
  getAdminUnreadCount: () => api.get('/admin/inbox/unread-count'),
  markAdminNotifRead: (id: string) => api.patch(`/admin/inbox/${id}/read`, {}),
  markAllAdminNotifsRead: () => api.post('/admin/inbox/mark-all-read', {}),

  // ── Newsletter & Email Campaigns ──────────────────────────────────────────
  getSubscribers:  (params?: { page?: number; limit?: number })         => api.get('/newsletter/subscribers', { params }),
  getCampaigns:    ()                                                     => api.get('/newsletter/campaigns'),
  createCampaign:  (dto: { subject: string; body: string; preview?: string }) => api.post('/newsletter/campaigns', dto),
  updateCampaign:  (id: string, dto: any)                                => api.patch(`/newsletter/campaigns/${id}`, dto),
  sendCampaign:    (id: string)                                          => api.post(`/newsletter/campaigns/${id}/send`),

  // Analytics / Audit Trail
  getAnalyticsStats:   ()                                                      => api.get('/analytics/stats'),
  getAnalyticsTrend:   (days = 7)                                              => api.get('/analytics/trend', { params: { days } }),
  getAnalyticsGeo:     ()                                                      => api.get('/analytics/geo'),
  getAnalyticsCities:  ()                                                      => api.get('/analytics/cities'),
  getAnalyticsDevices: ()                                                      => api.get('/analytics/devices'),
  getAnalyticsLogs:    (params?: { page?: number; limit?: number; search?: string }) => api.get('/analytics/logs', { params }),

  // ── Wallet Management ─────────────────────────────────────────────────────
  getWallet:     (targetId: string, ownerType: string)          => api.get('/wallet/admin/overview', { params: { targetId, ownerType } }),
  creditWallet:  (dto: { targetId: string; ownerType: string; amount: number; description: string }) => api.post('/wallet/admin/credit', dto),
  debitWallet:   (dto: { targetId: string; ownerType: string; amount: number; description: string }) => api.post('/wallet/admin/debit', dto),

  // ── Dynamic Settings System ───────────────────────────────────────────────
  getSettingsGrouped: () => api.get('/settings/admin/all'),
  updateSettingSingle: (key: string, value: string) => api.patch(`/settings/admin/${encodeURIComponent(key)}`, { value }),
  bulkUpdateDynamicSettings: (settings: { key: string; value: string }[]) => api.put('/settings/admin/bulk', { settings }),
  getSettingsAuditLogs: (page = 1, limit = 50) => api.get('/settings/admin/audit-logs', { params: { page, limit } }),

  // ── Payment Gateway Config ────────────────────────────────────────────────
  getPaymentGateways: () => api.get('/settings/admin/payment-gateways'),
  updatePaymentGateway: (provider: string, data: any) => api.put(`/settings/admin/payment-gateways/${provider}`, data),

  // ── Subscription Plans ────────────────────────────────────────────────────
  getSubscriptionPlans: () => api.get('/subscriptions/plans/all'),
  createSubscriptionPlan: (data: any) => api.post('/subscriptions/plans', data),
  updateSubscriptionPlan: (id: string, data: any) => api.patch(`/subscriptions/plans/${id}`, data),
  deleteSubscriptionPlan: (id: string) => api.delete(`/subscriptions/plans/${id}`),

  // ── Subscription subscribers (M3b.3) — distinct from newsletter getSubscribers above
  getSubscriptionSubscribers: (params: { status?: string; search?: string; page?: number; limit?: number } = {}) =>
    api.get('/subscriptions/admin/subscribers', { params }),
  getSubscriptionAuditLog: (id: string) => api.get(`/subscriptions/admin/${id}/audit`),
  extendSubscription: (id: string, data: { days: number; reason: string }) =>
    api.post(`/subscriptions/admin/${id}/extend`, data),
  cancelSubscription: (id: string, data: { reason: string }) =>
    api.post(`/subscriptions/admin/${id}/cancel`, data),

  // ── Delivery Tracking ─────────────────────────────────────────────────────
  getPendingDeliveries: () => api.get('/delivery/pending'),
  getOrderTracking: (orderId: string) => api.get(`/delivery/orders/${orderId}/tracking`),

  // ── Public App Config (mobile + web bootstrap payload) ────────────────────
  getPublicAppConfig: () => api.get('/config/public').then((r) => r.data),
  updatePublicAppConfig: (data: {
    apiBaseUrl?: string;
    apiBackupUrl?: string | null;
    buyerVersion?: string;
    sellerVersion?: string;
    riderVersion?: string;
  }) => api.patch('/config/update', data).then((r) => r.data),
};

export default api;

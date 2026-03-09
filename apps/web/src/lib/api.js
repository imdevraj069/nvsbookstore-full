// ═══════════════════════════════════════════
// Central API Client
// ═══════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ── Core fetch helper ──────────────────────

async function fetchAPI(endpoint, options = {}) {
  const { body, method = 'GET', isFormData = false, token } = options;

  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject JWT token
  const storedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('nvs_token') : null);
  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || `API Error: ${res.status}`);
  }
  return data;
}

// ═══════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════

export const authAPI = {
  signup: (data) => fetchAPI('/api/auth/signup', { method: 'POST', body: data }),
  login: (data) => fetchAPI('/api/auth/login', { method: 'POST', body: data }),
  googleLogin: (credential) => fetchAPI('/api/auth/google', { method: 'POST', body: { credential } }),
  getProfile: () => fetchAPI('/api/auth/me'),
  updateProfile: (data) => fetchAPI('/api/auth/profile', { method: 'PUT', body: data }),
  addAddress: (data) => fetchAPI('/api/auth/address', { method: 'POST', body: data }),
  toggleFavorite: (productId) => fetchAPI(`/api/auth/favorites/${productId}`, { method: 'POST' }),
  getFavorites: () => fetchAPI('/api/auth/favorites'),
};

// ═══════════════════════════════════════════
// PRODUCTS API (read-service)
// ═══════════════════════════════════════════

export const productsAPI = {
  getAll: () => fetchAPI('/api/products'),
  getFeatured: () => fetchAPI('/api/products/featured'),
  getBySlug: (slug) => fetchAPI(`/api/products/slug/${slug}`),
  getByTag: (tag) => fetchAPI(`/api/products/tag/${tag}`),
  search: (query) => fetchAPI(`/api/products/search?q=${encodeURIComponent(query)}`),
};

// ═══════════════════════════════════════════
// SETTINGS API (public — banners, etc.)
// ═══════════════════════════════════════════

export const settingsAPI = {
  getBanners: () => fetchAPI('/api/settings'),
};

// ═══════════════════════════════════════════
// NOTIFICATIONS API (read-service)
// ═══════════════════════════════════════════

export const notificationsAPI = {
  getAll: () => fetchAPI('/api/notifications'),
  getFeatured: () => fetchAPI('/api/notifications/featured'),
  getBySlug: (slug) => fetchAPI(`/api/notifications/slug/${slug}`),
  getByTag: (tag) => fetchAPI(`/api/notifications/tag/${tag}`),
  search: (query) => fetchAPI(`/api/notifications/search?q=${encodeURIComponent(query)}`),
};

// ═══════════════════════════════════════════
// TAGS API (read-service)
// ═══════════════════════════════════════════

export const tagsAPI = {
  getAll: () => fetchAPI('/api/tags'),
};

// ═══════════════════════════════════════════
// CART API (transaction-service, auth required)
// ═══════════════════════════════════════════

export const cartAPI = {
  get: () => fetchAPI('/api/cart'),
  addItem: (data) => fetchAPI('/api/cart/items', { method: 'POST', body: data }),
  updateItem: (itemId, data) => fetchAPI(`/api/cart/items/${itemId}`, { method: 'PUT', body: data }),
  removeItem: (itemId) => fetchAPI(`/api/cart/items/${itemId}`, { method: 'DELETE' }),
  clear: () => fetchAPI('/api/cart', { method: 'DELETE' }),
};

// ═══════════════════════════════════════════
// ORDERS API (transaction-service, auth required)
// ═══════════════════════════════════════════

export const ordersAPI = {
  createRazorpayOrder: (data) => fetchAPI('/api/orders/razorpay', { method: 'POST', body: data }),
  create: (data) => fetchAPI('/api/orders', { method: 'POST', body: data }),
  getMyOrders: () => fetchAPI('/api/orders/my'),
  getById: (id) => fetchAPI(`/api/orders/${id}`),
  getInvoiceUrl: (orderId) => `${API_BASE}/api/orders/${orderId}/invoice`,
};

// ═══════════════════════════════════════════
// ADMIN API (admin-service, admin auth required)
// ═══════════════════════════════════════════

export const adminAPI = {
  // Products
  getProducts: () => fetchAPI('/api/admin/products'),
  createProduct: (formData) => fetchAPI('/api/admin/products', { method: 'POST', body: formData, isFormData: true }),
  updateProduct: (id, formData) => fetchAPI(`/api/admin/products/${id}`, { method: 'PUT', body: formData, isFormData: true }),
  deleteProduct: (id) => fetchAPI(`/api/admin/products/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => fetchAPI('/api/admin/notifications'),
  createNotification: (formData) => fetchAPI('/api/admin/notifications', { method: 'POST', body: formData, isFormData: true }),
  updateNotification: (id, formData) => fetchAPI(`/api/admin/notifications/${id}`, { method: 'PUT', body: formData, isFormData: true }),
  deleteNotification: (id) => fetchAPI(`/api/admin/notifications/${id}`, { method: 'DELETE' }),

  // Tags
  getTags: () => fetchAPI('/api/admin/tags'),
  createTag: (data) => fetchAPI('/api/admin/tags', { method: 'POST', body: data }),
  updateTag: (id, data) => fetchAPI(`/api/admin/tags/${id}`, { method: 'PUT', body: data }),
  deleteTag: (id) => fetchAPI(`/api/admin/tags/${id}`, { method: 'DELETE' }),

  // Orders (routed to transaction-service via /api/orders)
  getOrders: () => fetchAPI('/api/orders'),
  updateOrderStatus: (id, status) => fetchAPI(`/api/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  updateOrderTracking: (id, trackingNumber) => fetchAPI(`/api/orders/${id}/tracking`, { method: 'PATCH', body: { trackingNumber } }),

  // Images (server storage — ~/storage/images)
  getServerImages: () => fetchAPI('/api/admin/images'),
  uploadServerImage: (formData) => fetchAPI('/api/admin/images/upload', { method: 'POST', body: formData, isFormData: true }),
  deleteServerImage: (fileName) => fetchAPI(`/api/admin/images/${encodeURIComponent(fileName)}`, { method: 'DELETE' }),

  // Documents (server storage — ~/storage/documents)
  getServerDocuments: () => fetchAPI('/api/admin/documents/list'),
  uploadServerDocument: (formData) => fetchAPI('/api/admin/documents/upload', { method: 'POST', body: formData, isFormData: true }),
  deleteServerDocument: (fileName) => fetchAPI(`/api/admin/documents/${encodeURIComponent(fileName)}`, { method: 'DELETE' }),

  // Settings (banners)
  getSettings: () => fetchAPI('/api/admin/settings'),
  updateBanners: (banners) => fetchAPI('/api/admin/settings/banners', { method: 'PUT', body: { banners } }),

  // Toggle fields (inline switches in list view)
  toggleProductField: (id, field) => fetchAPI(`/api/admin/products/${id}/toggle`, { method: 'PATCH', body: { field } }),
  toggleNotificationField: (id, field) => fetchAPI(`/api/admin/notifications/${id}/toggle`, { method: 'PATCH', body: { field } }),

  // Migration (temporary — uses unprotected endpoint for initial setup)
  migrate: () => fetchAPI('/api/migrate', { method: 'POST' }),
};

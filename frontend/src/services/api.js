import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
};

// ─── User ────────────────────────────────────────────────────
export const userAPI = {
  getProfile:    ()     => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  getUserById:   (id)   => api.get(`/users/${id}`),
};

// ─── Pets ────────────────────────────────────────────────────
export const petAPI = {
  addPet:       (data)   => api.post('/pets/add', data),
  getAllPets:    ()       => api.get('/pets'),
  getPetById:   (id)     => api.get(`/pets/${id}`),
  filterPets:   (params) => api.get('/pets/filter', { params }),
  getMyListings:()       => api.get('/pets/my-listings'),
  deletePet:    (id)     => api.delete(`/pets/${id}`),
};

// ─── Licenses ────────────────────────────────────────────────
export const licenseAPI = {
  addLicense:      (data)   => api.post('/licenses', data),
  getMyLicenses:   ()       => api.get('/licenses/my'),
  validateLicense: (number) => api.get(`/licenses/validate/${number}`),
};

// ─── Cart ────────────────────────────────────────────────────
export const cartAPI = {
  addToCart:     (petId)  => api.post('/cart/add', { petId }),
  getCart:       (buyerId)=> api.get(`/cart/${buyerId}`),
  removeFromCart:(itemId) => api.delete(`/cart/remove/${itemId}`),
  checkout:      ()       => api.post('/cart/checkout'),
};

// ─── Requests ────────────────────────────────────────────────
export const requestAPI = {
  submitRequest:   (data) => api.post('/requests/add', data),
  getBuyerRequests:(id)   => api.get(`/requests/buyer/${id}`),
  getSellerRequests:()    => api.get('/requests/seller'),
  approveRequest:  (id)   => api.put(`/requests/${id}/approve`),
  rejectRequest:   (id)   => api.put(`/requests/${id}/reject`),
  getRequest:      (id)   => api.get(`/requests/${id}`),
  clearRejectedRequests: () => api.delete('/requests/clear-rejected'),
};

// ─── Orders ──────────────────────────────────────────────────
export const orderAPI = {
  getSellerOrders: (id)  => api.get(`/orders/seller/${id}`),
  getBuyerOrders:  (id)  => api.get(`/orders/buyer/${id}`),
  completeOrder:   (id)  => api.put(`/orders/${id}/complete`),
  clearCompletedOrders: () => api.delete('/orders/clear-completed'),
  clearCompletedOrdersSeller: () => api.delete('/orders/clear-completed-seller'),
};

// ─── Payment ─────────────────────────────────────────────────
export const paymentAPI = {
  createCheckoutSession: (data) => api.post('/payment/create-checkout-session', data),
  confirmPayment: (sessionId) => api.get(`/payment/confirm?session_id=${sessionId}`),
};

// ─── Chat ────────────────────────────────────────────────────
export const chatAPI = {
  getHistory:  (requestId)        => api.get(`/chat/${requestId}/history`),
  sendMessage: (requestId, data)  => api.post(`/chat/${requestId}/send`, data),
};

export default api;

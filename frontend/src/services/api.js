import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (
      err.response?.status === 401 &&
      err.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const dashboardsApi = {
  list: () => api.get('/dashboards'),
  get: (id) => api.get(`/dashboards/${id}`),
  create: (data) => api.post('/dashboards', data),
  update: (id, data) => api.put(`/dashboards/${id}`, data),
  delete: (id) => api.delete(`/dashboards/${id}`),
  duplicate: (id) => api.post(`/dashboards/${id}/duplicate`),
  updateLayout: (id, layout) => api.put(`/dashboards/${id}/layout`, { layout }),
  addWidget: (dashId, data) => api.post(`/dashboards/${dashId}/widgets`, data),
  updateWidget: (dashId, widgetId, data) => api.put(`/dashboards/${dashId}/widgets/${widgetId}`, data),
  deleteWidget: (dashId, widgetId) => api.delete(`/dashboards/${dashId}/widgets/${widgetId}`),
};

export const queryApi = {
  execute: (payload) => api.post('/query', payload),
  schema: () => api.get('/query/schema'),
  filterValues: (source, field) => api.get(`/query/filter-values/${source}/${field}`),
};

export const reportsApi = {
  list: () => api.get('/reports'),
  get: (id) => api.get(`/reports/${id}`),
  create: (data) => api.post('/reports', data),
  update: (id, data) => api.put(`/reports/${id}`, data),
  delete: (id) => api.delete(`/reports/${id}`),
  duplicate: (id) => api.post(`/reports/${id}/duplicate`),
  run: (id) => api.post(`/reports/${id}/run`),
  export: (id) => api.get(`/reports/${id}/export`, { responseType: 'blob' }),
};

export const ordersApi = {
  list: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
};

export const customersApi = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
};

export const productsApi = {
  list: (params) => api.get('/products', { params }),
  categories: () => api.get('/products/categories'),
};

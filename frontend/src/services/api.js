import axios from 'axios';

const apiInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

apiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const api = {
  auth: {
    login: (email, password) => apiInstance.post('/api/auth/login', { email, password }),
    register: (data) => apiInstance.post('/api/auth/register', data),
    getMe: () => apiInstance.get('/api/auth/me'),
  },
  workflows: {
    getStages: () => apiInstance.get('/api/workflows'),
    createStage: (data) => apiInstance.post('/api/workflows', data),
    updateStage: (id, data) => apiInstance.put(`/api/workflows/${id}`, data),
    deleteStage: (id) => apiInstance.delete(`/api/workflows/${id}`),
    reorderStages: (data) => apiInstance.post('/api/workflows/reorder', data),
  },
  events: {
    simulate: (data) => apiInstance.post('/api/events/simulate', data),
    getSummary: () => apiInstance.get('/api/events/summary'),
    clearEvents: () => apiInstance.delete('/api/events/clear'),
  },
  analytics: {
    getKPIs: () => apiInstance.get('/api/analytics/kpis'),
    getFunnel: () => apiInstance.get('/api/analytics/funnel'),
    getDropoff: () => apiInstance.get('/api/analytics/dropoff'),
    getTrend: () => apiInstance.get('/api/analytics/trend'),
    getConsent: () => apiInstance.get('/api/analytics/consent'),
    getComparison: () => apiInstance.get('/api/analytics/comparison'),
  },
  privacy: {
    getSettings: () => apiInstance.get('/api/privacy'),
    updateSettings: (data) => apiInstance.put('/api/privacy', data),
    getBudget: () => apiInstance.get('/api/privacy/budget'),
    resetBudget: () => apiInstance.post('/api/privacy/reset-budget'),
  },
  experiments: {
    list: () => apiInstance.get('/api/experiments'),
    create: (data) => apiInstance.post('/api/experiments', data),
    getById: (id) => apiInstance.get(`/api/experiments/${id}`),
  },
  reports: {
    downloadCSV: () => apiInstance.get('/api/reports/csv', { responseType: 'blob' }),
    downloadPDF: () => apiInstance.get('/api/reports/pdf', { responseType: 'blob' }),
  },
  feedback: {
    submit: (data) => apiInstance.post('/api/feedback', data),
    list: () => apiInstance.get('/api/feedback'),
  },
  tenants: {
    getById: (id) => apiInstance.get(`/api/tenants/${id}`),
    update: (id, data) => apiInstance.put(`/api/tenants/${id}`, data),
    getUsers: (id) => apiInstance.get(`/api/tenants/${id}/users`),
  }
};

export default api;

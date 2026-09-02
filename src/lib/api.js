export const API_URL = (import.meta.env.VITE_API_BASE || 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data = null) { super(message); this.name = 'ApiError'; this.status = status; this.data = data; }
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) return response.json();
  const text = await response.text();
  return text ? { message: text } : null;
}

async function request(path, options = {}, authenticated = true) {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await parseResponse(response);
  if (!response.ok) {
    const fallback = response.status === 401 ? 'Your session has expired.' : response.status === 409 ? 'This expense changed after you opened it.' : 'Something went wrong. Please try again.';
    if (response.status === 401 && authenticated) window.dispatchEvent(new CustomEvent('app:unauthorized'));
    throw new ApiError(data?.message || data?.error || fallback, response.status, data);
  }
  return data;
}

export async function exchangeMagicLink(token) {
  if (!token) throw new ApiError('Magic-link token is missing.', 400);
  return request('/api/web/auth/magic-link', { method: 'POST', body: JSON.stringify({ token }) }, false);
}

export const getSession = () => request('/api/web/auth/session', {}, false);
export const requestLoginLink = (phoneNumber) => request('/api/web/auth/login-link', { method: 'POST', body: JSON.stringify({ phoneNumber }) }, false);
export const logout = () => request('/api/web/auth/logout', { method: 'POST' }, false);

export const getExpenseCalendar = (month) => request(`/api/web/expenses/calendar?month=${encodeURIComponent(month)}`);
export const getRecentExpenses = (month, limit = 10) => request(`/api/web/expenses?month=${encodeURIComponent(month)}&limit=${encodeURIComponent(limit)}`);
export const getMoneyStories = (month) => request(`/api/v2/web/expenses/monthly?month=${encodeURIComponent(month)}`);
export const createMissingDateContext = (date, timezone) => request('/api/web/expenses/calendar/context', { method: 'POST', body: JSON.stringify({ type: 'MISSING_TRANSACTION_DATE', date, timezone }) });
export const getExpensesForDate = (month, date, limit = 50) => request(`/api/web/expenses?month=${encodeURIComponent(month)}&date=${encodeURIComponent(date)}&limit=${encodeURIComponent(limit)}`);
export const updateExpense = (id, changes) => request(`/api/web/expenses/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const deleteExpense = (id) => request(`/api/web/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const createExpenseWhatsAppContext = (id, version) => request(`/api/web/expenses/${encodeURIComponent(id)}/whatsapp-context`, { method: 'POST', body: JSON.stringify({ type: 'EDIT_TRANSACTION', version }) });

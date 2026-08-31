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

export const getDashboardSummary = (month) => request(`/api/web/dashboard/summary?month=${encodeURIComponent(month)}`);
export const getMonthlyInsights = (month) => request(`/api/web/expenses/monthly?month=${encodeURIComponent(month)}`);
export const getExpenseTaxonomy = () => request('/api/web/expense-taxonomy');

export function getExpenses(filters, beforeId, limit = 20) {
  const normalizedFilters = typeof filters === 'string' ? { month: filters } : filters;
  const params = new URLSearchParams({ month: normalizedFilters.month, limit: String(limit) });
  if (normalizedFilters.category) params.set('category', normalizedFilters.category);
  if (normalizedFilters.subcategory) params.set('subcategory', normalizedFilters.subcategory);
  if (normalizedFilters.tagIds?.length) {
    params.set('tagIds', [...new Set(normalizedFilters.tagIds)].join(','));
    params.set('tagMatch', normalizedFilters.tagMatch === 'all' ? 'all' : 'any');
  }
  if (beforeId !== null && beforeId !== undefined) params.set('beforeId', String(beforeId));
  return request(`/api/web/expenses?${params}`);
}

export const getTags = () => request('/api/web/tags');
export const createTag = (name) => request('/api/web/tags', { method: 'POST', body: JSON.stringify({ name }) });
export const updateClassification = (id, changes) => {
  const body = { version: changes.version, tagIds: changes.tagIds || [] };
  if (changes.category !== undefined) body.category = changes.category;
  if (changes.subcategory !== undefined) body.subcategory = changes.subcategory;
  return request(`/api/web/expenses/${encodeURIComponent(id)}/classification`, { method: 'PATCH', body: JSON.stringify(body) });
};
export const deleteExpense = (id, version) => request(`/api/web/expenses/${encodeURIComponent(id)}?version=${encodeURIComponent(version)}`, { method: 'DELETE' });

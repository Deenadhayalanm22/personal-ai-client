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

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await parseResponse(response);
  if (!response.ok) {
    const fallback = response.status === 401 ? 'Your session has expired.' : response.status === 409 ? 'This expense changed after you opened it.' : 'Something went wrong. Please try again.';
    throw new ApiError(data?.message || data?.error || fallback, response.status, data);
  }
  return data;
}

export async function exchangeMagicLink(token) {
  if (!token) throw new ApiError('Magic-link token is missing.', 400);
  try { return await request('/api/web/auth/magic-link', { method: 'POST', body: JSON.stringify({ token }) }); }
  finally { window.history.replaceState({}, '', window.location.pathname); }
}

export const getDashboard = (month) => request(`/api/web/dashboard?month=${encodeURIComponent(month)}`);

export function getExpenses(month, beforeId, limit = 20) {
  const params = new URLSearchParams({ month, limit: String(limit) });
  if (beforeId !== null && beforeId !== undefined) params.set('beforeId', String(beforeId));
  return request(`/api/web/expenses?${params}`);
}

export const updateClassification = (id, category, subcategory, version) => request(`/api/web/expenses/${encodeURIComponent(id)}/classification`, { method: 'PATCH', body: JSON.stringify({ category, subcategory, version }) });
export const deleteExpense = (id, version) => request(`/api/web/expenses/${encodeURIComponent(id)}?version=${encodeURIComponent(version)}`, { method: 'DELETE' });

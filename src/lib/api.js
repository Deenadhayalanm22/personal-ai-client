export const API_URL = (import.meta.env.VITE_API_BASE || 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
  });

  if (response.status === 401) {
    throw new ApiError('Your session has expired. Request a new WhatsApp link.', 401);
  }
  if (!response.ok) {
    throw new ApiError('Unable to load expenses.', response.status);
  }
  return response.json();
}

export async function exchangeMagicLink(token) {
  if (!token) throw new ApiError('Magic-link token is missing.');

  const response = await fetch(`${API_URL}/api/web/auth/magic-link`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  // Never leave a single-use credential in browser history or the address bar.
  window.history.replaceState({}, '', window.location.pathname);

  if (response.status === 401) {
    throw new ApiError('This link is invalid, expired, or already used.', 401);
  }
  if (!response.ok) {
    throw new ApiError('Unable to authenticate.', response.status);
  }
  return response.json();
}

export function getMonthlyExpenses(month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  return request(`/api/web/expenses/monthly${query}`);
}

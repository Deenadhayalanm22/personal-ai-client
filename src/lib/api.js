// Centralized API config and helpers
export const BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8080');

export async function postExpense(text) {
  const res = await fetch(`${BASE}/api/expense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return res;
}

export async function getCurrentMonthSummary() {
  const res = await fetch(`${BASE}/api/expense/summary/current-month`);
  return res;
}

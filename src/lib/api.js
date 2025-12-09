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

// New API: process speech through the assistant endpoint
export async function processSpeech(text, userId = 'demo-user') {
  const res = await fetch(`${BASE}/api/v1/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, userId })
  });
  // try to parse JSON, but return raw response object if parsing fails
  try {
    const json = await res.json();
    return { ok: res.ok, status: res.status, data: json };
  } catch (e) {
    const txt = await res.text().catch(()=>'');
    return { ok: res.ok, status: res.status, data: txt };
  }
}

export async function getRecentTransactions() {
  try {
    const res = await fetch(`${BASE}/api/v1/recent`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (e) { console.error('getRecentTransactions', e); return []; }
}

export async function getTodaySummary() {
  try {
    const res = await fetch(`${BASE}/api/v1/summary/today`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (e) { console.error('getTodaySummary', e); return null; }
}

export async function getMonthlySummary() {
  try {
    const res = await fetch(`${BASE}/api/v1/summary/monthly`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (e) { console.error('getMonthlySummary', e); return null; }
}

export async function deleteTransaction(id) {
  try {
    const res = await fetch(`${BASE}/api/v1/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) { console.error('deleteTransaction', e); return false; }
}

export async function getCurrentMonthSummary() {
  const res = await fetch(`${BASE}/api/expense/summary/current-month`);
  return res;
}

export async function getRecentExpenses() {
  const res = await fetch(`${BASE}/api/expense/recent`);
  return res;
}

export async function deleteExpense(id) {
  const res = await fetch(`${BASE}/api/expense/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return res;
}

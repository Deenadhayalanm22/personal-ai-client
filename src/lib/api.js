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



export async function deleteTransaction(id) {
  try {
    const res = await fetch(`${BASE}/api/v1/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) { console.error('deleteTransaction', e); return false; }
}



// New single-summary endpoint that returns today's total, month total, categories and recent transactions
export async function getExpenseSummary() {
  try {
    const res = await fetch(`${BASE}/api/expense/summary`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    return json;
  } catch (e) {
    console.error('getExpenseSummary', e);
    // return a safe default shape
    return { todayTotal: 0, monthTotal: 0, categoryTotals: {}, recentTransactions: [] };
  }
}

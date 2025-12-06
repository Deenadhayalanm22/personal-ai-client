<script>
  export let expense = {};

  // defensive getters (backend may return fields with different names)
  const amount = expense.amount ?? expense.total ?? expense.value ?? null;
  const category = expense.category ?? expense.mainCategory ?? expense.categoryName ?? '';
  const subcategory = expense.subcategory ?? expense.subCategory ?? '';
  const merchant = expense.merchant ?? expense.payee ?? '';
  const paymentMethod = expense.paymentMethod ?? expense.method ?? '';
  const spentAt = expense.spentAt ?? expense.date ?? expense.createdAt ?? '';
</script>

<style>
  .card {
    padding: 1rem;
    border-radius: 10px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.04);
    color: #eef2ff;
    display: grid;
    gap: .4rem;
  }

  .row {
    display:flex;
    justify-content:space-between;
    gap: .6rem;
    align-items: center;
  }

  .label { color: #9aa3d6; font-size: .9rem }
  .value { font-weight:700; }
  .meta { font-size:.9rem; color:#bfc8ff; }
</style>

<div class="card" aria-live="polite">
  <div class="row">
    <div>
      <div class="label">Amount</div>
      <div class="value">{amount ?? '—'}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Category</div>
      <div class="value">{category || '—'}</div>
    </div>
  </div>

  <div class="row" style="margin-top:.4rem">
    <div>
      <div class="label">Subcategory</div>
      <div class="meta">{subcategory || '—'}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Merchant</div>
      <div class="meta">{merchant || '—'}</div>
    </div>
  </div>

  <div class="row" style="margin-top:.4rem">
    <div>
      <div class="label">Payment Method</div>
      <div class="meta">{paymentMethod || '—'}</div>
    </div>
    <div style="text-align:right">
      <div class="label">When</div>
      <div class="meta">{spentAt || '—'}</div>
    </div>
  </div>

  <!-- Raw JSON for debugging -->
  <details style="margin-top:.6rem; color:#9aa3d6;">
    <summary style="cursor:pointer">Raw response (expand)</summary>
    <pre style="white-space:pre-wrap; font-size:.85rem; color:#dbe7ff;">{JSON.stringify(expense, null, 2)}</pre>
  </details>
</div>
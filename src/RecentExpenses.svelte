<script>
  import { onMount } from 'svelte';
  import { getRecentExpenses, deleteExpense } from './lib/api.js';

  let loading = false;
  let error = '';
  let expenses = [];

  async function load() {
    loading = true;
    error = '';
    try {
      const res = await getRecentExpenses();
      if (!res || !res.ok) throw new Error(`Server ${res ? res.status : 'no-response'}`);
      expenses = await res.json();
    } catch (err) {
      console.error('Failed to load recent expenses', err);
      error = 'Could not load recent expenses';
    } finally {
      loading = false;
    }
  }

  onMount(load);

  async function handleDelete(id, index) {
    // optimistic remove
    const removed = expenses[index];
    expenses = expenses.slice(0, index).concat(expenses.slice(index + 1));
    try {
      const res = await deleteExpense(id);
      if (!res || (res.status !== 200 && res.status !== 204)) {
        throw new Error(`Delete failed ${res ? res.status : 'no-response'}`);
      }
    } catch (err) {
      // rollback
      expenses = [...expenses.slice(0, index), removed, ...expenses.slice(index)];
      console.error('Delete failed', err);
      error = 'Failed to delete expense';
      setTimeout(()=> error = '', 3000);
    }
  }
</script>

<style>
  .recent { padding: .6rem; background: rgba(255,255,255,0.02); border-radius:8px; }
  .item { display:flex; justify-content:space-between; gap:1rem; padding:.75rem; align-items:center; background: rgba(255,255,255,0.02); border-radius:8px; margin-bottom:.6rem; border:1px solid rgba(255,255,255,0.03); }
  .item-left { display:flex; flex-direction:column; gap:.2rem }
  .item-right { display:flex; flex-direction:column; gap:.4rem; align-items:flex-end }
  .meta { color:#9aa3d6; font-size:.9rem }
  .amt { font-weight:800; color:#baf0bd }
  .delete-icon { background:transparent; border:none; color:#ffb4b4; padding:6px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center }
  .delete-icon:hover { background: rgba(255,180,180,0.06); }
  .muted { color:#9aa3d6 }
</style>

<div class="recent">
  <h3 style="margin:0 0 .5rem 0">Recent</h3>
  {#if loading}
    <div class="meta">Loading...</div>
  {:else if error}
    <div class="meta" style="color:#ffb4b4">{error}</div>
  {:else if expenses && expenses.length}
    {#each expenses as item, i}
      <div class="item" role="listitem">
        <div class="item-left">
          <div class="amt">{item.amount}</div>
          <div class="muted">{item.merchant || '—'} · {item.category || 'Uncategorized'}</div>
        </div>
        <div class="item-right">
          <div class="meta">{new Date(item.spentAt).toLocaleString()}</div>
          <button class="delete-icon" aria-label="Delete expense" title="Delete" on:click={() => handleDelete(item.id, i)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M10 11v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path d="M14 11v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    {/each}
  {:else}
    <div class="meta">No recent expenses</div>
  {/if}
</div>

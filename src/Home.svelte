<script>
  import { ApiError, deleteExpense, getExpenses, updateClassification } from './lib/api.js';

  export let data; export let dashboard; export let error; export let taxonomy; export let taxonomyError; export let selectedMonth; export let filters;
  export let onFiltersChange; export let onRefresh; export let onExpired;

  let items = []; let nextBeforeId = null; let loadedFilterKey = ''; let filterRequestId = 0; let filterSummary = null;
  let loadingMore = false; let filtering = false; let editing = null; let deleting = null; let saving = false;
  let formError = ''; let notice = ''; let toast = '';
  let category = ''; let subcategory = '';

  $: summary = data?.summary || {};
  $: accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  $: categories = summary?.categories || data?.categories || data?.categoryBreakdown || [];
  $: normalizedCategories = Array.isArray(categories) ? categories : Object.entries(categories).map(([name, amount]) => ({ name, amount }));
  $: total = Number(summary.total ?? summary.totalSpent ?? data?.totalSpent ?? data?.total ?? 0);
  $: count = Number(summary.transactionCount ?? data?.transactionCount ?? items.length);
  $: largestCategory = normalizedCategories[0]?.name || normalizedCategories[0]?.category || '—';
  $: categoryOptions = Array.isArray(taxonomy?.categories) ? taxonomy.categories : [];
  $: selectedTaxonomyCategory = categoryOptions.find((option) => option.name.toLocaleLowerCase() === category.trim().toLocaleLowerCase());
  $: subcategoryOptions = selectedTaxonomyCategory?.subcategories || [];
  $: selectedTaxonomySubcategory = subcategoryOptions.find((option) => option.toLocaleLowerCase() === subcategory.trim().toLocaleLowerCase());
  $: classificationValid = Boolean(selectedTaxonomyCategory && selectedTaxonomySubcategory);
  $: filterKey = JSON.stringify(filters);
  $: if (filterKey && filterKey !== loadedFilterKey) loadFilteredExpenses(filterKey);
  $: activeAccount = accounts.find((item) => item.id === filters.accountId);
  $: activeFilterLabels = [activeAccount?.name, filters.category, filters.subcategory].filter(Boolean);

  const currency = () => data?.currency || summary.currency || 'INR';
  const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency(), maximumFractionDigits: 0 }).format(Number(value || 0));
  const accountMoney = (value, accountCurrency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency: accountCurrency, maximumFractionDigits: 0 }).format(Number(value));
  function accountTransactionLabel(account) {
    const transactions = Number(account.transactionCount ?? 0);
    return `${transactions} ${transactions === 1 ? 'transaction' : 'transactions'} this month`;
  }
  function monthLabel(month) { const [year, number] = month.split('-').map(Number); return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, number - 1)); }
  function dateLabel(value) {
    if (!value) return '';
    const date = new Date(value); const now = new Date();
    if (date.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
  }
  const expenseCategory = (item) => item.category?.name || item.category || 'Uncategorised';
  const expenseSubcategory = (item) => item.subcategory?.name || item.subcategory || 'General';
  const itemDate = (item) => item.transactionTime || item.date || item.transactionDate || item.createdAt;
  const message = (item) => item.originalMessage || item.message || item.description || 'Expense';
  function account(item) {
    const source = item.sourceAccount ?? item.source_account ?? item.sourceAccountName;
    if (typeof source === 'string' && source.trim()) return source.trim();
    if (source && typeof source === 'object') return source.name || source.displayName || source.label || 'Account not specified';
    if (typeof item.account === 'string' && item.account.trim()) return item.account.trim();
    return item.account?.name || item.account?.displayName || item.accountName || 'Account not specified';
  }
  const percentage = (item) => Number(item.percentage ?? (total ? Number(item.amount || item.total) / total * 100 : 0));
  const categoryName = (item) => item.name || item.category || 'Other';
  const categoryAmount = (item) => item.amount ?? item.total ?? 0;
  const categoryCount = (item) => Number(item.transactionCount ?? item.count ?? 0);
  const subcategoriesFor = (item) => item.subcategories || item.subcategoryBreakdown || [];
  const subcategoryName = (item) => typeof item === 'string' ? item : item.name || item.subcategory;

  function setFilter(patch) { onFiltersChange({ ...filters, ...patch }); }
  function toggleAccount(item) { setFilter({ accountId: filters.accountId === item.id ? undefined : item.id }); }
  function toggleCategory(item) {
    const name = categoryName(item);
    if (filters.category === name) setFilter({ category: undefined, subcategory: undefined });
    else setFilter({ category: name, subcategory: undefined });
  }
  function toggleSubcategory(item, parent) {
    const name = subcategoryName(item);
    setFilter({ category: categoryName(parent), subcategory: filters.subcategory === name ? undefined : name });
  }
  function clearFilters() { onFiltersChange({ month: filters.month }); }
  async function loadFilteredExpenses(key) {
    loadedFilterKey = key;
    const requestId = ++filterRequestId;
    filtering = true; notice = '';
    try {
      const page = await getExpenses(filters);
      if (requestId !== filterRequestId) return;
      items = page?.items || page?.expenses || [];
      nextBeforeId = page?.nextBeforeId ?? null;
      filterSummary = page?.filterSummary || null;
    } catch (cause) {
      if (requestId !== filterRequestId) return;
      if (cause instanceof ApiError && cause.status === 401) onExpired();
      else notice = cause.message || 'Could not load transactions.';
    } finally { if (requestId === filterRequestId) filtering = false; }
  }

  function handleApiError(cause, fallback) {
    if (cause instanceof ApiError && cause.status === 401) { onExpired(); return; }
    formError = cause instanceof Error ? cause.message : fallback;
  }
  async function loadMore() {
    if (loadingMore || nextBeforeId == null) return;
    loadingMore = true; notice = '';
    try { const page = await getExpenses(filters, nextBeforeId); items = [...items, ...(page?.items || page?.expenses || [])]; nextBeforeId = page?.nextBeforeId ?? null; }
    catch (cause) { if (cause instanceof ApiError && cause.status === 401) onExpired(); else notice = cause.message || 'Could not load more expenses.'; }
    finally { loadingMore = false; }
  }
  function openEdit(item) { editing = item; category = expenseCategory(item); subcategory = expenseSubcategory(item); formError = ''; }
  function changed() { return editing && (category !== expenseCategory(editing) || subcategory !== expenseSubcategory(editing)); }
  function onCategoryChange(value) {
    if (value !== category) subcategory = '';
    category = value;
    formError = '';
  }
  async function saveEdit() {
    if (!changed() || !classificationValid || saving) return;
    const staleId = editing.id;
    saving = true; formError = '';
    try {
      const updated = await updateClassification(editing.id, selectedTaxonomyCategory.name, selectedTaxonomySubcategory, editing.version);
      items = items.map((item) => item.id === staleId ? updated : item); editing = null;
      await Promise.all([onRefresh(), loadFilteredExpenses(filterKey)]);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) { editing = null; notice = 'This expense changed after you opened it. The latest information has been loaded.'; await Promise.all([onRefresh(), loadFilteredExpenses(filterKey)]); }
      else if (cause instanceof ApiError && cause.status === 404) { editing = null; items = items.filter((item) => item.id !== staleId); await Promise.all([onRefresh(), loadFilteredExpenses(filterKey)]); }
      else handleApiError(cause, 'Could not save this expense.');
    } finally { saving = false; }
  }
  async function confirmDelete() {
    if (!deleting || saving) return;
    const staleId = deleting.id; saving = true; formError = '';
    try { await deleteExpense(deleting.id, deleting.version); items = items.filter((item) => item.id !== staleId); deleting = null; toast = 'Expense deleted'; setTimeout(() => toast = '', 2600); await Promise.all([onRefresh(), loadFilteredExpenses(filterKey)]); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) { items = items.filter((item) => item.id !== staleId); deleting = null; await Promise.all([onRefresh(), loadFilteredExpenses(filterKey)]); }
      else if (cause instanceof ApiError && cause.status === 409) { deleting = null; notice = 'This expense changed after you opened it. The latest information has been loaded.'; await Promise.all([onRefresh(), loadFilteredExpenses(filterKey)]); }
      else handleApiError(cause, 'Could not delete this expense.');
    } finally { saving = false; }
  }
</script>

<header class="topbar">
  <a class="brand" href="/" aria-label="Expense AI dashboard"><span class="logo">₹</span><span>Expense AI</span></a>
  <label class="month-picker"><span>Month</span><input aria-label="Select dashboard month" type="month" value={selectedMonth} on:change={(event) => onFiltersChange({ ...filters, month: event.currentTarget.value })} /></label>
</header>

<main class="dashboard-shell">
  <section class="welcome"><div><p class="eyebrow">Your spending</p><h1>{monthLabel(selectedMonth)}</h1><p>A clear view of where your money went.</p></div><div class="secure-pill"><span></span>Private & secure</div></section>

  {#if notice}<div class="notice" role="status">{notice}<button on:click={() => notice = ''} aria-label="Dismiss">×</button></div>{/if}
  {#if dashboard === 'error'}<div class="notice error" role="alert"><span>{error} Your current information has been kept.</span><button on:click={onRefresh}>Try again</button></div>{/if}

  {#if dashboard === 'loading' && !data}
    <section class="metric-grid" aria-label="Loading summary">{#each [1,2,3] as _}<div class="metric skeleton"><i></i><b></b><span></span></div>{/each}</section>
    <section class="content-grid"><div class="panel skeleton-panel"><i></i><b></b><b></b><b></b></div><div class="panel skeleton-panel"><i></i><b></b><b></b><b></b></div></section>
  {:else if data}
    <section class="metric-grid">
      <article class="metric accent"><p>Total spent</p><strong>{money(total)}</strong><span>Across all recorded expenses</span></article>
      <article class="metric"><p>Transactions</p><strong>{count}</strong><span>{count === 1 ? 'Expense' : 'Expenses'} this month</span></article>
      <article class="metric"><p>Largest category</p><strong class="category-value">{largestCategory}</strong><span>{normalizedCategories[0] ? money(categoryAmount(normalizedCategories[0])) : 'No spending yet'}</span></article>
    </section>

    {#if accounts.length}
      <section class="wallet-strip" aria-labelledby="accounts-heading">
        <div class="wallet-label"><span class="wallet-icon" aria-hidden="true">₹</span><div><h2 id="accounts-heading">Your accounts</h2><p>Tap a card to filter</p></div></div>
        <div class="wallet-cards">
          {#each accounts as financialAccount (financialAccount.id)}
            <button class:credit-chip={financialAccount.type === 'CREDIT_CARD'} class:chip-warning={financialAccount.overLimit} class:active-filter={filters.accountId === financialAccount.id} class="account-chip" on:click={() => toggleAccount(financialAccount)} aria-pressed={filters.accountId === financialAccount.id} aria-label={`Filter transactions by ${financialAccount.name}`}>
              <span><b>{financialAccount.name}</b><small>{financialAccount.primaryLabel}</small><small class="account-transactions">{accountTransactionLabel(financialAccount)}</small></span>
              <strong>{financialAccount.primaryValue == null ? 'Not recorded' : accountMoney(financialAccount.primaryValue, financialAccount.currency)}</strong>
              <i aria-hidden="true">›</i>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    {#if dashboard === 'empty'}
      <section class="empty-month"><span class="empty-icon">₹</span><h2>No expenses recorded for {monthLabel(selectedMonth)}.</h2><p>Record an expense through WhatsApp and it will appear here.</p></section>
    {:else}
      <section class="content-grid">
      <article class="panel category-panel"><div class="panel-heading"><div><p class="eyebrow">Breakdown</p><h2>Spending by category</h2></div><span>{normalizedCategories.length} categories</span></div>
        <div class="category-list">{#each normalizedCategories as item, index}<div class:active-category={filters.category === categoryName(item)} class="category-row"><button class="category-filter" on:click={() => toggleCategory(item)} aria-pressed={filters.category === categoryName(item)}><div class="category-line"><span><i style={`--dot:${index}`}></i>{categoryName(item)}</span><strong>{money(categoryAmount(item))}</strong></div><div class="bar"><span style={`width:${Math.max(2, percentage(item))}%`}></span></div><small>{percentage(item).toFixed(0)}% of total{categoryCount(item) ? ` · ${categoryCount(item)} transactions` : ''}</small></button>{#if filters.category === categoryName(item) && subcategoriesFor(item).length}<div class="subcategory-list">{#each subcategoriesFor(item) as subcategory}<button class:active-filter={filters.subcategory === subcategoryName(subcategory)} on:click={() => toggleSubcategory(subcategory, item)} aria-pressed={filters.subcategory === subcategoryName(subcategory)}><span>{subcategoryName(subcategory)}</span>{#if typeof subcategory !== 'string'}<small>{categoryCount(subcategory)} {categoryCount(subcategory) === 1 ? 'transaction' : 'transactions'}</small><strong>{money(categoryAmount(subcategory))}</strong>{/if}</button>{/each}</div>{/if}</div>{/each}</div>
      </article>

      <article class="panel activity-panel"><div class="panel-heading"><div><p class="eyebrow">Activity</p><h2>{activeFilterLabels.length ? 'Transactions' : 'Recent expenses'}</h2>{#if activeFilterLabels.length}<p class="filter-description">{activeFilterLabels.join(' · ')}</p>{/if}</div><span>{activeFilterLabels.length && filterSummary ? `${filterSummary.transactionCount} ${Number(filterSummary.transactionCount) === 1 ? 'transaction' : 'transactions'} · ${money(filterSummary.totalAmount)}` : 'Latest first'}</span></div>
        {#if activeFilterLabels.length}<div class="filter-chips">{#if activeAccount}<button on:click={() => setFilter({ accountId: undefined })}>{activeAccount.name} <span>×</span></button>{/if}{#if filters.category}<button on:click={() => setFilter({ category: undefined, subcategory: undefined })}>{filters.category} <span>×</span></button>{/if}{#if filters.subcategory}<button on:click={() => setFilter({ subcategory: undefined })}>{filters.subcategory} <span>×</span></button>{/if}<button class="clear-filters" on:click={clearFilters}>Clear all</button></div>{/if}
        {#if filtering}<p class="filter-loading" aria-live="polite">Loading transactions…</p>{/if}
        <div class:filtering class="expense-list">{#each items as item (item.id)}<article class="expense-item"><div class="expense-top"><strong>{money(item.amount)}</strong><time datetime={itemDate(item)}>{dateLabel(itemDate(item))}</time></div><p class="message">“{message(item)}”</p><div class="expense-meta"><div><b>{expenseCategory(item)} <span>›</span> {expenseSubcategory(item)}</b><small>{account(item)}</small></div>{#if item.needsReview}<span class="review">Needs review</span>{/if}</div><div class="expense-actions"><button class="text-button" on:click={() => openEdit(item)}>Edit category</button><button class="text-button delete" on:click={() => { deleting = item; formError = ''; }}>Delete</button></div></article>{/each}</div>
        {#if nextBeforeId != null}<button class="load-more" on:click={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more expenses'}</button>{/if}
        {#if notice}<p class="inline-error">{notice}</p>{/if}
      </article>
      </section>
    {/if}
  {/if}
</main>

{#if editing}<div class="modal-backdrop" role="presentation" on:click={(event) => event.currentTarget === event.target && !saving && (editing = null)}><div class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><button class="close" on:click={() => editing = null} disabled={saving} aria-label="Close">×</button><p class="eyebrow">Classification</p><h2 id="edit-title">Edit classification</h2><div class="original"><small>Original message</small><p>“{message(editing)}”</p></div><label>Category<input list="expense-categories" value={category} on:input={(event) => onCategoryChange(event.currentTarget.value)} disabled={saving || !categoryOptions.length} placeholder="Search or select category" autocomplete="off" /><datalist id="expense-categories">{#each categoryOptions as option}<option value={option.name}></option>{/each}</datalist></label><label>Subcategory<input list="expense-subcategories" bind:value={subcategory} on:input={() => formError = ''} disabled={saving || !selectedTaxonomyCategory} placeholder="Search or select subcategory" autocomplete="off" /><datalist id="expense-subcategories">{#each subcategoryOptions as option}<option value={option}></option>{/each}</datalist></label>{#if taxonomyError}<p class="form-error" role="alert">Categories are unavailable right now. {taxonomyError}</p>{/if}{#if formError}<p class="form-error" role="alert">{formError}</p>{/if}<div class="modal-actions"><button class="secondary" on:click={() => editing = null} disabled={saving}>Cancel</button><button class="primary" on:click={saveEdit} disabled={!changed() || !classificationValid || saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></div></div>{/if}

{#if deleting}<div class="modal-backdrop" role="presentation" on:click={(event) => event.currentTarget === event.target && !saving && (deleting = null)}><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><button class="close" on:click={() => deleting = null} disabled={saving} aria-label="Close">×</button><p class="eyebrow danger-copy">Please confirm</p><h2 id="delete-title">Delete this expense?</h2><div class="delete-preview"><p>“{message(deleting)}”</p><strong>{money(deleting.amount)} · {expenseCategory(deleting)}</strong></div><p class="consequence">This will remove the expense from your reports and restore its account-balance effect when applicable.</p>{#if formError}<p class="form-error" role="alert">{formError}</p>{/if}<div class="modal-actions"><button class="secondary" on:click={() => deleting = null} disabled={saving}>Cancel</button><button class="danger-button" on:click={confirmDelete} disabled={saving}>{saving ? 'Deleting…' : 'Delete expense'}</button></div></div></div>{/if}
{#if toast}<div class="toast" role="status">✓ {toast}</div>{/if}

<script>
  import { onMount } from 'svelte';
  import { ApiError, createTag, deleteExpense, getExpenses, getTags, updateClassification, logout } from './lib/api.js';
  import SectionState from './SectionState.svelte';

  export let sections; export let taxonomy; export let taxonomyError; export let selectedMonth; export let filters; export let destination;
  export let onMonthChange; export let onFiltersChange; export let refreshSummary; export let refreshExpenses; export let onExpired; export let onLogout;

  let items = [], loadedPage = null, nextBeforeId = null, loadingMore = false;
  let activeView = 'stories', selectedDay = null, receiptIndex = 0, openedStory = null;
  let editing = null, saving = false, formError = '', toast = '', loggingOut = false;
  let category = '', subcategory = '', originalCategory = '', originalSubcategory = '';
  let availableTags = [], tagsLoaded = false, tagsRequest = null, selectedTagIds = [], tagSearch = '', filterTagSearch = '', tagsLoading = false, tagsError = '', managingTags = false, newTagName = '', creatingTag = false;

  $: summary = sections.summary.data || {};
  $: insight = sections.insights.data || {};
  $: expensePage = sections.expenses.data;
  $: if (expensePage && expensePage !== loadedPage) {
    loadedPage = expensePage;
    items = expensePage.items || expensePage.expenses || [];
    nextBeforeId = expensePage.nextBeforeId ?? null;
    receiptIndex = 0;
  }
  $: categoryData = insight?.summary?.categories || insight?.categories || insight?.categoryBreakdown || [];
  $: normalizedCategories = Array.isArray(categoryData) ? categoryData : Object.entries(categoryData).map(([name, amount]) => ({ name, amount }));
  $: stories = insight?.stories || insight?.moneyStories || insight?.storyCards || [];
  $: storyList = Array.isArray(stories) ? stories : [];
  $: categoryOptions = taxonomy?.categories || [];
  $: selectedCategory = categoryOptions.find(item => item.name.toLowerCase() === category.trim().toLowerCase());
  $: subcategoryOptions = selectedCategory?.subcategories || [];
  $: validClassification = !!selectedCategory && subcategoryOptions.some(item => item.toLowerCase() === subcategory.trim().toLowerCase());
  $: classificationChanged = category.trim() !== originalCategory || subcategory.trim() !== originalSubcategory;
  $: activeTags = (filters.tagIds || []).map(id => availableTags.find(tag => tag.id === id) || { id, name: `Tag ${id}` });
  $: activeFilterLabels = [filters.category, filters.subcategory, ...activeTags.map(tag => tag.name)].filter(Boolean);
  $: filterSummary = expensePage?.filterSummary || null;
  $: currency = summary?.currency || insight?.currency || 'INR';
  $: filteredTags = availableTags.filter(tag => tag.name.toLowerCase().includes(tagSearch.trim().toLowerCase()));
  $: filterTagOptions = availableTags.filter(tag => tag.name.toLowerCase().includes(filterTagSearch.trim().toLowerCase()));
  $: monthExpenses = items.filter(item => expenseMonth(item) === selectedMonth);
  $: calendar = buildCalendar(selectedMonth, monthExpenses);
  $: selectedDayItems = selectedDay == null ? [] : monthExpenses.filter(item => expenseDay(item) === selectedDay);
  $: selectedDaySpend = selectedDayItems.reduce((total, item) => total + Number(item.amount || 0), 0);
  $: highestSpend = Math.max(0, ...calendar.days.map(day => day.amount));
  $: recentItem = items[receiptIndex] || null;
  $: isEarlyState = items.length > 0 && storyList.length === 0;
  $: if (destination.startsWith('/portal/expenses/') && items.length && !editing) { const id = Number(destination.split('/').pop()); const found = items.find(item => item.id === id); if (found) openEdit(found); }

  const money = (value, code) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: code || currency, maximumFractionDigits: 0 }).format(Number(value || 0));
  const message = item => item.originalMessage || item.message || item.description || 'Expense';
  const merchant = item => item.merchant || item.merchantName || message(item);
  const expenseCategory = item => item.category?.name || item.category || 'Uncategorised';
  const expenseSubcategory = item => item.subcategory?.name || item.subcategory || 'General';
  const paymentSource = item => typeof item.sourceAccount === 'string' && item.sourceAccount.trim() ? item.sourceAccount : 'Payment source not recorded';
  const transactionDate = item => item.transactionTime || item.transactionDate || item.date || item.createdAt;
  const categoryName = item => item.name || item.category || 'Other';
  const subcategoriesFor = item => item.subcategories || item.subcategoryBreakdown || [];
  const subcategoryName = item => typeof item === 'string' ? item : item.name || item.subcategory;
  const storyTitle = story => story.headline || story.title || 'A new pattern appeared.';
  const storySummary = story => story.summary || story.description || story.explanation || 'Open this story to see the supporting transactions.';

  function parsedDate(item) { const value = transactionDate(item); if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
  function expenseMonth(item) { const date = parsedDate(item); return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : ''; }
  function expenseDay(item) { return parsedDate(item)?.getDate() ?? null; }
  function dateLabel(value) { if (!value) return ''; return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }
  function monthLabel(value) { const [year, month] = value.split('-').map(Number); return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1)); }
  function monthName(value) { const [year, month] = value.split('-').map(Number); return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(year, month - 1)); }
  function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'; }
  function buildCalendar(monthValue, expenses) {
    const [year, month] = monthValue.split('-').map(Number);
    const count = new Date(year, month, 0).getDate();
    const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const totals = new Map();
    for (const item of expenses) { const day = expenseDay(item); if (day) totals.set(day, (totals.get(day) || 0) + Number(item.amount || 0)); }
    const max = Math.max(0, ...totals.values());
    const today = new Date();
    const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === month;
    return { leading, days: Array.from({ length: count }, (_, index) => { const day = index + 1, amount = totals.get(day) || 0; return { day, amount, future: isCurrent && day > today.getDate(), level: amount === 0 || max === 0 ? 0 : Math.max(1, Math.ceil((amount / max) * 4)) }; }) };
  }
  function daysRecorded() { return new Set(monthExpenses.map(expenseDay).filter(Boolean)).size; }
  function dashboardUrl() { const params = new URLSearchParams({ month: selectedMonth }); if (filters.category) params.set('category', filters.category); if (filters.subcategory) params.set('subcategory', filters.subcategory); if (filters.tagIds?.length) { params.set('tagIds', filters.tagIds.join(',')); params.set('tagMatch', filters.tagMatch === 'all' ? 'all' : 'any'); } return `/dashboard?${params}`; }
  function setFilter(patch) { onFiltersChange({ ...filters, ...patch }); }
  function clearFilters() { onFiltersChange({ month: selectedMonth }); }
  function toggleFilterTag(id) { const current = filters.tagIds || []; const tagIds = current.includes(id) ? current.filter(value => value !== id) : [...current, id]; setFilter(tagIds.length ? { tagIds, tagMatch: filters.tagMatch === 'all' ? 'all' : 'any' } : { tagIds: undefined, tagMatch: undefined }); }
  function showToast(text) { toast = text; setTimeout(() => toast = '', 2800); }
  function handleError(cause, fallback) { if (cause instanceof ApiError && cause.status === 401) onExpired(); else formError = cause?.message || fallback; }
  function selectDay(day) { if (!day.future) selectedDay = selectedDay === day.day ? null : day.day; }
  function moveReceipt(offset) { if (!items.length) return; receiptIndex = (receiptIndex + offset + items.length) % items.length; }
  function openStory(story) { openedStory = story; activeView = 'story-detail'; scrollTo({ top: 0, behavior: 'smooth' }); }
  function selectView(view) { openedStory = null; activeView = view; scrollTo({ top: 0, behavior: 'smooth' }); }
  function requestAdd() { showToast(`Add transactions for ${selectedDay || 'this month'} ${monthName(selectedMonth)} in WhatsApp.`); }
  async function loadMore() { if (loadingMore || nextBeforeId == null) return; loadingMore = true; try { const page = await getExpenses(filters, nextBeforeId, 20); items = [...items, ...(page.items || page.expenses || [])]; nextBeforeId = page.nextBeforeId ?? null; } catch (cause) { handleError(cause, 'Could not load more expenses.'); } finally { loadingMore = false; } }
  async function loadTags() { if (tagsLoaded) return availableTags; if (tagsRequest) return tagsRequest; tagsLoading = true; tagsError = ''; tagsRequest = (async () => { try { availableTags = await getTags(); tagsLoaded = true; return availableTags; } catch (cause) { if (cause instanceof ApiError && cause.status === 401) onExpired(); else tagsError = cause?.message || 'Could not load tags.'; return null; } finally { tagsLoading = false; tagsRequest = null; } })(); return tagsRequest; }
  function openEdit(item) { editing = item; category = expenseCategory(item); subcategory = expenseSubcategory(item); originalCategory = category.trim(); originalSubcategory = subcategory.trim(); selectedTagIds = [...new Set((Array.isArray(item.tags) ? item.tags : []).map(tag => tag.id))]; tagSearch = ''; managingTags = false; newTagName = ''; tagsError = ''; formError = ''; loadTags(); }
  function closeExpenseEditor() { editing = null; history.replaceState({}, '', dashboardUrl()); }
  function toggleTag(id) { selectedTagIds = selectedTagIds.includes(id) ? selectedTagIds.filter(value => value !== id) : [...selectedTagIds, id]; }
  async function submitTag() { const name = newTagName.trim(); if (!name || creatingTag) return; creatingTag = true; tagsError = ''; try { const tag = await createTag(name); availableTags = [...availableTags, tag].sort((a, b) => a.name.localeCompare(b.name)); newTagName = ''; managingTags = false; showToast('Tag created'); } catch (cause) { if (cause instanceof ApiError && cause.status === 409) tagsError = 'A tag with this name already exists.'; else if (cause instanceof ApiError && cause.status === 401) onExpired(); else tagsError = cause?.message || 'Could not create tag.'; } finally { creatingTag = false; } }
  async function saveEdit() { if ((classificationChanged && !validClassification) || saving) return; saving = true; formError = ''; const id = editing.id; const changes = { version: editing.version, tagIds: [...new Set(selectedTagIds)] }; if (classificationChanged) { changes.category = selectedCategory.name; changes.subcategory = subcategory.trim(); } try { const updated = await updateClassification(id, changes); items = items.map(item => item.id === id ? updated : item); editing = null; history.replaceState({}, '', dashboardUrl()); await refreshSummary(); showToast('Expense updated'); } catch (cause) { if (cause instanceof ApiError && cause.status === 409) { await refreshExpenses(); editing = null; history.replaceState({}, '', dashboardUrl()); formError = 'This expense changed. The latest details have been loaded.'; } else handleError(cause, 'Could not update expense.'); } finally { saving = false; } }
  async function removeExpense(item) { if (!confirm('Delete this expense? This cannot be undone.')) return; try { await deleteExpense(item.id, item.version); await Promise.all([refreshExpenses(), refreshSummary()]); showToast('Expense deleted'); } catch (cause) { handleError(cause, 'Could not delete expense.'); } }
  async function signOut() { loggingOut = true; try { await logout(); onLogout(); } catch { loggingOut = false; formError = 'Could not sign out.'; } }
  onMount(loadTags);
</script>

<header class="portal-topbar"><a class="wordmark" href="/dashboard"><span>₹</span>Money Stories</a><label class="month-switcher"><button aria-label="Previous month" on:click={() => { const [y,m] = selectedMonth.split('-').map(Number); onMonthChange(new Date(y,m-2).toISOString().slice(0,7)); }}>←</button><input aria-label="Select month" type="month" value={selectedMonth} on:change={event => onMonthChange(event.currentTarget.value)}/><button aria-label="Next month" on:click={() => { const [y,m] = selectedMonth.split('-').map(Number); const next = new Date(y,m).toISOString().slice(0,7); if (next <= new Date().toISOString().slice(0,7)) onMonthChange(next); }}>→</button></label></header>

<main class="story-shell">
  {#if formError}<div class="notice error" role="alert"><span>{formError}</span><button on:click={() => formError = ''}>×</button></div>{/if}

  {#if activeView === 'story-detail'}
    <section class="story-detail"><button class="back-button" on:click={() => selectView('stories')}>← Back to stories</button><p class="micro-label">{openedStory?.type || 'MONEY STORY'} · {openedStory?.periodLabel || monthLabel(selectedMonth)}</p><h1>{storyTitle(openedStory || {})}</h1><div class="evidence-visual"><div><span>Recorded comparison</span><strong>{openedStory?.comparisonValue || money(summary.totalSpend)}</strong><i style={`width:${Math.min(100, Number(openedStory?.comparisonPercent || 72))}%`}></i></div><div><span>Pattern impact</span><strong>{openedStory?.impactValue || money(openedStory?.amount || highestSpend)}</strong><i style={`width:${Math.min(100, Number(openedStory?.impactPercent || 58))}%`}></i></div></div><p class="detail-copy">{storySummary(openedStory || {})}</p><div class="section-title"><h2>What caused it</h2><span>{(openedStory?.transactions || monthExpenses).length} transactions</span></div><div class="evidence-list">{#each (openedStory?.transactions || monthExpenses.slice(0, 6)) as item}<div class="evidence-row"><div><strong>{merchant(item)}</strong><span>{expenseCategory(item)} · {dateLabel(transactionDate(item))}</span></div><b>{money(item.amount)}</b></div>{/each}</div><div class="context-card"><p class="micro-label">WHY THIS MATTERS</p><p>{openedStory?.whyItMatters || 'This story is context, not a warning or judgement. It helps you see which recorded events most changed the shape of the month.'}</p></div></section>
  {:else if activeView === 'activity'}
    <section class="app-heading"><div><p class="micro-label">{monthName(selectedMonth).toUpperCase()}</p><h1>Your activity</h1><p>Every confirmed transaction, newest first.</p></div></section>
    <SectionState section={sections.expenses} title="Recent expenses" retry={refreshExpenses}><section class="activity-panel"><div class="tag-filter"><div class="filter-head"><strong>Filter transactions</strong>{#if activeFilterLabels.length}<button on:click={clearFilters}>Clear all</button>{/if}</div><input placeholder="Search tags…" bind:value={filterTagSearch}/>{#if filterTagOptions.length}<div class="tag-pills">{#each filterTagOptions as tag}<button class:active={(filters.tagIds || []).includes(tag.id)} on:click={() => toggleFilterTag(tag.id)}>{tag.name}</button>{/each}</div>{/if}</div>{#if items.length}<div class="activity-list">{#each items as item}<article class="transaction-row"><div><strong>{merchant(item)}</strong><span>{expenseCategory(item)} · {paymentSource(item)} · {dateLabel(transactionDate(item))}</span><p>“{message(item)}”</p></div><div><b>− {money(item.amount)}</b><button on:click={() => openEdit(item)}>Edit</button><button class="delete-link" on:click={() => removeExpense(item)}>Delete</button></div></article>{/each}</div>{#if nextBeforeId != null}<button class="wide-button" on:click={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>{/if}{:else}<div class="empty-state"><span>⌁</span><h2>No transactions found</h2><p>Try another filter or record an expense in WhatsApp.</p></div>{/if}</section></SectionState>
  {:else if activeView === 'profile'}
    <section class="app-heading"><div><p class="micro-label">PRIVATE PROFILE</p><h1>Your space</h1><p>Money Stories is designed as a quiet, personal record.</p></div></section><section class="profile-card"><div class="profile-mark">D</div><h2>Deena</h2><p>Your transaction details stay tied to your secure session.</p><button class="wide-button" on:click={signOut} disabled={loggingOut}>{loggingOut ? 'Signing out…' : 'Sign out'}</button></section>
  {:else}
    <section class="app-heading"><div><p class="micro-label">{monthName(selectedMonth).toUpperCase()}</p><h1>{greeting()}</h1><p>Your financial life, understood one confirmed transaction at a time.</p></div><button class="profile-button" on:click={() => selectView('profile')} aria-label="Open profile">D</button></section>

    <SectionState section={sections.summary} title="Monthly summary" retry={refreshSummary}><section class="month-card"><div class="section-title"><div><p class="micro-label">THIS MONTH SO FAR</p><h2>{monthName(selectedMonth)} at a glance</h2></div><span>{daysRecorded()} recorded days</span></div><div class="month-summary"><div><span>Total recorded</span><strong>{money(summary.totalSpend)}</strong></div><div><span>Transactions</span><strong>{summary.transactionCount || items.length}</strong></div><div><span>Highest spend</span><strong>{money(highestSpend)}</strong></div></div><div class="weekdays" aria-hidden="true">{#each ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as day}<span>{day}</span>{/each}</div><div class="calendar">{#each Array(calendar.leading) as _}<span></span>{/each}{#each calendar.days as day}<button class:future={day.future} class:selected={selectedDay === day.day} class={`level-${day.level}`} disabled={day.future} on:click={() => selectDay(day)} aria-label={`${day.day} ${monthName(selectedMonth)}${day.amount ? `, ${money(day.amount)} recorded` : ', no recorded spend'}`}>{day.day}</button>{/each}</div><div class="legend"><span>Lower spend</span><div>{#each [0,1,2,3,4] as level}<i class={`level-${level}`}></i>{/each}</div><span>Higher spend</span></div>{#if selectedDay != null}<div class="day-selection"><div><strong>{selectedDay} {monthName(selectedMonth)}</strong><span>{selectedDayItems.length ? `${selectedDayItems.length} ${selectedDayItems.length === 1 ? 'transaction' : 'transactions'} · ${money(selectedDaySpend)}` : 'No recorded transactions'}</span><p>{selectedDayItems.length ? selectedDayItems.map(merchant).join(' · ') : 'Does anything look missing?'}</p></div><button on:click={requestAdd}>＋ Add</button></div>{/if}</section></SectionState>

    {#if recentItem}<section class="recent-block"><div class="recent-head"><div><p class="micro-label">RECENTLY CAPTURED</p><span>{receiptIndex + 1} of {items.length}</span></div><div><button on:click={() => moveReceipt(-1)}>←</button><button on:click={() => moveReceipt(1)}>→</button></div></div><div class="recent-transaction"><div><strong>{merchant(recentItem)}</strong><span>{expenseCategory(recentItem)} · {paymentSource(recentItem)} · {dateLabel(transactionDate(recentItem))}</span></div><b>− {money(recentItem.amount)}</b></div></section>{/if}

    <SectionState section={sections.insights} title="Money Stories" retry={() => location.reload()}><section class="stories-section"><div class="section-title"><div><p class="micro-label">YOUR MONEY STORIES</p><h2>{storyList.length ? 'Something changed' : 'Your financial story is forming'}</h2></div>{#if storyList.length}<span>{storyList.length} {storyList.length === 1 ? 'story' : 'stories'}</span>{/if}</div>{#if storyList.length}{#each storyList as story, index}<button class:new-story={index === 0} class="story-card" on:click={() => openStory(story)}><span class="story-badge">{story.type || (index === 0 ? 'New pattern' : 'Story')}</span><div><h3>{storyTitle(story)}</h3><span>↗</span></div><p>{storySummary(story)}</p><small>Tap to see the evidence →</small></button>{/each}{:else}<div class="empty-state story-empty"><span>✦</span><h2>{isEarlyState ? 'Keep recording naturally.' : 'No stories for this month yet.'}</h2><p>Stories appear only when there is enough trustworthy evidence—not after a fixed number of transactions.</p></div>{/if}</section></SectionState>
  {/if}
</main>

{#if activeView !== 'story-detail'}<nav class="bottom-nav"><button class:active={activeView === 'stories'} on:click={() => selectView('stories')}><span>✦</span>Stories</button><button class:active={activeView === 'activity'} on:click={() => selectView('activity')}><span>▤</span>Activity</button><button class:active={activeView === 'profile'} on:click={() => selectView('profile')}><span>○</span>You</button></nav>{/if}

{#if editing}<div class="modal-backdrop"><div class="modal expense-modal" role="dialog" aria-modal="true"><button class="close" on:click={closeExpenseEditor}>×</button><p class="micro-label">TRANSACTION</p><h2>Edit expense</h2><div class="original"><small>Original message</small><p>“{message(editing)}”</p></div><div class="source-note"><span>Payment source</span><strong>{paymentSource(editing)}</strong><small>Captured transaction text; not editable here.</small></div><label>Category<input list="categories" bind:value={category}/><datalist id="categories">{#each categoryOptions as item}<option value={item.name}></option>{/each}</datalist></label><label>Subcategory<input list="subcategories" bind:value={subcategory}/><datalist id="subcategories">{#each subcategoryOptions as item}<option value={item}></option>{/each}</datalist></label><fieldset class="tag-selector"><legend>Tags</legend><input placeholder="Search tags…" bind:value={tagSearch}/>{#if tagsLoading}<p>Loading tags…</p>{:else if filteredTags.length}<div class="tag-options">{#each filteredTags as tag}<label><input type="checkbox" checked={selectedTagIds.includes(tag.id)} on:change={() => toggleTag(tag.id)}/><span>{tag.name}</span></label>{/each}</div>{:else}<p>No tags yet.</p>{/if}<button type="button" class="text-link" on:click={() => { managingTags = !managingTags; tagsError = ''; }}>Create tag</button>{#if managingTags}<form class="create-tag" on:submit|preventDefault={submitTag}><input maxlength="100" placeholder="Tag name" bind:value={newTagName}/><button disabled={!newTagName.trim() || creatingTag}>{creatingTag ? 'Creating…' : 'Create'}</button></form>{/if}{#if tagsError}<p class="form-error">{tagsError}</p>{/if}</fieldset>{#if taxonomyError}<p class="form-error">{taxonomyError}</p>{/if}<div class="modal-actions"><button class="secondary" on:click={closeExpenseEditor}>Cancel</button><button class="primary" on:click={saveEdit} disabled={(classificationChanged && !validClassification) || saving || tagsLoading}>{saving ? 'Saving…' : 'Save changes'}</button></div></div></div>{/if}
{#if toast}<div class="toast" role="status">{toast}</div>{/if}

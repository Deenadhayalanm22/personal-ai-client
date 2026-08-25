<script>
  import { onMount } from 'svelte';
  import Home from './Home.svelte'; import Auth from './Auth.svelte'; import PrivacyPolicy from './PrivacyPolicy.svelte';
  import { ApiError, exchangeMagicLink, getSession, getDashboardSummary, getMonthlyInsights, getExpenses, getAccounts, getEnrichment, getBudgets, getExpenseTaxonomy } from './lib/api.js';
  const initialPath = location.pathname.replace(/\/$/, '') || '/'; const isPrivacyPage = initialPath === '/privacy-policy'; const currentMonth = new Date().toISOString().slice(0, 7);
  const destination = /^\/portal\/(expenses|accounts)\/\d+$/.test(initialPath) ? initialPath : '/dashboard';
  let view = isPrivacyPage ? 'privacy' : 'checking'; let filters = filtersFromUrl(); let selectedMonth = filters.month; let taxonomy = null; let taxonomyError = ''; let sections = freshSections();
  function filtersFromUrl() { const params = new URLSearchParams(location.search); const value = params.get('month'); const month = /^\d{4}-\d{2}$/.test(value || '') ? value : currentMonth; const accountId = Number(params.get('accountId')); return { month, ...(Number.isInteger(accountId) && accountId > 0 ? { accountId } : {}), ...(params.get('category') ? { category: params.get('category') } : {}), ...(params.get('subcategory') ? { subcategory: params.get('subcategory') } : {}) }; }
  function filtersUrl(next) { const params = new URLSearchParams({ month: next.month }); if (next.accountId) params.set('accountId', next.accountId); if (next.category) params.set('category', next.category); if (next.subcategory) params.set('subcategory', next.subcategory); return `/dashboard?${params}`; }
  function state() { return { status: 'loading', data: null, error: '' }; }
  function freshSections() { return { summary: state(), expenses: state(), insights: state(), accounts: state(), enrichment: state(), budgets: state() }; }
  function setSection(name, patch) { sections = { ...sections, [name]: { ...sections[name], ...patch } }; }
  function unauthorized() { location.replace(`/portal?next=${encodeURIComponent(location.pathname + location.search)}`); }
  async function load(name, request) { setSection(name, { status: sections[name].data ? 'refreshing' : 'loading', error: '' }); try { const data = await request(); setSection(name, { status: 'ready', data, error: '' }); return data; } catch (cause) { if (!(cause instanceof ApiError && cause.status === 401)) setSection(name, { status: 'error', error: cause?.message || 'Something went wrong. Please try again.' }); } }
  const loadSummary = () => load('summary', () => getDashboardSummary(selectedMonth)); const loadExpenses = () => load('expenses', () => getExpenses(filters, null, 20)); const loadInsights = () => load('insights', () => getMonthlyInsights(selectedMonth));
  const loadAccounts = () => load('accounts', getAccounts); const loadEnrichment = () => load('enrichment', getEnrichment); const loadBudgets = () => load('budgets', getBudgets);
  async function loadApp() { view = 'dashboard'; getExpenseTaxonomy().then(value => taxonomy = value).catch(cause => { if (!(cause instanceof ApiError && cause.status === 401)) taxonomyError = 'Unable to load categories.'; }); await loadSummary(); Promise.allSettled([loadExpenses(), loadInsights(), loadAccounts(), loadEnrichment(), loadBudgets()]); }
  function changeFilters(next, updateHistory = true) { const monthChanged = next.month !== selectedMonth; filters = next; selectedMonth = next.month; if (updateHistory) history.pushState({}, '', filtersUrl(next)); loadExpenses(); if (monthChanged) { loadSummary(); loadInsights(); } }
  function changeMonth(month) { changeFilters({ ...filters, month }); }
  async function initialize() {
    if (isPrivacyPage) return;
    if (initialPath === '/access') { const token = new URLSearchParams(location.search).get('token'); if (!token) { view = 'invalid-link'; return; } view = 'magic-loading'; try { await exchangeMagicLink(token); const next = sessionStorage.getItem('portal-next') || '/dashboard'; sessionStorage.removeItem('portal-next'); location.replace(next); } catch (cause) { view = cause instanceof ApiError && cause.status === 401 ? 'invalid-link' : (!navigator.onLine ? 'magic-offline' : 'magic-error'); } return; }
    if (initialPath === '/portal') { const next = new URLSearchParams(location.search).get('next'); if (next?.startsWith('/')) sessionStorage.setItem('portal-next', next); try { await getSession(); location.replace(next?.startsWith('/') ? next : '/dashboard'); } catch (cause) { view = cause instanceof ApiError && cause.status === 401 ? 'login' : 'session-error'; } return; }
    try { await getSession(); await loadApp(); } catch (cause) { cause instanceof ApiError && cause.status === 401 ? unauthorized() : view = 'session-error'; }
  }
  onMount(() => { const auth = () => unauthorized(); const pop = () => changeFilters(filtersFromUrl(), false); addEventListener('app:unauthorized', auth); addEventListener('popstate', pop); initialize(); return () => { removeEventListener('app:unauthorized', auth); removeEventListener('popstate', pop); }; });
</script>
{#if view === 'privacy'}<PrivacyPolicy />
{:else if view === 'login'}<Auth />
{:else if view === 'dashboard'}<Home {sections} {taxonomy} {taxonomyError} {selectedMonth} {filters} {destination} onMonthChange={changeMonth} onFiltersChange={changeFilters} refreshSummary={loadSummary} refreshExpenses={loadExpenses} refreshAccounts={loadAccounts} refreshEnrichment={loadEnrichment} refreshBudgets={loadBudgets} onExpired={unauthorized} onLogout={() => location.replace('/portal?message=' + encodeURIComponent('You’ve been signed out.'))} />
{:else if view === 'invalid-link'}<main class="center-page expired" role="alert"><span class="brand-orb">!</span><h1>This sign-in link is invalid, expired, or has already been used.</h1><a class="center-action" href="/portal">Request a new link</a></main>
{:else if view === 'magic-offline' || view === 'magic-error'}<main class="center-page expired" role="alert"><span class="brand-orb">↻</span><h1>{view === 'magic-offline' ? 'You appear to be offline.' : 'We couldn’t sign you in right now.'}</h1><button class="center-action" on:click={initialize}>Try again</button></main>
{:else if view === 'session-error'}<main class="center-page expired" role="alert"><span class="brand-orb">↻</span><h1>We couldn’t connect to your portal.</h1><button class="center-action" on:click={initialize}>Try again</button></main>
{:else}<main class="center-page" aria-live="polite"><span class="brand-orb">₹</span><span class="spinner"></span><h1>{view === 'magic-loading' ? 'Signing you in securely…' : 'Checking your secure session…'}</h1></main>{/if}

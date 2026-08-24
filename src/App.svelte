<script>
  import { onMount } from 'svelte';
  import Home from './Home.svelte';
  import PrivacyPolicy from './PrivacyPolicy.svelte';
  import { ApiError, exchangeMagicLink, getDashboard, getExpenseTaxonomy } from './lib/api.js';

  const isPrivacyPage = window.location.pathname === '/privacy-policy';
  let auth = 'checking';
  let dashboard = 'loading';
  let data = null;
  let taxonomy = null;
  let taxonomyError = '';
  let error = '';
  let selectedMonth = new Date().toISOString().slice(0, 7);

  async function loadDashboard(month = selectedMonth, { retain = false } = {}) {
    selectedMonth = month; dashboard = 'loading'; error = '';
    if (!retain) data = null;
    try {
      data = await getDashboard(month);
      const count = Number(data?.summary?.transactionCount ?? data?.transactionCount ?? data?.recentExpenses?.items?.length ?? 0);
      dashboard = count === 0 ? 'empty' : 'ready';
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) auth = 'expired';
      else { dashboard = 'error'; error = cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'; }
    }
  }

  async function initialize() {
    const token = new URLSearchParams(window.location.search).get('token');
    try {
      if (token) await exchangeMagicLink(token);
      auth = 'authenticated';
    } catch (cause) {
      auth = 'expired';
      return;
    }

    const taxonomyRequest = getExpenseTaxonomy()
      .then((value) => { taxonomy = value; })
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 401) auth = 'expired';
        else taxonomyError = cause instanceof Error ? cause.message : 'Unable to load categories.';
      });
    await Promise.all([loadDashboard(selectedMonth), taxonomyRequest]);
  }

  onMount(() => { if (!isPrivacyPage) initialize(); });
</script>

{#if isPrivacyPage}
  <PrivacyPolicy />
{:else if auth === 'checking'}
  <main class="center-page" aria-live="polite">
    <span class="brand-orb" aria-hidden="true">₹</span><span class="spinner" aria-hidden="true"></span>
    <h1>Opening your dashboard…</h1><p>Securing your private expense overview.</p>
  </main>
{:else if auth === 'expired'}
  <main class="center-page expired" role="alert">
    <span class="brand-orb" aria-hidden="true">↗</span><p class="eyebrow">Access link</p>
    <h1>This link has expired or was already used.</h1>
    <p>Send <strong>“show my link”</strong> on WhatsApp to receive a new one.</p>
  </main>
{:else}
  <Home {data} {dashboard} {error} {taxonomy} {taxonomyError} {selectedMonth} onMonthChange={(month) => loadDashboard(month)} onRefresh={() => loadDashboard(selectedMonth, { retain: true })} onExpired={() => auth = 'expired'} />
{/if}

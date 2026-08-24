<script>
  import { onMount } from 'svelte';
  import Home from './Home.svelte';
  import PrivacyPolicy from './PrivacyPolicy.svelte';
  import { exchangeMagicLink, getMonthlyExpenses } from './lib/api.js';

  let loading = true;
  let expenses = null;
  let error = '';
  const isPrivacyPage = window.location.pathname === '/privacy-policy';

  async function initializeDashboard(month) {
    loading = true;
    error = '';
    try {
      const token = new URLSearchParams(window.location.search).get('token');
      if (token) await exchangeMagicLink(token);
      expenses = await getMonthlyExpenses(month);
    } catch (cause) {
      expenses = null;
      error = cause instanceof Error ? cause.message : 'Something went wrong.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (!isPrivacyPage) initializeDashboard();
  });
</script>

{#if isPrivacyPage}
  <PrivacyPolicy />
{:else}
  <header class="site-header">
    <a class="brand" href="/" aria-label="Voice Expense home">
      <span class="brand-mark" aria-hidden="true">✓</span>
      <span><strong>Voice Expense</strong><small>Monthly spending overview</small></span>
    </a>
  </header>

  <main>
    {#if loading}
      <section class="state-card" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <h1>Loading your expenses…</h1>
        <p>Securely connecting to your account.</p>
      </section>
    {:else if error}
      <section class="state-card error" role="alert">
        <span class="state-icon" aria-hidden="true">!</span>
        <h1>We couldn’t open your dashboard</h1>
        <p>{error}</p>
        <p class="hint">Open the latest access link sent to you on WhatsApp.</p>
      </section>
    {:else if expenses}
      <Home {expenses} onMonthChange={initializeDashboard} />
    {/if}
  </main>
{/if}

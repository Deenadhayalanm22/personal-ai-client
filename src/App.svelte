<script>
  import { onMount } from 'svelte';
  import Home from './Home.svelte'; import Auth from './Auth.svelte'; import PrivacyPolicy from './PrivacyPolicy.svelte';
  import { ApiError, exchangeMagicLink, getSession, getExpenseCalendar } from './lib/api.js';
  const initialPath = location.pathname.replace(/\/$/, '') || '/', isPrivacyPage = initialPath === '/privacy-policy', currentMonth = new Date().toISOString().slice(0, 7);
  let view = isPrivacyPage ? 'privacy' : 'checking', selectedMonth = monthFromUrl(), calendarSection = state();
  function state() { return { status: 'loading', data: null, error: '' }; }
  function monthFromUrl() { const value = new URLSearchParams(location.search).get('month'); return /^\d{4}-\d{2}$/.test(value || '') ? value : currentMonth; }
  function unauthorized() { location.replace(`/portal?next=${encodeURIComponent(location.pathname + location.search)}`); }
  async function loadCalendar() { calendarSection = { ...calendarSection, status: calendarSection.data ? 'refreshing' : 'loading', error: '' }; try { calendarSection = { status: 'ready', data: await getExpenseCalendar(selectedMonth), error: '' }; } catch (cause) { if (!(cause instanceof ApiError && cause.status === 401)) calendarSection = { ...calendarSection, status: 'error', error: cause?.message || 'Something went wrong. Please try again.' }; } }
  async function loadApp() { view = 'dashboard'; await loadCalendar(); }
  function changeMonth(month, updateHistory = true) { selectedMonth = month; if (updateHistory) history.pushState({}, '', `/dashboard?month=${encodeURIComponent(month)}`); loadCalendar(); }
  async function initialize() {
    if (isPrivacyPage) return;
    if (initialPath === '/access') { const token = new URLSearchParams(location.search).get('token'); if (!token) { view = 'invalid-link'; return; } view = 'magic-loading'; try { await exchangeMagicLink(token); const next = sessionStorage.getItem('portal-next') || '/dashboard'; sessionStorage.removeItem('portal-next'); location.replace(next); } catch (cause) { view = cause instanceof ApiError && cause.status === 401 ? 'invalid-link' : (!navigator.onLine ? 'magic-offline' : 'magic-error'); } return; }
    if (initialPath === '/portal') { const next = new URLSearchParams(location.search).get('next'); if (next?.startsWith('/')) sessionStorage.setItem('portal-next', next); try { await getSession(); location.replace(next?.startsWith('/') ? next : '/dashboard'); } catch (cause) { view = cause instanceof ApiError && cause.status === 401 ? 'login' : 'session-error'; } return; }
    try { await getSession(); await loadApp(); } catch (cause) { cause instanceof ApiError && cause.status === 401 ? unauthorized() : view = 'session-error'; }
  }
  onMount(() => { const auth = () => unauthorized(), pop = () => changeMonth(monthFromUrl(), false); addEventListener('app:unauthorized', auth); addEventListener('popstate', pop); initialize(); return () => { removeEventListener('app:unauthorized', auth); removeEventListener('popstate', pop); }; });
</script>
{#if view === 'privacy'}<PrivacyPolicy />
{:else if view === 'login'}<Auth />
{:else if view === 'dashboard'}<Home {calendarSection} {selectedMonth} onMonthChange={changeMonth} refreshCalendar={loadCalendar} onLogout={() => location.replace('/portal?message=' + encodeURIComponent('You’ve been signed out.'))} />
{:else if view === 'invalid-link'}<main class="center-page expired" role="alert"><span class="brand-orb">!</span><h1>This sign-in link is invalid, expired, or has already been used.</h1><a class="center-action" href="/portal">Request a new link</a></main>
{:else if view === 'magic-offline' || view === 'magic-error'}<main class="center-page expired" role="alert"><span class="brand-orb">↻</span><h1>{view === 'magic-offline' ? 'You appear to be offline.' : 'We couldn’t sign you in right now.'}</h1><button class="center-action" on:click={initialize}>Try again</button></main>
{:else if view === 'session-error'}<main class="center-page expired" role="alert"><span class="brand-orb">↻</span><h1>We couldn’t connect to your portal.</h1><button class="center-action" on:click={initialize}>Try again</button></main>
{:else}<main class="center-page" aria-live="polite"><span class="brand-orb">₹</span><span class="spinner"></span><h1>{view === 'magic-loading' ? 'Signing you in securely…' : 'Checking your secure session…'}</h1></main>{/if}

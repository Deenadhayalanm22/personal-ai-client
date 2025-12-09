<script>
  import { onMount } from 'svelte';
  import Home from './Home.svelte';
  // accessor object for two-way binding to the recorder's `text` property
  const textAccessor = {
    get: () => (recorderRef ? recorderRef.text : ''),
    set: (v) => { if (recorderRef) recorderRef.text = v; }
  };
  function safeSend() { return null; }
</script>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
    background: #0f1724;
    color: #eef2ff;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
    position: sticky;
    top: 0;
    z-index: 40;
    backdrop-filter: blur(6px);
  }

  .brand {
    display:flex;
    gap:.6rem;
    align-items:center;
  }

  .brand h1 {
    margin:0;
    font-size:1.1rem;
    letter-spacing: -0.4px;
  }

  /* removed top navigation - showing summary + recorder in layout */

  main {
    max-width: 1100px;
    margin: 1.25rem auto;
    padding: 0 1rem;
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 1rem;
    align-items: start;
  }

  @media (max-width: 980px) {
    .layout { grid-template-columns: 1fr; }
  }

  /* small screen tweaks */
  @media (max-width:600px) {
    header {
      flex-direction: column;
      gap: 0.6rem;
      align-items: flex-start;
    }
    .brand h1 { font-size: 1rem; }
  }
</style>

<header>
  <div class="brand">
  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#667eea"/><path d="M7 14l3 3 7-9" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div>
      <h1 style="font-size:1.25rem; margin:0">Voice Expense AI</h1>
      <div style="font-size:.85rem; color:#9aa3d6">Auto summary + quick record</div>
    </div>
  </div>
</header>

<main>
  <Home />
</main>
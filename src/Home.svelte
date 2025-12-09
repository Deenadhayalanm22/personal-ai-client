<script>
  import { onMount } from 'svelte';
  import { getExpenseSummary, deleteTransaction } from './lib/api.js';
  import FloatingRecorder from './FloatingRecorder.svelte';
  import ChatDrawer from './components/ChatDrawer.svelte';

  let recent = [];
  let today = null;
  let monthly = null;
  let drawerVisible = false;
  let recorderRef;
  let sttText = '';

  async function loadAll(){
    const s = await getExpenseSummary();
    today = { total: s.todayTotal, biggestCategory: Object.keys(s.categoryTotals || {})[0] || '—' };
    monthly = { total: s.monthTotal };
    recent = s.recentTransactions || [];
  }

  onMount(()=>{ loadAll(); });

  function openDrawer(){ drawerVisible = true; }
  function closeDrawer(){ drawerVisible = false; }

  async function handleDelete(id){
    const ok = await deleteTransaction(id);
    if (ok) { recent = recent.filter(r => r.id !== id); }
  }
</script>

<style>
  .home { max-width:1100px; margin:1rem auto; padding: 0 1rem; color:#eef2ff }
  .top { display:flex; gap:2rem; align-items:flex-start }
  .left { flex:1 }
  .right { width:360px }
  .section { padding:.6rem 0 }
  .small { color:#9aa3d6; font-size:.9rem }
  .recent-item { display:flex; justify-content:space-between; gap:.6rem; padding:.4rem 0; border-bottom:1px solid rgba(255,255,255,0.02) }
  .muted { color:#9aa3d6 }
  .fab-wrap { position:fixed; right:18px; bottom:18px }
</style>

<div class="home">
  <div class="top">
    <div class="left">
      <div class="section">
        <div class="small">Daily summary</div>
        <div style="font-weight:700; font-size:1.25rem">{today ? today.total : '—'}</div>
        <div class="muted">Biggest: {today ? today.biggestCategory : '—'}</div>
      </div>

      <div class="section">
        <div class="small">Monthly summary</div>
        <div style="font-weight:700; font-size:1.25rem">{monthly ? monthly.total : '—'}</div>
        <div class="muted">{monthly ? 'Last 30 days' : ''}</div>
      </div>

      <div class="section">
        <div class="small">Recent transactions</div>
        {#if recent && recent.length}
          {#each recent.slice(0,5) as r}
            <div class="recent-item">
              <div>
                <div style="font-weight:700">{r.category} {r.subcategory ? '· ' + r.subcategory : ''}</div>
                <div class="muted">{r.merchantName || ''}</div>
              </div>
              <div class="muted">{r.amount}</div>
              <div class="muted">{new Date(r.spentAt).toLocaleTimeString()}</div>
              <div>
                <button on:click={()=>{/* edit placeholder */}}>edit</button>
                <button on:click={()=> handleDelete(r.id)}>delete</button>
              </div>
            </div>
          {/each}
        {:else}
          <div class="muted">No recent transactions</div>
        {/if}
      </div>
    </div>

    <div class="right">
      <!-- right column kept minimal; drawer will overlay when opened -->
      <div style="height:10px"></div>
    </div>
  </div>

  <div class="fab-wrap">
    <FloatingRecorder bind:this={recorderRef} on:activate={() => { openDrawer(); }} />
  </div>

  <ChatDrawer visible={drawerVisible} text={sttText} updateText={(v)=> sttText = v} on:close={closeDrawer} on:saved={() => { loadAll(); }} />
</div>

<script>
  import { onMount } from 'svelte';
  let loading = false;
  let error = '';
  let summary = null;
  let chartData = [];

  function polarToCartesian(cx, cy, r, angleRad) {
    return {
      x: cx + r * Math.cos(angleRad - Math.PI / 2),
      y: cy + r * Math.sin(angleRad - Math.PI / 2)
    };
  }

  function buildChart(data) {
    const entries = Object.entries(data || {});
    const total = entries.reduce((s, [, v]) => s + Number(v || 0), 0);
    if (total === 0) return [];

    let start = 0;
    const cx = 100, cy = 100, rOuter = 80, rInner = 44;
    return entries.map(([cat, val], i) => {
      const amount = Number(val || 0);
      const portion = amount / total;
      const angle = portion * Math.PI * 2;
      const end = start + angle;
      const largeArc = angle > Math.PI ? 1 : 0;

      const outerStart = polarToCartesian(cx, cy, rOuter, start);
      const outerEnd = polarToCartesian(cx, cy, rOuter, end);
      const innerStart = polarToCartesian(cx, cy, rInner, end);
      const innerEnd = polarToCartesian(cx, cy, rInner, start);

      const path = `M ${outerStart.x} ${outerStart.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerStart.x} ${innerStart.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y} Z`;

      // color palette (distinct hues)
      const hue = (i * 55) % 360;
      const color = `hsl(${hue} 75% 60%)`;

      const percent = Math.round(portion * 1000) / 10; // one decimal
      start = end;
      return { cat, amount, path, color, percent };
    });
  }

  async function loadSummary() {
    loading = true;
    error = '';
    try {
      import('./lib/api.js').then(m => m.getCurrentMonthSummary()).catch(()=>null);
      const res = await (await import('./lib/api.js')).getCurrentMonthSummary();
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
  summary = await res.json();
  chartData = buildChart(summary);
    } catch (err) {
      console.error('Summary fetch error', err);
      error = 'Failed to load summary: ' + (err.message || '');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadSummary();
  });
</script>

<style>
  .wrap {
    padding: 0.6rem;
    background: transparent;
    border-radius: 8px;
  }

  /* keep single-column summary styling (chart + tiles) */

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: .8rem;
    margin-top: .8rem;
  }

  .tile {
    padding: .8rem;
    border-radius: 8px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.04);
  }

  .tile .cat { font-weight:700; color: #e6ecff; }
  .tile .amt { margin-top:.4rem; font-size:1.05rem; color: #baf0bd; font-weight:800; }
  .msg { padding:.6rem; border-radius:8px; margin-top:.5rem; font-weight:600; }
  .msg.error { background: rgba(245,87,108,0.12); color: #ffb4b4; }
</style>

<section class="wrap">
  <h2 style="margin:0 0 .6rem 0">Current Month</h2>

  {#if loading}
    <div class="msg" style="background: rgba(255,255,255,0.02)">Loading...</div>
  {:else if error}
    <div class="msg error">{error}</div>
  {:else if summary}
    <div style="display:flex; gap:1rem; align-items:flex-start; flex-wrap:wrap">
      <div style="flex:0 0 220px; display:flex; flex-direction:column; align-items:center; gap:.6rem;">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <g>
            {#each chartData as slice}
              <path d={slice.path} fill={slice.color} stroke="#0f1724" stroke-width="0.5"></path>
            {/each}
          </g>
          <!-- center label -->
          <circle cx="100" cy="100" r="34" fill="#0f1724"></circle>
          <text x="100" y="98" text-anchor="middle" fill="#fff" font-size="12">Total</text>
          <text x="100" y="116" text-anchor="middle" fill="#baf0bd" font-size="14" font-weight="700">{Object.values(summary).reduce((s,v)=>s+Number(v||0),0)}</text>
        </svg>

  <!-- legend -->
  <div style="width:100%;">
          {#each chartData as slice}
            <div style="display:flex; justify-content:space-between; gap:.6rem; padding:.25rem 0; align-items:center;">
              <div style="display:flex; gap:.6rem; align-items:center;">
                <div style="width:12px; height:12px; background:{slice.color}; border-radius:3px;"></div>
                <div style="font-size:.95rem">{slice.cat}</div>
              </div>
              <div style="font-weight:700">{slice.percent}%</div>
            </div>
          {/each}
        </div>
  </div>

  <div style="flex:1">
        <div class="grid" role="list">
          {#each Object.entries(summary) as [category, total]}
            <div class="tile" role="listitem">
              <div class="cat">{category}</div>
              <div class="amt">{total}</div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="msg" style="background: rgba(255,255,255,0.02)">No data for this month yet.</div>
  {/if}
</section>
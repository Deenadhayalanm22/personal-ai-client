<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  // Local state (previously removed during STT refactor). Keep defaults so template bindings don't throw.
  let visible = false;
  let dragging = false;
  let dragTranslate = 0;
  let error = '';
  let success = '';

  // No-op press handlers: the FAB no longer performs long-press or drag logic, but handlers are kept to avoid
  // runtime errors when touch/mouse events wire to non-existent functions.
  function startPress() {
    /* intentionally empty */
  }
  function endPress() {
    /* intentionally empty */
  }
  function cancelPress() {
    /* intentionally empty */
  }

  function togglePanel() {
    // notify parent that FAB was activated; parent (App/Home) will open the chat drawer
    dispatch('activate');
  }

  function closePanel() {
    visible = false;
    dragging = false;
    dragTranslate = 0;
    error = '';
    success = '';
  }

  // Note: STT was removed by user request; FloatingRecorder is intentionally minimal.
</script>

<style>
  .floating {
    position: fixed;
    right: 18px;
    bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    z-index: 3000;
  }

  .fab {
    width:62px; height:62px; border-radius:50%; border:none; cursor:pointer;
    background: linear-gradient(90deg,#667eea,#764ba2); color:white; font-size:26px;
    box-shadow: 0 12px 30px rgba(38,44,77,0.45);
    display:flex; align-items:center; justify-content:center; padding:0; line-height:1; text-align:center;
    -webkit-tap-highlight-color: transparent;
    z-index: 3001;
  }

  .panel {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    background: linear-gradient(180deg, rgba(10,10,12,0.98), rgba(8,8,10,0.99));
    border-top-left-radius: 12px; border-top-right-radius: 12px;
    padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -12px 40px rgba(2,6,23,0.6);
    transform: translateY(0);
    z-index: 2000;
    box-sizing: border-box;
    max-height: calc(100vh - 120px);
    overflow: auto;
  }

  .panel.hidden { transform: translateY(120%); }

  .panel-inner { max-width:900px; margin: 0 auto; display:flex; gap:1rem; align-items:flex-start; flex-wrap:wrap; }

  .panel-left { display:flex; flex-direction:column; align-items:center; gap:.6rem; width:140px; }
  .panel-mid { flex:1; }

  .close-inline {
    background: transparent; color: #fff; border: none; font-size:18px; cursor: pointer;
    padding:6px 10px; border-radius:8px; touch-action: manipulation;
    display:inline-flex; align-items:center; justify-content:center; margin-left:8px;
  }

  .capture { padding:.6rem 1rem; border-radius:10px; background: linear-gradient(90deg,#ff7eb3,#65d6ff); border:none; color:#fff; font-weight:700; }
  .send { padding:.5rem .9rem; border-radius:10px; background:#667eea; color:#fff; border:none; font-weight:700; }

  textarea { width:100%; min-height:100px; padding:.6rem; border-radius:8px; border:1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); color:#eef2ff; }

  .meta { color:#9aa3d6; font-size:.9rem; margin-top:.4rem }
</style>

<!-- Floating action button -->
<div class="floating">
  <button
    class="fab"
    on:touchstart|preventDefault={startPress}
    on:touchend={endPress}
    on:mousedown={startPress}
    on:mouseup={endPress}
    on:mouseleave={cancelPress}
    on:click={togglePanel}
    
    aria-expanded={visible}
  >{visible ? '✕' : '+'}</button>
  <!-- FAB no longer opens a floating panel; it dispatches `activate` for the app to handle (e.g. start recording)
       The persistent chat will be shown in the right column of the app layout. -->
</div>

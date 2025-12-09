<script>
  export let messages = [];
  export let scrollToBottomTrigger = 0;
  import { onMount, afterUpdate } from 'svelte';
  let container;
  function formatTime(ts){ try { return new Date(ts).toLocaleTimeString(); } catch(e){ return ''; } }

  // auto-scroll on new messages
  afterUpdate(() => {
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  });
</script>

<style>
  .chat { max-height: 40vh; min-height: 160px; overflow:auto; padding: .75rem; display:flex; flex-direction:column; gap:.6rem; }
  .bubble { max-width:75%; padding:.6rem .8rem; border-radius:12px; box-shadow: 0 6px 18px rgba(0,0,0,0.45); }
  .user { align-self:flex-end; background: linear-gradient(90deg,#4f46e5,#8b5cf6); color:white; border-bottom-right-radius:4px; }
  .assistant { align-self:flex-start; background: rgba(255,255,255,0.04); color:#e6eefc; border-bottom-left-radius:4px; }
  .meta { font-size:.75rem; color:#9aa3d6; margin-top:.25rem }
  .followup { border: 1px dashed rgba(255,255,255,0.06); }
  .success { background: linear-gradient(90deg,#16a34a,#34d399); color:#042b0f }
  .error { background: linear-gradient(90deg,#ff6b6b,#ffb4b4); color:#2b0a0a }
</style>

<div bind:this={container} class="chat" role="log" aria-live="polite">
  {#each messages as m}
    <div class="message">
      <div class="bubble {m.role === 'user' ? 'user' : 'assistant'} {m.type === 'followup' ? 'followup' : ''} {m.type === 'success' ? 'success' : ''} {m.type === 'error' ? 'error' : ''}">
        <div>{m.text}</div>
        <div class="meta">{m.role} · {formatTime(m.ts || Date.now())}</div>
      </div>
    </div>
  {/each}
</div>

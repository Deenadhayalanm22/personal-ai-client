<script>
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import ChatBubble from './ChatBubble.svelte';
  import { processSpeech } from '../lib/api.js';
  export let visible = false;
  export let text = '';
  export let updateText = (v) => { text = v; };
  // no STT toggle in typing-only mode
  export let processFn = null; // optional override
  const dispatch = createEventDispatcher();

  let messages = [];
  let pending = false;
  let container;

  function push(role, txt, type='normal'){
    messages = [...messages, { role, text: txt, type, ts: Date.now() }];
  }

  afterUpdate(()=>{
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  });

  async function handleSend(){
    if (!text || !text.trim()) return;
    const userText = text.trim();
    push('user', userText, 'normal');
    pending = true;
    updateText('');

    try {
      const resp = processFn ? await processFn(userText) : await processSpeech(userText, 'demo-user');
      const result = resp && resp.data ? resp.data : { status: resp && resp.status===200 ? 'SUCCESS' : 'INVALID' };
      if (result.status === 'FOLLOWUP'){
        push('assistant', result.message || 'Follow up', 'followup');
        // keep open
      } else if (result.status === 'SUCCESS'){
        push('assistant', result.message || 'Saved', 'success');
        // notify parent to refresh recent list
        dispatch('saved', { saved: result.saved || null });
        // close after short delay
        setTimeout(()=> { visible = false; dispatch('close'); }, 900);
      } else {
        push('assistant', result.message || 'Invalid', 'error');
      }
    } catch (e){
      push('assistant', 'Network error', 'error');
    } finally { pending = false; }
  }
</script>

<style>
  /* Positioned to the bottom-right as a floating drawer so the main summaries remain visible.
    Semi-transparent background with a slight blur keeps the page readable behind. */
  .drawer { position: fixed; right: 18px; bottom: 18px; width: min(440px, 92%); height: 55vh; background: rgba(8,8,10,0.72); backdrop-filter: blur(6px); border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.55); display:flex; flex-direction:column; }
  .header { padding:.6rem .8rem; display:flex; align-items:center; justify-content:space-between; color:#e6eefc }
  .messages { padding:.6rem; overflow:auto; display:flex; flex-direction:column; gap:.5rem; flex:1 1 auto; }
  .composer { padding:.6rem; display:flex; gap:.5rem; align-items:center; border-top:1px solid rgba(255,255,255,0.03); }
  textarea { flex:1; padding:.5rem; border-radius:10px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.02); color:#eef2ff }
  .send { padding:.45rem .8rem; border-radius:8px; background:#667eea; color:#fff; border:none }
</style>

{#if visible}
  <div class="drawer" role="dialog" aria-modal="true" tabindex="0">
    <div class="header">
      <div style="font-weight:700">Assistant</div>
      <div style="display:flex; gap:.6rem; align-items:center">
        <button aria-label="Close" on:click={() => { visible = false; dispatch('close'); }} style="background:transparent; border:none; color:#e6eefc">✕</button>
      </div>
    </div>
    <div class="messages" bind:this={container}>
      {#each messages as m}
        <ChatBubble role={m.role} text={m.text} type={m.type} ts={m.ts} />
      {/each}
    </div>
    <div class="composer">
      <textarea value={text} on:input={(e)=> updateText(e.target.value)} rows="2"></textarea>
      <button class="send" on:click={handleSend} disabled={pending}>{pending ? '...' : 'Send'}</button>
    </div>
  </div>
{/if}

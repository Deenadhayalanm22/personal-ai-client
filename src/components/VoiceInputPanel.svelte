<script>
  import ChatBox from './ChatBox.svelte';
  import { processSpeech } from '../lib/api.js';
  import { createEventDispatcher, onMount } from 'svelte';
  export let text = '';
  export let updateText = (v) => { text = v; };
  export let toggleRecording; // function passed from FloatingRecorder
  export let sendToBackend; // function passed from FloatingRecorder
  export let bindVisible = true; // optional binding
  const dispatch = createEventDispatcher();

  let messages = [];
  let pending = false;
  let lastResponse = null;
  let scrollTrigger = 0;

  function pushMessage(role, textVal, type='normal'){
    messages = [...messages, { role, text: textVal, type, ts: Date.now() }];
    scrollTrigger += 1;
  }

  async function handleSend(){
    if (!text || !text.trim()) return;
    const userText = text.trim();
    pushMessage('user', userText, 'normal');
    pending = true;
    // call the shared sendToBackend if provided (the FloatingRecorder's sendToBackend) else call API directly
    try {
      let result;
      if (sendToBackend) {
        // sendToBackend is expected to behave like the existing function: it will POST and reset text accordingly
        // but we need the backend JSON structure of status
        // We'll call processSpeech too for reliable result shape
        const resp = await processSpeech(userText, 'demo-user');
        result = resp.data || { status: resp.status === 200 ? 'SUCCESS' : 'INVALID' };
      } else {
        const resp = await processSpeech(userText, 'demo-user');
        result = resp.data || { status: resp.status === 200 ? 'SUCCESS' : 'INVALID' };
      }

      lastResponse = result;
      // handle response statuses
      if (result.status === 'FOLLOWUP'){
        pushMessage('assistant', result.message || 'Follow up question', 'followup');
        // keep conversation open
      } else if (result.status === 'SUCCESS'){
        pushMessage('assistant', result.message || 'Saved successfully', 'success');
        if (result.saved) pushMessage('assistant', JSON.stringify(result.saved), 'normal');
        // reset composer
        text = '';
        // if FloatingRecorder.sendToBackend exists, call it to maintain the same side-effects
        try { sendToBackend && sendToBackend(); } catch(e){}
      } else {
        pushMessage('assistant', result.message || 'There was an issue', 'error');
      }

    } catch (err){
      pushMessage('assistant', 'Network error: ' + (err.message||''), 'error');
    } finally {
      pending = false;
    }
  }

  // make keyboard send on Enter+Meta
  function onKeydown(e){ if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } }
</script>

<style>
  /* Inline panel suitable for placement inside the right column / aside
     Previously this component used fixed positioning (overlay). When embedded
     in the layout we want it to behave like a normal block so charts and recent
     lists remain visible. */
  .panel-wrap { position: relative; display:flex; justify-content:center; width:100%; }
  .panel { width: 100%; background: linear-gradient(180deg, rgba(10,10,12,0.98), rgba(8,8,10,0.99)); border-radius:12px; padding: .6rem; box-shadow: 0 -6px 30px rgba(2,6,23,0.4); display:flex; flex-direction:column; gap:.6rem; box-sizing: border-box; }
  .composer { display:flex; gap:.5rem; align-items:center; padding:.5rem; }
  .input { flex:1 }
  .send { padding:.45rem .8rem; background:#667eea; color:#fff; border:none; border-radius:8px; }
  .record { padding:.45rem .6rem; background:linear-gradient(90deg,#667eea,#764ba2); color:#fff; border:none; border-radius:8px; }
</style>

<div class="panel-wrap">
  <div class="panel">
    <ChatBox {messages} scrollToBottomTrigger={scrollTrigger} />

    <div class="composer">
      <div class="input">
          <textarea value={text} on:input={(e) => updateText(e.target.value)} placeholder="Speak or type..." rows="2" on:keydown={onKeydown}></textarea>
        </div>
      <button class="record" on:click={() => toggleRecording && toggleRecording()}>🎙</button>
      <button class="send" on:click={handleSend} disabled={pending}>{pending ? 'Sending...' : 'Send'}</button>
    </div>
  </div>
</div>

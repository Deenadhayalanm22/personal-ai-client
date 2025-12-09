<script>
  import { onMount, createEventDispatcher } from 'svelte';

  let visible = false;
  let recording = false;
  export let text = '';
  let interimText = '';
  let currentSessionText = '';
  let baseTextBeforeSession = '';
  let recognition;
  let loading = false;
  let error = '';
  let success = '';
  let saved = null;
  const dispatch = createEventDispatcher();

  // drag-to-close state
  let dragging = false;
  let dragStartY = 0;
  let dragTranslate = 0; // pixels
  const DRAG_CLOSE_THRESHOLD = 120; // pixels to drag down to close

  // gesture helpers
  let pressTimer = null;
  let lastTap = 0;

  import { processSpeech } from './lib/api.js';

  onMount(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) currentSessionText += transcript + ' ';
        else interim += transcript;
      }
      interimText = interim;
      const prefix = baseTextBeforeSession ? baseTextBeforeSession.trim() + ' ' : '';
      text = (prefix + currentSessionText + (interimText ? interimText : '')).trim();
    };

    recognition.onend = () => {
      recording = false;
      const prefix = baseTextBeforeSession ? baseTextBeforeSession.trim() + ' ' : '';
      text = (prefix + currentSessionText + (interimText ? interimText : '')).trim();
      currentSessionText = '';
      interimText = '';
      baseTextBeforeSession = '';
    };

    recognition.onerror = (e) => {
      recording = false;
      error = 'Speech recognition error: ' + (e.error || 'unknown');
    };
  });

  function togglePanel() {
    // notify parent (App) that FAB was activated; App will call recorderRef.toggleRecording()
    try { dispatch('activate'); } catch (e) {}
    error = '';
    success = '';
  }

  function closePanel() {
    visible = false;
    dragging = false;
    dragTranslate = 0;
    error = '';
    success = '';
  }

  function onPointerDown(e) {
    // only start drag if pointer is on panel area and visible
    if (!visible) return;
    dragging = true;
    dragStartY = (e.touches ? e.touches[0].clientY : e.clientY);
    dragTranslate = 0;
    // capture pointer for mouse events
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch(e){}
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    dragTranslate = Math.max(0, y - dragStartY);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    // close if dragged enough
    if (dragTranslate > DRAG_CLOSE_THRESHOLD) {
      visible = false;
      dragTranslate = 0;
    } else {
      // snap back
      dragTranslate = 0;
    }
    try { e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); } catch(e){}
  }

  // exported for external panels to call (do not change internal STT behavior)
  export function toggleRecording() {
    error = '';
    success = '';
    if (!recognition) { error = 'Speech recognition not supported in this browser.'; return; }
    if (recording) { recognition.stop(); recording = false; return; }
    baseTextBeforeSession = text || '';
    currentSessionText = '';
    interimText = '';
    try { recognition.start(); recording = true; } catch (e) { error = 'Could not start recognition'; }
  }

  function ensurePanelOpen() {
    if (!visible) visible = true;
  }

  function startPress(event) {
    // start a long-press timer (400ms)
    // also detect double-tap via timestamp
    const now = Date.now();
    if (now - lastTap < 300) {
      // treat as double tap
      handleDoubleTap();
      lastTap = 0;
      return;
    }
    lastTap = now;

    pressTimer = setTimeout(() => {
      // long-press detected
      ensurePanelOpen();
      toggleRecording();
      pressTimer = null;
    }, 400);
  }

  function endPress() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  }

  function cancelPress() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }

  function handleDoubleTap() {
    ensurePanelOpen();
    toggleRecording();
  }

  // exported so VoiceInputPanel can trigger the same send flow
  export async function sendToBackend() {
    if (!text || !text.trim()) { error = 'Nothing to send'; return null; }
    loading = true; error = ''; success = ''; saved = null;
    try {
      const resp = await processSpeech(text.trim(), 'demo-user');
      // resp: { ok, status, data }
      const result = resp && resp.data ? resp.data : { status: resp && resp.status === 200 ? 'SUCCESS' : 'INVALID' };
      // dispatch an event so parent can react
      try { dispatch('processed', { result }); } catch (e) {}
      // do not reload the page here; let the caller manage UI
      return result;
    } catch (err) {
      error = 'Failed to process: ' + (err.message || '');
      return { status: 'INVALID', message: error };
    } finally { loading = false; setTimeout(()=> success = '', 3000); }
  }
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
    on:dblclick|preventDefault={handleDoubleTap}
    aria-expanded={visible}
  >{visible ? '✕' : '🎤'}</button>
  <!-- FAB no longer opens a floating panel; it dispatches `activate` for the app to handle (e.g. start recording)
       The persistent chat will be shown in the right column of the app layout. -->
</div>

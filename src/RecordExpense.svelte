<script>
  import { onMount } from 'svelte';
  import { postExpense } from './lib/api.js';
  import ExpenseCard from './ExpenseCard.svelte';

  // transcription text bound to textarea
  let text = '';
  let loading = false;
  let error = '';
  let success = '';
  let saved = null; // server returned expense object

  // STT state
  let listening = false;
  let interimText = '';
  let currentSessionText = '';
  let baseTextBeforeSession = '';
  let recognition;


  onMount(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // feature not available; keep the UI functional (paste)
      console.warn('SpeechRecognition not supported in this browser');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let interim = '';
      // accumulate final results for this session
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) {
          currentSessionText += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      interimText = interim;

      // live-update the textarea value combining base + session + interim
      const prefix = baseTextBeforeSession ? baseTextBeforeSession.trim() + ' ' : '';
      text = (prefix + currentSessionText + (interimText ? interimText : '')).trim();
    };

    recognition.onend = () => {
      listening = false;
      // finalize session: ensure textarea contains finalized session text
      const prefix = baseTextBeforeSession ? baseTextBeforeSession.trim() + ' ' : '';
      text = (prefix + currentSessionText + (interimText ? interimText : '')).trim();
      // clear session holders (keep text visible)
      currentSessionText = '';
      interimText = '';
      baseTextBeforeSession = '';
    };

    recognition.onerror = (e) => {
      console.error('Speech recognition error', e);
      error = 'Speech recognition error: ' + (e.error || 'unknown');
      listening = false;
    };
  });

  function toggleRecording() {
    error = '';
    success = '';
    if (!recognition) {
      error = 'Speech recognition not available in this browser.';
      return;
    }

    if (listening) {
      recognition.stop();
      listening = false;
      return;
    }

    // start new session
    baseTextBeforeSession = text || '';
    currentSessionText = '';
    interimText = '';
    try {
      recognition.start();
      listening = true;
    } catch (err) {
      console.error('start error', err);
      error = 'Could not start recognition';
      listening = false;
    }
  }

  async function saveExpense() {
    error = '';
    success = '';
    saved = null;

    if (!text || !text.trim()) {
      error = 'Please paste or enter the expense text before saving.';
      return;
    }

    loading = true;
    try {
      const response = await postExpense(text.trim());

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Server returned ${response.status} ${body ? '- ' + body : ''}`);
      }

      // Try to parse JSON, but fall back to plain text if backend returns a string message
      const contentType = response.headers.get('content-type') || '';
      let data = null;
      let textBody = '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        textBody = await response.text();
        // Try to parse JSON in case server sent JSON but without header
        try {
          data = JSON.parse(textBody);
        } catch (e) {
          data = null;
        }
      }

      if (data && typeof data === 'object') {
        saved = data;
        success = 'Expense saved successfully!';
      } else {
        // Backend returned a plain message
        saved = null;
        success = textBody || 'Transaction saved';
      }
    } catch (err) {
      console.error('Save error', err);
      error = 'Failed to save: ' + (err.message || 'Unknown error');
    } finally {
      loading = false;
      if (success) setTimeout(() => success = '', 3000);
    }
  }

  function clearAll() {
    text = '';
    saved = null;
    error = '';
    success = '';
  }
</script>

<style>
  .card {
    background: transparent;
    padding: 1rem;
    border-radius: 10px;
    margin-bottom: 1rem;
  }

  .form {
    display: grid;
    gap: 0.75rem;
  }

  textarea {
    width: 100%;
    min-height: 120px;
    padding: 0.75rem;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
    color: #eef2ff;
    resize: vertical;
    font-size: 0.95rem;
  }

  .rec-row {
    display:flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .mic-panel {
    width: 120px;
    min-height: 120px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-direction:column;
    padding: 0.6rem;
  }

  .mic {
    width:72px; height:72px; border-radius:50%; border:none; cursor:pointer;
    display:inline-flex; align-items:center; justify-content:center;
    background: linear-gradient(90deg,#ff7eb3,#65d6ff); color:#fff;
    box-shadow: 0 8px 22px rgba(0,0,0,0.28);
    font-size:26px;
  }

  .mic.listening { background: linear-gradient(90deg,#f5576c,#f093fb); }

  .mic-status { font-size: .85rem; color: #9aa3d6; margin-top: 0.4rem; }

  .text-panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 0.75rem;
    display:flex;
    flex-direction:column;
    gap: .6rem;
  }

  .actions {
    display:flex;
    gap: .6rem;
    flex-wrap:wrap;
    margin-top: .5rem;
  }

  .btn {
    padding: .6rem 1rem;
    border-radius: 10px;
    cursor:pointer;
    font-weight:700;
    border: none;
  }

  .btn-primary { background: linear-gradient(90deg,#667eea,#764ba2); color: white; }
  .btn-ghost { background: transparent; color: #cbd5ff; border: 1px solid rgba(255,255,255,0.04); }

  .msg { padding: .6rem; border-radius: 8px; margin-top: .5rem; font-weight:600; }
  .msg.error { background: rgba(245,87,108,0.12); color: #ffb4b4; }
  .msg.success { background: rgba(76,209,55,0.08); color: #baf0bd; }

  .saved-wrap { margin-top: 1rem; }
</style>

<section class="card">
  <h2 style="margin:0 0 .6rem 0">Record Expense</h2>

  <div class="form">
    <label style="font-size:.9rem; color:#bfc8ff">Transcription (paste, type or record)</label>
    <div class="rec-row">
      <div style="flex:0 0 120px; display:flex; align-items:center; justify-content:center;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:.5rem;">
          <button type="button" class="mic {listening ? 'listening' : ''}" on:click={toggleRecording} aria-pressed={listening} title={listening ? 'Stop recording' : 'Start recording'}>
            {#if listening}⏹{:else}🎤{/if}
          </button>
          <div class="mic-status">{listening ? 'Listening...' : 'Record'}</div>
        </div>
      </div>

      <div class="text-panel" style="flex:1;">
        <textarea bind:value={text} placeholder='e.g., "Paid ₹350 for lunch at Cafe Blue using card"'></textarea>

        <div class="actions">
          <button class="btn btn-primary" on:click={saveExpense} disabled={loading}>
            {#if loading}Saving...{:else}Save Expense{/if}
          </button>
          <button class="btn btn-ghost" on:click={clearAll} disabled={loading}>Clear</button>
        </div>

        {#if error}
          <div class="msg error" role="alert">{error}</div>
        {/if}
        {#if success}
          <div class="msg success" role="status">{success}</div>
        {/if}
      </div>
    </div>

    {#if error}
      <div class="msg error" role="alert">{error}</div>
    {/if}
    {#if success}
      <div class="msg success" role="status">{success}</div>
    {/if}
  </div>

  {#if saved}
    <div class="saved-wrap">
      <h3 style="margin:.8rem 0 .4rem 0">Saved Expense</h3>
      <ExpenseCard expense={saved} />
    </div>
  {/if}
</section>
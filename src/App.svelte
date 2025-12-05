<script>
  import { onMount } from 'svelte';

  let listening = false;
  let interimText = '';
  let finalText = '';
  let savedTexts = [];
  let loading = false;
  let errorMessage = '';
  let successMessage = '';
  let currentSessionText = ''; // Track text from current recording session

  let recognition;

  onMount(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      errorMessage = "Speech recognition not supported in this browser. Please use Chrome.";
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      console.log('onresult event:', event);
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        console.log(`result[${i}] isFinal=${event.results[i].isFinal} transcript=`, transcript);
        if (event.results[i].isFinal) {
          currentSessionText += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      console.log('currentSessionText (accum):', currentSessionText);
      interimText = interim;
    };

    recognition.onend = () => {
      listening = false;
      console.log('onend fired. currentSessionText:', currentSessionText, 'interimText:', interimText, 'finalText before:', finalText);
      // Add the session text to final text
      if (currentSessionText || interimText) {
        finalText = finalText.trim() + (finalText ? " " : "") + currentSessionText.trim() + (interimText ? " " + interimText.trim() : "");
        finalText = finalText.trim();
        console.log('finalText after finalize:', finalText);
        currentSessionText = '';
        interimText = '';
      }
    };

    recognition.onerror = (event) => {
      listening = false;
      errorMessage = `Speech recognition error: ${event.error}`;
    };
  });

  function startStop() {
    if (!recognition) return;

    errorMessage = '';
    successMessage = '';

    if (listening) {
      console.log('Manual stop requested. finalText before stop:', finalText, 'currentSessionText:', currentSessionText, 'interimText:', interimText);
      recognition.stop();
      listening = false;
    } else {
      // Start new recording session
      currentSessionText = '';
      interimText = '';
      recognition.start();
      listening = true;
    }
  }

  async function sendToBackend() {
    if (!finalText) return;

    loading = true;
    errorMessage = '';
    successMessage = '';

    console.log('Sending to backend. finalText:', finalText);
    try {
      const response = await fetch("https://YOUR-BACKEND-URL/api/voice/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);
      
      savedTexts = [...savedTexts, { text: finalText, timestamp: new Date().toLocaleString() }];
      successMessage = "Transaction saved successfully!";
      
      // Clear the input after successful save
      finalText = '';
      interimText = '';
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        successMessage = '';
      }, 3000);
    } catch (error) {
      errorMessage = `Failed to save: ${error.message}`;
      console.error("Backend error:", error);
    } finally {
      loading = false;
    }
  }

  function clearText() {
    finalText = '';
    interimText = '';
    errorMessage = '';
    successMessage = '';
  }
</script>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: #888;
    font-size: 1rem;
  }

  .recording-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .mic-button {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 3rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mic-button:hover {
    transform: scale(1.05);
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
  }

  .mic-button:active {
    transform: scale(0.95);
  }

  .mic-button.listening {
    animation: pulse 1.5s ease-in-out infinite;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 8px 24px rgba(245, 87, 108, 0.4);
    }
    50% {
      box-shadow: 0 8px 48px rgba(245, 87, 108, 0.8);
    }
  }

  .button-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .status-text {
    font-size: 1.1rem;
    font-weight: 500;
    margin-top: 1rem;
    min-height: 1.5rem;
  }

  .status-text.listening {
    color: #f5576c;
  }

  .text-display {
    background: transparent;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    min-height: 120px;
    border: none;
    text-align: left;
  }

  .text-display h3 {
    font-size: 0.9rem;
    color: #888;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .text-content {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #fff;
    min-height: 60px;
  }

  .interim-text {
    color: #888;
    font-style: italic;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.8rem 2rem;
    border-radius: 12px;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .message {
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    font-weight: 500;
    text-align: center;
  }

  .error {
    background: rgba(245, 87, 108, 0.2);
    color: #ff6b6b;
    border: 1px solid rgba(245, 87, 108, 0.3);
  }

  .success {
    background: rgba(76, 209, 55, 0.2);
    color: #51cf66;
    border: 1px solid rgba(76, 209, 55, 0.3);
  }

  .saved-texts {
    margin-top: 2rem;
  }

  .saved-texts h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    text-align: left;
  }

  .saved-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    text-align: left;
  }

  .saved-item-text {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .saved-item-time {
    font-size: 0.8rem;
    color: #888;
  }

  .loader {
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid #667eea;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  
</style>

<div class="container">
  <div class="header">
    <h1>💰 Voice Expense Tracker</h1>
    <p class="subtitle">Record your daily expenses and transactions with your voice</p>
  </div>

  

  {#if errorMessage}
    <div class="message error">
      ⚠️ {errorMessage}
    </div>
  {/if}

  {#if successMessage}
    <div class="message success">
      ✓ {successMessage}
    </div>
  {/if}

  <div class="recording-section">
    <div class="button-container">
      <button 
        class="mic-button {listening ? 'listening' : ''}" 
        on:click={startStop}
        aria-label={listening ? "Stop recording" : "Start recording"}
      >
        {listening ? '⏹' : '🎤'}
      </button>
      
      <div class="status-text {listening ? 'listening' : ''}">
        {#if listening}
          🔴 Listening...
        {:else if finalText}
          ✓ Recording complete
        {:else}
          Press to start
        {/if}
      </div>
    </div>
  </div>

  <div class="text-display">
    <h3>Expense Description</h3>
    <div class="text-content">
      <!-- High-contrast transcription banner (always rendered when text exists) -->
      {#if finalText}
        <div>{finalText}</div>
      {:else}
        <div style="color: #666;">Your expense description will appear here... (e.g., "Spent $50 on groceries at Walmart")</div>
      {/if}

      {#if interimText}
        <div class="interim-text" style="margin-top:0.5rem">{interimText}</div>
      {/if}
    </div>
  </div>

  <div class="action-buttons">
    <button 
      class="btn btn-primary" 
      on:click={sendToBackend} 
      disabled={!finalText || loading}
    >
      {#if loading}
        <div class="loader"></div>
        Processing...
      {:else}
        � Save Transaction
      {/if}
    </button>
    
    <button 
      class="btn btn-secondary" 
      on:click={clearText}
      disabled={!finalText && !interimText}
    >
      🗑️ Clear
    </button>
  </div>

  

  {#if savedTexts.length > 0}
    <div class="saved-texts">
      <h2>� Recent Transactions</h2>
      {#each savedTexts as item}
        <div class="saved-item">
          <div class="saved-item-text">{item.text}</div>
          <div class="saved-item-time">{item.timestamp}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

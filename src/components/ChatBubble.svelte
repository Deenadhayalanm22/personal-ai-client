<script>
  export let role = 'assistant'; // 'user' | 'assistant'
  export let text = '';
  export let type = 'normal'; // normal | followup | success | error
  export let ts = Date.now();
</script>

<style>
  .bubble { padding:.6rem .9rem; border-radius:12px; max-width:78%; box-shadow: 0 6px 18px rgba(0,0,0,0.45); }
  .assistant { align-self:flex-start; background: rgba(255,255,255,0.03); color:#e6eefc; border-bottom-left-radius:6px; }
  .user { align-self:flex-end; background: linear-gradient(90deg,#4f46e5,#8b5cf6); color:white; border-bottom-right-radius:6px; }
  .followup { border:1px dashed rgba(255,255,255,0.06); }
  .success { background: linear-gradient(90deg,#16a34a,#34d399); color:#042b0f }
  .error { background: linear-gradient(90deg,#ff6b6b,#ffb4b4); color:#2b0a0a }
  .meta { font-size:.72rem; color:#9aa3d6; margin-top:.25rem }
</style>

<div class="bubble {role} {type}">
  <div>{text}</div>
  <div class="meta">{role} · {new Date(ts).toLocaleTimeString()}</div>
</div>

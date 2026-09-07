<script>
  import { createNormalizationEntry, getNormalizationEntries, updateNormalizationEntry } from './lib/api.js';

  let status = 'loading', error = '', items = [];
  let expanded = null, editing = null, mode = 'create', showModal = false, saving = false, formError = '';
  let selectedType = 'merchant', primaryName = '', aliasesText = '', accountType = '';

  function normalise(data) {
    const merchants = (data?.merchants || []).map(item => ({ ...item, entityType: 'merchant', aliases: item.aliases || item.userAliases || item.preferredAliases || [] }));
    const accounts = (data?.accounts || []).map(item => ({ ...item, entityType: 'account', aliases: item.aliases || item.userAliases || item.preferredAliases || [] }));
    return [...merchants, ...accounts].sort((a, b) => (a.name || a.primaryName || '').localeCompare(b.name || b.primaryName || ''));
  }

  async function load() {
    status = 'loading'; error = '';
    try { items = normalise(await getNormalizationEntries()); status = 'ready'; }
    catch (cause) { status = 'error'; error = cause?.message || 'Could not load normalization details.'; }
  }

  const entryKey = item => `${item.entityType}-${item.id}`;
  function openCreate() { mode = 'create'; editing = null; selectedType = 'merchant'; primaryName = ''; aliasesText = ''; accountType = ''; formError = ''; showModal = true; }
  function openEdit(item) { mode = 'edit'; editing = item; selectedType = item.entityType; primaryName = item.name || item.primaryName || ''; aliasesText = (item.aliases || []).join(', '); accountType = item.accountType || item.typeLabel || ''; formError = ''; showModal = true; }
  function closeModal() { editing = null; mode = 'create'; showModal = false; }
  function aliases() { return [...new Set(aliasesText.split(',').map(value => value.trim()).filter(Boolean))]; }

  async function save() {
    const name = primaryName.trim(), values = aliases();
    if (!name) { formError = 'Enter a primary name.'; return; }
    if (values.some(value => value.toLocaleLowerCase() === name.toLocaleLowerCase())) { formError = 'An alias should be different from the primary name.'; return; }
    saving = true; formError = '';
    try {
      const type = selectedType;
      const payload = { type, primaryName: name, aliases: values, ...(type === 'account' && accountType.trim() ? { accountType: accountType.trim() } : {}) };
      if (mode === 'edit') await updateNormalizationEntry(type, editing.id, payload);
      else await createNormalizationEntry(payload);
      await load(); closeModal();
    } catch (cause) { formError = cause?.message || 'Could not save this entry.'; }
    finally { saving = false; }
  }

  load();
</script>

<section class="normalization-page">
  <div class="normalization-heading">
    <div><p class="micro-label">YOUR LANGUAGE</p><h1>Normalization</h1><p>Teach Money Stories the names you use for merchants and accounts.</p></div>
    <button class="add-normalization" type="button" aria-label="Add merchant or account" on:click={openCreate}>＋</button>
  </div>

  {#if status === 'loading'}
    <div class="skeleton-panel normalization-skeleton"><i></i><b></b><b></b><b></b></div>
  {:else if status === 'error'}
    <div class="section-error"><h2>Normalization is unavailable</h2><p>{error}</p><button on:click={load}>Try again</button></div>
  {:else if items.length}
    <div class="normalization-list">
      {#each items as item}
        <article class:expanded={expanded === entryKey(item)} class="normalization-row">
          <button class="normalization-main" on:click={() => expanded = expanded === entryKey(item) ? null : entryKey(item)} aria-expanded={expanded === entryKey(item)}>
            <span class={`entity-icon ${item.entityType === 'account' ? 'account' : ''}`}>{item.entityType === 'merchant' ? 'M' : '₹'}</span>
            <span class="entity-copy"><strong>{item.name || item.primaryName}</strong><small>{item.entityType === 'account' ? (item.accountType || item.typeLabel || 'Account') : 'Merchant'} · {(item.aliases || []).length} {(item.aliases || []).length === 1 ? 'alias' : 'aliases'}</small></span>
            <span class:open={expanded === entryKey(item)} class="normalization-chevron">⌄</span>
          </button>
          {#if expanded === entryKey(item)}
            <div class="alias-details">
              <div class="alias-label"><span>Your preferred aliases</span><button on:click={() => openEdit(item)}>Edit</button></div>
              {#if (item.aliases || []).length}<div class="alias-pills">{#each item.aliases as alias}<span>{alias}</span>{/each}</div>
              {:else}<p>No aliases added yet. Add the words you naturally use.</p>{/if}
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {:else}
    <div class="empty-state normalization-empty"><span>≋</span><h2>No names yet</h2><p>Add a merchant or account with the aliases you use in messages.</p><button class="wide-button" on:click={openCreate}>＋ Add a name</button></div>
  {/if}

  <aside class="normalization-tip"><span>✦</span><p><strong>How aliases work</strong> “HDFC credit card” can also respond to “credit card” or “cc”. We’ll still keep the primary name for reporting.</p></aside>
</section>

{#if showModal}
  <div class="modal-backdrop normalization-modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-label={`${mode === 'edit' ? 'Edit' : 'Add'} normalization entry`}>
      <button class="close" on:click={closeModal}>×</button><p class="micro-label">{mode === 'edit' ? 'EDIT NAME' : 'ADD NAME'}</p>
      <h2>{mode === 'edit' ? 'Update names' : 'Add a merchant or account'}</h2>
      <label>Type<select bind:value={selectedType} disabled={mode === 'edit'}><option value="merchant">Merchant</option><option value="account">Account</option></select></label>
      <label>Primary name<input bind:value={primaryName} placeholder={selectedType === 'merchant' ? 'e.g. Swiggy' : 'e.g. HDFC credit card'} /></label>
      {#if selectedType === 'account'}<label>Account type <span class="optional">Optional</span><input bind:value={accountType} placeholder="e.g. Credit card, bank account" /></label>{/if}
      <label>Preferred aliases <span class="optional">Separate with commas</span><input bind:value={aliasesText} placeholder={selectedType === 'merchant' ? 'e.g. swiggy food, food app' : 'e.g. credit card, cc'} /></label>
      {#if aliases().length}<div class="alias-preview">{#each aliases() as alias}<span>{alias}</span>{/each}</div>{/if}
      {#if formError}<p class="form-error" role="alert">{formError}</p>{/if}
      <div class="modal-actions"><button class="secondary" on:click={closeModal}>Cancel</button><button class="primary" disabled={saving || !primaryName.trim()} on:click={save}>{saving ? 'Saving…' : 'Save'}</button></div>
    </div>
  </div>
{/if}

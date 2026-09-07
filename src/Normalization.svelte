<script>
  import { createReferencePreference, getReferenceEntityTypes, getReferencePreferences } from './lib/api.js';

  let status = 'loading', error = '', entityTypes = [], savedPreferences = [];
  let expanded = null, showModal = false, saving = false, formError = '';
  let entityType = '', primaryReference = '', alias = '';

  const labels = { MERCHANT: 'Merchant', BENEFICIARY: 'Beneficiary', ACCOUNT: 'Account' };
  const icons = { MERCHANT: 'M', BENEFICIARY: 'B', ACCOUNT: '₹' };
  const typeLabel = type => labels[type] || type.replaceAll('_', ' ').toLowerCase().replace(/^./, value => value.toUpperCase());
  const aliasesFor = item => (item.aliases || []).map(value => typeof value === 'string' ? value : value.alias).filter(Boolean);
  const preferencesFrom = data => Array.isArray(data) ? data : (data?.references || data?.referencePreferences || data?.preferences || data?.items || []);

  async function loadScreen() {
    status = 'loading'; error = '';
    try {
      const [typeData, preferenceData] = await Promise.all([getReferenceEntityTypes(), getReferencePreferences()]);
      entityTypes = typeData?.entityTypes || [];
      savedPreferences = preferencesFrom(preferenceData);
      entityType = entityType || entityTypes[0] || '';
      status = 'ready';
    } catch (cause) { status = 'error'; error = cause?.message || 'Could not load reference preferences.'; }
  }

  async function refreshPreferences() { savedPreferences = preferencesFrom(await getReferencePreferences()); }

  function openCreate() { entityType = entityTypes[0] || ''; primaryReference = ''; alias = ''; formError = ''; showModal = true; }
  function closeModal() { showModal = false; }

  async function save() {
    const primary = primaryReference.trim(), aliasValue = alias.trim();
    if (!entityType || !primary || !aliasValue) { formError = 'Complete all three fields and provide at least one alias.'; return; }
    saving = true; formError = '';
    try {
      await createReferencePreference({ entityType, primaryReference: primary, alias: aliasValue });
      await refreshPreferences();
      closeModal();
    } catch (cause) { formError = cause?.message || 'Could not save this preference.'; }
    finally { saving = false; }
  }

  loadScreen();
</script>

<section class="normalization-page">
  <div class="normalization-heading">
    <div><p class="micro-label">YOUR LANGUAGE</p><h1>Normalization</h1><p>Teach Money Stories the names you use for merchants, beneficiaries, and accounts.</p></div>
    <button class="add-normalization" type="button" aria-label="Add reference preference" on:click={openCreate} disabled={status !== 'ready' || !entityTypes.length}>＋</button>
  </div>

  {#if status === 'loading'}
    <div class="skeleton-panel normalization-skeleton"><i></i><b></b><b></b><b></b></div>
  {:else if status === 'error'}
    <div class="section-error"><h2>Normalization is unavailable</h2><p>{error}</p><button on:click={loadScreen}>Try again</button></div>
  {:else if savedPreferences.length}
    <div class="normalization-list">
      {#each savedPreferences as item}
        <article class:expanded={expanded === item.referenceId} class="normalization-row">
          <button class="normalization-main" on:click={() => expanded = expanded === item.referenceId ? null : item.referenceId} aria-expanded={expanded === item.referenceId}>
            <span class={`entity-icon ${item.entityType === 'ACCOUNT' ? 'account' : ''}`}>{icons[item.entityType] || 'R'}</span>
            <span class="entity-copy"><strong>{item.primaryReference}</strong><small>{typeLabel(item.entityType)} · {aliasesFor(item).length} {aliasesFor(item).length === 1 ? 'alias' : 'aliases'}</small></span>
            <span class:open={expanded === item.referenceId} class="normalization-chevron">⌄</span>
          </button>
          {#if expanded === item.referenceId}
            <div class="alias-details"><div class="alias-label"><span>Your preferred aliases</span></div><div class="alias-pills">{#each aliasesFor(item) as value}<span>{value}</span>{/each}</div></div>
          {/if}
        </article>
      {/each}
    </div>
  {:else}
    <div class="empty-state normalization-empty"><span>≋</span><h2>Add your first preferred name</h2><p>Choose a reference type, then enter its primary name and the aliases you use.</p><button class="wide-button" on:click={openCreate}>＋ Add a preference</button></div>
  {/if}

  <aside class="normalization-tip"><span>✦</span><p><strong>How aliases work</strong> “HDFC credit card” can also respond to “credit card” or “cc”. Enter multiple aliases separated by commas.</p></aside>
</section>

{#if showModal}
  <div class="modal-backdrop normalization-modal-backdrop">
    <form class="modal" on:submit|preventDefault={save}>
      <button class="close" type="button" on:click={closeModal}>×</button><p class="micro-label">ADD PREFERENCE</p><h2>Add a preferred name</h2>
      <label>Reference type<select bind:value={entityType} required><option value="" disabled>Select a type</option>{#each entityTypes as type}<option value={type}>{typeLabel(type)}</option>{/each}</select></label>
      <label>Primary reference<input bind:value={primaryReference} placeholder="e.g. Amazon" required /></label>
      <label>Aliases <span class="optional">Separate with commas</span><input bind:value={alias} placeholder="e.g. AMZN, Amazon India, Amazon Store" required /></label>
      {#if formError}<p class="form-error" role="alert">{formError}</p>{/if}
      <div class="modal-actions"><button class="secondary" type="button" on:click={closeModal}>Cancel</button><button class="primary" type="submit" disabled={saving || !entityType || !primaryReference.trim() || !alias.trim()}>{saving ? 'Saving…' : 'Save preference'}</button></div>
    </form>
  </div>
{/if}

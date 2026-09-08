<script>
  import { ApiError, createMissingDateContext, deleteExpense, getExpenseOptions, getExpensesForDate, logout, updateExpense } from './lib/api.js';
  import SectionState from './SectionState.svelte';
  import Normalization from './Normalization.svelte';
  export let calendarSection; export let recentSection; export let storiesSection; export let selectedMonth; export let onMonthChange; export let refreshCalendar; export let refreshRecent; export let refreshStories; export let onLogout;

  let activeView = 'calendar', selectedDay = null, activityTab = 'recent', dayItems = [], dayStatus = 'idle', dayError = '', showAll = false, expandedId = null;
  let openedStory = null, handoff = null, addingContext = false, actionError = '', loggingOut = false, signOutError = '';
  let storySlide = 0, storyTouchStart = null, showStoryEvidence = false, viewedStoryIds = [];
  let editing = null, editAmount = '', editDate = '', editCategory = '', editSubcategory = '', editMerchantId = '', saving = false, deleting = null;
  let editOptions = { categories: [], merchants: [] }, optionsStatus = 'idle', optionsError = '';
  $: data = calendarSection.data || {}; $: currency = data.currency || 'INR'; $: calendar = buildCalendar(selectedMonth, data.days || []);
  $: recentData = recentSection.data || {}; $: recentItems = (recentData.items || recentData.expenses || []).slice(0, 5);
  $: storyData = storiesSection.data || {}; $: stories = storyData.stories || storyData.moneyStories || storyData.storyCards || [];
  $: selected = selectedDay == null ? null : calendar.days.find(day => day.day === selectedDay);
  $: activeItems = activityTab === 'recent' ? recentItems : dayItems; $: visibleItems = showAll ? activeItems : activeItems.slice(0, 3);
  $: editSubcategories = editOptions.categories.find(option => option.name === editCategory)?.subcategories || [];

  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));
  const merchant = item => item.merchant || item.merchantName || item.description || item.originalMessage || 'Expense';
  const category = item => item.category?.name || item.category || 'Uncategorised';
  const subcategory = item => item.subcategory?.name || item.subcategory || '';
  const transactionTitle = item => [category(item), subcategory(item), merchant(item)].filter(Boolean).join(' · ');
  const userMessage = item => item.originalMessage || item.message || item.description || '';
  const transactionDate = item => item.transactionDate || item.transactionTime || item.date;
  function dateLabel(value) { return value ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(new Date(value)) : ''; }
  function monthName(value) { const [y,m] = value.split('-').map(Number); return new Intl.DateTimeFormat(undefined,{month:'long'}).format(new Date(y,m-1)); }
  function monthLabel(value) { const [y,m] = value.split('-').map(Number); return new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date(y,m-1)); }
  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function isoDate(day) { return `${selectedMonth}-${String(day).padStart(2,'0')}`; }
  const number = value => Number(value || 0);
  const discretionaryStory = story => /discretionary/i.test(`${story.type || ''} ${story.kind || ''} ${story.storyType || ''}`) || number(story.discretionarySpend) > 0;
  function storyMetrics(story) {
    const discretionary = number(story.discretionarySpend || story.amount);
    const essential = number(story.essentialSpend || story.essentialAmount);
    const percent = Math.round(number(story.comparisonPercent || story.impactPercent || (essential ? discretionary / essential * 100 : 0)));
    return { discretionary, essential, percent, count: number(story.discretionaryTransactionCount || story.transactionCount), period: story.periodLabel || 'this week' };
  }
  function storyCards(story) {
    const metrics = storyMetrics(story);
    return [
      { eyebrow: '1 · A pattern worth noticing', title: `Small discretionary spends added up ${metrics.period}`, body: metrics.count ? `${metrics.count} discretionary purchases came to ${money(metrics.discretionary)}.` : `Your discretionary spending came to ${money(metrics.discretionary)}.`, tone: 'notice' },
      { eyebrow: '2 · Put it in context', title: metrics.essential ? `That’s ${metrics.percent}% of your essential spending` : 'Here’s what this spending adds up to', body: metrics.essential ? `You spent ${money(metrics.essential)} on essentials in the same period. For every ₹100 on essentials, ₹${metrics.percent} went to discretionary choices.` : story.summary || 'Seeing the total together makes the pattern easier to spot.', tone: 'compare' },
      { eyebrow: '3 · One small experiment', title: 'Keep the choices. Make them intentional.', body: 'Before your next discretionary purchase, pause for ten seconds and ask: “Is this worth it to me today?” Even one skipped repeat can change next week’s story.', tone: 'action' }
    ];
  }
  const hasDeck = story => Array.isArray(story.cards) && story.cards.length > 0;
  const storyName = story => String(story.storyType || story.type || 'Money story').replaceAll('_', ' ');
  const storyLabel = story => ({ DISCRETIONARY_FREQUENCY: 'Small choices', CATEGORY_SPENDING_GROWTH: 'Food growth', WEEKEND_SPENDING_PATTERN: 'Weekends', MERCHANT_CONCENTRATION: 'Swiggy', UNUSUAL_HIGH_SPEND_DAY: 'One big day' }[story.storyType] || storyName(story));
  const storyInitial = story => storyLabel(story).slice(0, 1);
  const storyWasViewed = story => viewedStoryIds.includes(story.storyId || story.id);
  function storyRingStyle(story) { const count = Math.max(1, story.cards?.length || 1), color = storyWasViewed(story) ? '#22684f' : '#b6d0b8', gap = 5, segment = 360 / count; return `background:conic-gradient(${Array.from({ length: count }, (_, index) => `${color} ${index * segment}deg ${((index + 1) * segment) - gap}deg,transparent ${((index + 1) * segment) - gap}deg ${(index + 1) * segment}deg`).join(',')})`; }
  const cardPreview = story => hasDeck(story) ? story.cards[0] : null;
  function openStory(story) { openedStory = story; storySlide = 0; showStoryEvidence = false; const id = story.storyId || story.id; if (id && !viewedStoryIds.includes(id)) viewedStoryIds = [...viewedStoryIds, id]; }
  function endStorySwipe(event, length) { if (storyTouchStart === null) return; const distance = event.changedTouches[0].clientX - storyTouchStart; if (Math.abs(distance) > 45) storySlide = Math.max(0, Math.min(length - 1, storySlide + (distance < 0 ? 1 : -1))); storyTouchStart = null; }
  function buildCalendar(monthValue, apiDays) { const [y,m]=monthValue.split('-').map(Number), count=new Date(y,m,0).getDate(), leading=(new Date(y,m-1,1).getDay()+6)%7, values=new Map(apiDays.map(x=>[Number(String(x.date).slice(-2)),x])), today=new Date(), current=today.getFullYear()===y&&today.getMonth()+1===m; return {leading,days:Array.from({length:count},(_,i)=>{const day=i+1,v=values.get(day)||{};return{day,totalSpend:Number(v.totalSpend||0),transactionCount:Number(v.transactionCount||0),intensity:Math.max(0,Math.min(4,Number(v.intensity||0))),future:current&&day>today.getDate()}})}; }
  async function selectDate(day) { if (!day || day.future) return; selectedDay=day.day; activityTab='day'; showAll=false; expandedId=null; actionError=''; await loadDay(); }
  async function loadDay() { if (selectedDay==null) return; dayStatus='loading'; dayError=''; try { const page=await getExpensesForDate(selectedMonth,isoDate(selectedDay),50); dayItems=page.items||page.expenses||[]; dayStatus='ready'; } catch(cause){dayStatus='error';dayError=cause?.message||'Could not load this day.';} }
  function switchTab(tab){activityTab=tab;expandedId=null;showAll=false;}
  function currentLocalMonth(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;}
  function changeMonth(offset){const[y,m]=selectedMonth.split('-').map(Number),next=new Date(Date.UTC(y,m-1+offset,1)).toISOString().slice(0,7);if(next<=currentLocalMonth()){selectedDay=null;dayItems=[];activityTab='recent';onMonthChange(next)}}
  async function startEdit(item){editing=item;editAmount=String(item.amount??'');editDate=String(transactionDate(item)||'').slice(0,10);editCategory=category(item)==='Uncategorised'?'':category(item);editSubcategory=subcategory(item);editMerchantId=String(item.merchantId??item.merchant?.id??'');actionError='';optionsError='';if(optionsStatus==='ready'){selectCurrentMerchant(item);return}optionsStatus='loading';try{const result=await getExpenseOptions();editOptions={categories:result.categories||[],merchants:result.merchants||[]};optionsStatus='ready';selectCurrentMerchant(item)}catch(cause){optionsStatus='error';optionsError=cause?.message||'Could not load edit options.';}}
  function selectCurrentMerchant(item){if(editMerchantId)return;const current=merchant(item).toLowerCase(),match=editOptions.merchants.find(option=>option.name?.toLowerCase()===current);if(match)editMerchantId=String(match.id)}
  function changeEditCategory(event){editCategory=event.currentTarget.value;if(!editSubcategories.includes(editSubcategory))editSubcategory='';}
  async function saveEdit(){const amount=Number(editAmount),merchantId=Number(editMerchantId);if(!editing||saving||optionsStatus!=='ready'||!Number.isFinite(amount)||amount<=0||!editDate||!editCategory||!editSubcategory||!Number.isFinite(merchantId))return;saving=true;actionError='';try{const updated=await updateExpense(editing.id,{amount,transactionDate:editDate,category:editCategory,subcategory:editSubcategory,merchantId});dayItems=dayItems.filter(x=>x.id!==updated.id||editDate===isoDate(selectedDay));if(editDate===isoDate(selectedDay))dayItems=dayItems.map(x=>x.id===updated.id?updated:x);editing=null;await Promise.all([loadDay(),refreshRecent(),refreshCalendar(),refreshStories()]);}catch(cause){actionError=cause?.message||'Could not update the transaction.';}finally{saving=false}}
  async function confirmDelete(){if(!deleting)return;actionError='';try{await deleteExpense(deleting.id);location.reload();}catch(cause){actionError=cause?.message||'Could not delete the transaction.';deleting=null;}}
  async function addMissingDate(){if(!selected||addingContext)return;addingContext=true;actionError='';try{const date=isoDate(selected.day),result=await createMissingDateContext(date,data.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone);handoff={...result,date,kind:'date'};}catch(cause){actionError=cause instanceof ApiError?cause.message:'Could not prepare WhatsApp recording.';}finally{addingContext=false}}
  async function signOut(){loggingOut=true;try{await logout();onLogout();}catch{loggingOut=false;signOutError='Could not sign out.'}}
</script>

<header class="portal-topbar"><a class="wordmark" href="/dashboard"><span>₹</span>Money Stories</a><label class="month-switcher"><button type="button" aria-label="Previous month" on:click={()=>changeMonth(-1)}>←</button><input aria-label="Select month" type="month" value={selectedMonth} max={currentLocalMonth()} on:change={e=>{selectedDay=null;dayItems=[];activityTab='recent';onMonthChange(e.currentTarget.value)}}/><button type="button" aria-label="Next month" on:click={()=>changeMonth(1)}>→</button></label></header>
<nav class="primary-view-nav" aria-label="Main sections"><button class:active={activeView==='calendar'} on:click={()=>activeView='calendar'}><span>▦</span> Calendar</button><button class:active={activeView==='normalization'} on:click={()=>activeView='normalization'}><span>≋</span> Normalization</button></nav>
{#if activeView === 'normalization'}
<main class="story-shell"><Normalization /></main>
{:else}
<main class="story-shell">
{#if openedStory}<section class="story-detail"><button class="back-button" on:click={()=>openedStory=null}>← Back to stories</button><p class="micro-label">{storyName(openedStory)} · {openedStory.period?.displayLabel || monthLabel(selectedMonth)}</p>
{#if hasDeck(openedStory)}
  {@const cards = openedStory.cards.slice().sort((a,b)=>a.sequence-b.sequence)}
  {@const currentCard = cards[storySlide]}
  <div class="story-deck" aria-label={storyName(openedStory)}>
    <div class="story-progress" aria-hidden="true">{#each cards as _, index}<i class:active={index===storySlide}></i>{/each}</div>
    <article class={`story-slide deck-theme-${currentCard.theme || 'WARM_NOTICE'}`} on:touchstart={event=>storyTouchStart=event.touches[0].clientX} on:touchend={event=>endStorySwipe(event,cards.length)}>
      <p class="slide-eyebrow">{currentCard.sequence} · {currentCard.eyebrow}</p>
      {#if currentCard.layout === 'HERO_STAT' && currentCard.components?.[0]}<div class="story-amount"><span>{currentCard.components[0].label}</span><strong>{currentCard.components[0].displayValue}</strong></div>{/if}
      {#if currentCard.layout === 'TWO_STAT_COMPARISON'}<div class="spend-compare">{#each currentCard.components || [] as component}<div><span>{component.label}</span><strong>{component.displayValue}</strong></div>{/each}</div>{/if}
      <h1>{currentCard.title}</h1><p>{currentCard.body}</p>
      {#each currentCard.actions || [] as action}{#if action.type === 'OPEN_EVIDENCE'}<button class="story-action" on:click={()=>showStoryEvidence=true}>{action.label}</button>{/if}{/each}
    </article>
    <div class="story-deck-controls"><button aria-label="Previous story card" disabled={storySlide===0} on:click={()=>storySlide-=1}>←</button><span>{storySlide + 1} of {cards.length}</span><button aria-label="Next story card" disabled={storySlide===cards.length-1} on:click={()=>storySlide+=1}>{storySlide===cards.length-1?'Done':'Next →'}</button></div>
  </div>
  {#if showStoryEvidence}<div class="modal-backdrop evidence-backdrop" role="presentation" on:click={()=>showStoryEvidence=false}><section class="modal story-evidence-sheet" role="dialog" aria-modal="true" aria-label={openedStory.evidence?.title} on:click|stopPropagation><button class="close" on:click={()=>showStoryEvidence=false}>×</button><p class="micro-label">TRANSACTIONS BEHIND THIS STORY</p><h2>{openedStory.evidence?.title}</h2><p class="evidence-total">{openedStory.evidence?.totalCount} purchases · {openedStory.evidence?.totalAmount?.displayValue}</p><div class="evidence-list">{#each openedStory.evidence?.transactions || [] as item}<div class="evidence-row"><div><strong>{item.merchantLabel}</strong><span>{item.dateLabel} · {item.categoryLabel}</span></div><b>− {item.amount.displayValue}</b></div>{/each}</div></section></div>{/if}
{:else if discretionaryStory(openedStory)}
  {@const cards = storyCards(openedStory)}
  <div class="story-deck" aria-label="Discretionary spending story">
    <div class="story-progress" aria-hidden="true">{#each cards as _, index}<i class:active={index===storySlide}></i>{/each}</div>
    <article class={`story-slide ${cards[storySlide].tone}`} on:touchstart={event=>storyTouchStart=event.touches[0].clientX} on:touchend={event=>endStorySwipe(event,cards.length)}>
      <p class="slide-eyebrow">{cards[storySlide].eyebrow}</p>
      {#if cards[storySlide].tone === 'notice'}<div class="story-amount"><span>Discretionary</span><strong>{money(storyMetrics(openedStory).discretionary)}</strong></div>{/if}
      {#if cards[storySlide].tone === 'compare'}<div class="spend-compare"><div><span>Discretionary</span><strong>{money(storyMetrics(openedStory).discretionary)}</strong></div><div><span>Essentials</span><strong>{money(storyMetrics(openedStory).essential)}</strong></div></div>{/if}
      <h1>{cards[storySlide].title}</h1><p>{cards[storySlide].body}</p>
      {#if cards[storySlide].tone === 'action'}<button class="story-action" on:click={()=>openedStory=null}>I’ll notice next time</button>{/if}
    </article>
    <div class="story-deck-controls"><button aria-label="Previous story card" disabled={storySlide===0} on:click={()=>storySlide-=1}>←</button><span>{storySlide + 1} of {cards.length}</span><button aria-label="Next story card" disabled={storySlide===cards.length-1} on:click={()=>storySlide+=1}>Next →</button></div>
  </div>
  {#if openedStory.evidence?.length}<details class="story-evidence"><summary>See the purchases behind this story ({openedStory.evidence.length})</summary><div class="evidence-list">{#each openedStory.evidence as item}<div class="evidence-row"><div><strong>{merchant(item)}</strong><span>{category(item)} · {dateLabel(transactionDate(item))}</span></div><b>− {money(item.amount)}</b></div>{/each}</div></details>{/if}
{:else}
  <h1>{openedStory.headline}</h1><p class="detail-copy">{openedStory.explanation}</p><div class="evidence-list">{#each openedStory.evidence||[] as item}<div class="evidence-row"><div><strong>{merchant(item)}</strong><span>{category(item)} · {dateLabel(transactionDate(item))}</span></div><b>− {money(item.amount)}</b></div>{/each}</div>
{/if}</section>
{:else}
<section class="app-heading"><div><p class="micro-label">{monthName(selectedMonth).toUpperCase()}</p><h1>{greeting()}</h1><p>Your recorded spending, one day at a time.</p></div><button class="profile-button" on:click={signOut} disabled={loggingOut} aria-label="Sign out">{loggingOut?'…':'D'}</button></section>
{#if signOutError}<div class="notice error">{signOutError}</div>{/if}
<SectionState section={storiesSection} title="Money Stories" retry={refreshStories}><section class="story-rail-section"><div class="section-title"><div><p class="micro-label">MONEY STORIES</p><h2>Your latest spending patterns</h2></div><span>{stories.length} new</span></div><div class="story-rail" aria-label="Money Stories">{#each stories as story}<button class:viewed={storyWasViewed(story)} class="story-orb" on:click={()=>openStory(story)}><span class="story-ring" style={storyRingStyle(story)}><span class="story-orb-inner">{storyInitial(story)}</span></span><strong>{storyLabel(story)}</strong><small>{story.cards?.length || 1} cards</small></button>{:else}<div class="story-rail-empty">New stories will appear here when there is enough trustworthy evidence.</div>{/each}</div></section></SectionState>
<SectionState section={calendarSection} title="Spending calendar" retry={refreshCalendar}><section class="month-card"><div class="section-title"><div><p class="micro-label">MONTH AT A GLANCE</p><h2>{monthLabel(selectedMonth)}</h2></div><span>{data.recordedDays||0} recorded days</span></div><div class="month-summary"><div><span>Total recorded</span><strong>{money(data.totalSpend)}</strong></div><div><span>Transactions</span><strong>{data.transactionCount||0}</strong></div><div><span>Highest day</span><strong>{money(data.highestSpend)}</strong></div></div><div class="weekdays">{#each ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as d}<span>{d}</span>{/each}</div><div class="calendar">{#each Array(calendar.leading) as _}<span></span>{/each}{#each calendar.days as d}<button class:future={d.future} class:selected={selectedDay===d.day} class={`level-${d.intensity}`} disabled={d.future} on:click={()=>selectDate(d)}>{d.day}</button>{/each}</div><div class="legend"><span>Lower spend</span><div>{#each [0,1,2,3,4] as l}<i class={`level-${l}`}></i>{/each}</div><span>Higher spend</span></div></section></SectionState>

<section class="activity-panel adaptive-activity"><div class="activity-tabs"><button class:active={activityTab==='recent'} on:click={()=>switchTab('recent')}>Recent</button><button class:active={activityTab==='day'} on:click={()=>switchTab('day')}>{selected?`${selected.day} ${monthName(selectedMonth)}`:'Selected date'}</button></div>
{#if activityTab==='day'&&dayStatus==='loading'}<div class="activity-loading">Loading transactions…</div>{:else if activityTab==='day'&&dayStatus==='error'}<div class="section-error"><p>{dayError}</p><button on:click={loadDay}>Try again</button></div>{:else}<div class="activity-summary"><div><p class="micro-label">{activityTab==='recent'?'LATEST ACTIVITY':selected?`${selected.day} ${monthName(selectedMonth)}`:'SELECT A DATE'}</p><h2>{activityTab==='recent'?`${recentItems.length} recent transactions`:selected?`${selected.transactionCount} ${selected.transactionCount===1?'transaction':'transactions'} · ${money(selected.totalSpend)}`:'Choose a calendar date'}</h2></div></div>
{#if activeItems.length}<div class="compact-list">{#each visibleItems as item}<article class:expanded={expandedId===item.id} class="compact-row"><button class="row-main" aria-expanded={expandedId===item.id} on:click={()=>expandedId=expandedId===item.id?null:item.id}><div><strong>{transactionTitle(item)}</strong><span>{userMessage(item)}{userMessage(item)&&transactionDate(item)?' · ':''}{dateLabel(transactionDate(item))}</span></div><div class="row-value"><b>− {money(item.amount)}</b><span class:open={expandedId===item.id} class="row-chevron" aria-hidden="true">⌄</span></div></button>{#if expandedId===item.id}<div class="row-actions"><button on:click={()=>startEdit(item)}>Quick edit</button><button class="danger" on:click={()=>deleting=item}>Delete</button></div>{/if}</article>{/each}</div>{#if activeItems.length>3}<button class="view-all" on:click={()=>showAll=!showAll}>{showAll?'Show fewer ↑':`View all ${activeItems.length} transactions ↓`}</button>{/if}
{:else if activityTab==='day'&&selected}<div class="empty-state"><span>⌁</span><h2>Nothing was recorded on {selected.day} {monthName(selectedMonth)}.</h2><p>Record something for this date in WhatsApp.</p></div>{:else if activityTab==='recent'}<div class="empty-state"><span>⌁</span><h2>No recent transactions</h2></div>{/if}
{#if activityTab==='day'&&selected}<button class="wide-button add-missing" on:click={addMissingDate} disabled={addingContext}>{addingContext?'Preparing WhatsApp…':selected.transactionCount?`＋ Add something missing for ${selected.day} ${monthName(selectedMonth)}`:`＋ Record a transaction for ${selected.day} ${monthName(selectedMonth)}`}</button>{/if}{#if actionError}<p class="form-error" role="alert">{actionError}</p>{/if}{/if}</section>

{/if}</main>
{/if}

{#if editing}<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><button class="close" on:click={()=>editing=null}>×</button><p class="micro-label">QUICK EDIT</p><h2>{merchant(editing)}</h2><label>Amount<input type="number" inputmode="decimal" min="0.01" step="0.01" bind:value={editAmount}/></label><label>Transaction date<input type="date" max={new Date().toISOString().slice(0,10)} bind:value={editDate}/></label>{#if optionsStatus==='loading'}<p class="edit-options-status">Loading categories and merchants…</p>{:else if optionsStatus==='error'}<p class="form-error" role="alert">{optionsError}</p>{:else}<label>Category<select value={editCategory} on:change={changeEditCategory}><option value="" disabled>Select a category</option>{#each editOptions.categories as option}<option value={option.name}>{option.name}</option>{/each}</select></label><label>Subcategory<select bind:value={editSubcategory} disabled={!editCategory}><option value="" disabled>Select a subcategory</option>{#each editSubcategories as option}<option value={option}>{option}</option>{/each}</select></label><label>Merchant<select bind:value={editMerchantId}><option value="" disabled>Select a merchant</option>{#each editOptions.merchants as option}<option value={String(option.id)}>{option.name}</option>{/each}</select></label>{/if}{#if actionError}<p class="form-error" role="alert">{actionError}</p>{/if}<div class="modal-actions"><button class="secondary" on:click={()=>editing=null}>Cancel</button><button class="primary" on:click={saveEdit} disabled={saving||optionsStatus!=='ready'||!editDate||Number(editAmount)<=0||!editCategory||!editSubcategory||!editMerchantId}>{saving?'Saving…':'Save changes'}</button></div></div></div>{/if}
{#if deleting}<div class="modal-backdrop"><div class="modal" role="alertdialog" aria-modal="true"><p class="micro-label">DELETE TRANSACTION</p><h2>Delete {merchant(deleting)}?</h2><p>This will update the calendar and monthly totals.</p><div class="modal-actions"><button class="secondary" on:click={()=>deleting=null}>Cancel</button><button class="primary delete-confirm" on:click={confirmDelete}>Delete</button></div></div></div>{/if}
{#if handoff}<div class="modal-backdrop"><div class="modal whatsapp-handoff" role="dialog" aria-modal="true"><button class="close" on:click={()=>handoff=null}>×</button><div class="auth-icon sent-icon">✓</div><p class="micro-label">WHATSAPP READY</p><h2>Now continue in WhatsApp</h2><p>Send the missing transaction. We’ll apply it to {dateLabel(`${handoff.date}T12:00:00`)}.</p>{#if handoff.whatsappUrl}<a class="center-action whatsapp-action" href={handoff.whatsappUrl} target="_blank" rel="noopener">Open WhatsApp</a>{/if}<button class="auth-secondary" on:click={()=>handoff=null}>Done</button></div></div>{/if}

<script>
  export let expenses;
  export let onMonthChange;

  let selectedMonth = expenses.month;
  $: if (expenses.month !== selectedMonth) selectedMonth = expenses.month;
  $: categories = Object.entries(expenses.categories || {});
  $: largestAmount = categories.length ? Number(categories[0][1]) : 0;

  function formatAmount(amount) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency: expenses.currency, maximumFractionDigits: 2,
    }).format(Number(amount));
  }

  function formatMonth(month) {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
      .format(new Date(year, monthNumber - 1, 1));
  }

  function changeMonth(event) {
    selectedMonth = event.currentTarget.value;
    if (selectedMonth) onMonthChange(selectedMonth);
  }
</script>

<section class="dashboard">
  <div class="dashboard-heading">
    <div><p class="eyebrow">Expense dashboard</p><h1>{formatMonth(expenses.month)}</h1></div>
    <label class="month-picker">
      <span>Choose month</span>
      <input type="month" value={selectedMonth} on:change={changeMonth} />
    </label>
  </div>

  <article class="total-card">
    <p>Total spending</p>
    <strong>{formatAmount(expenses.total)}</strong>
    <span>{categories.length} {categories.length === 1 ? 'category' : 'categories'}</span>
  </article>

  <section class="categories" aria-labelledby="category-heading">
    <div class="section-heading"><h2 id="category-heading">Spending by category</h2><span>{expenses.currency}</span></div>
    {#if categories.length}
      <div class="category-list">
        {#each categories as [name, amount]}
          <div class="category-row">
            <div class="category-copy"><span>{name}</span><strong>{formatAmount(amount)}</strong></div>
            <div class="bar" aria-hidden="true"><span style={`width: ${largestAmount ? (Number(amount) / largestAmount) * 100 : 0}%`}></span></div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state"><h3>No expenses this month</h3><p>Your recorded expenses will appear here.</p></div>
    {/if}
  </section>
</section>

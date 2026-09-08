const money = value => ({ value, currency: 'INR', displayValue: `₹${value.toLocaleString('en-IN')}` });
const evidence = (title, rows) => ({ title, totalCount: rows.length, totalAmount: money(rows.reduce((total, row) => total + row.amount.value, 0)), transactions: rows });
const transactions = (items) => items.map(([transactionId, dateLabel, merchantLabel, categoryLabel, value]) => ({ transactionId, dateLabel, merchantLabel, categoryLabel, amount: money(value) }));
const story = (storyId, storyType, cards, storyEvidence) => ({ storyId, storyType, templateVersion: 1, period: { type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', displayLabel: 'September' }, generatedAt: '2026-09-08T10:00:00+05:30', cards, evidence: storyEvidence });
const card = (cardId, sequence, layout, theme, eyebrow, title, body, components = [], actions = []) => ({ cardId, sequence, layout, theme, eyebrow, title, body, components, actions });

export const mockMoneyStories = {
  month: '2026-09', currency: 'INR', timezone: 'Asia/Kolkata', stories: [
    story('story_discretionary_frequency', 'DISCRETIONARY_FREQUENCY', [
      card('recognition', 1, 'HERO_STAT', 'WARM_NOTICE', 'A pattern worth noticing', '12 discretionary purchases this week', 'Together, they came to ₹1,240.', [{ type: 'MONEY', label: 'Discretionary spending', ...money(1240) }]),
      card('comparison', 2, 'TWO_STAT_COMPARISON', 'CALM_CONTEXT', 'Put it in context', '40% of your essential spending', 'For every ₹100 spent on essentials, ₹40 went toward discretionary choices.', [{ type: 'MONEY', label: 'Discretionary', ...money(1240) }, { type: 'MONEY', label: 'Essentials', ...money(3100) }]),
      card('action', 3, 'REFLECTION_ACTION', 'POSITIVE_ACTION', 'Look a little closer', 'Small choices created a visible total', 'Review the purchases that contributed to ₹1,240.', [], [{ type: 'OPEN_EVIDENCE', label: 'Review 12 expenses' }])
    ], evidence('Included in this story', transactions([['481','8 Sep','Swiggy','Food Delivery',320],['482','7 Sep','Starbucks','Café',280],['483','6 Sep','PVR','Entertainment',450],['484','5 Sep','Bakery','Snacks',190]]))),
    story('story_food_growth', 'CATEGORY_SPENDING_GROWTH', [
      card('recognition', 1, 'HERO_STAT', 'FOCUS', 'Something changed', 'Food & Dining spending grew this month', 'You spent ₹5,120 so far, compared with ₹4,000 last month.', [{ type: 'PERCENT', label: 'Food & Dining increase', value: 28, displayValue: '28%' }]),
      card('comparison', 2, 'TWO_STAT_COMPARISON', 'CALM_CONTEXT', 'See the change', '₹1,120 more than last month', 'The increase came mainly from restaurant and delivery orders.', [{ type: 'MONEY', label: 'This month', ...money(5120) }, { type: 'MONEY', label: 'Last month', ...money(4000) }]),
      card('action', 3, 'REFLECTION_ACTION', 'POSITIVE_ACTION', 'Look a little closer', 'See what changed in Food & Dining', 'Review the purchases included in this comparison.', [], [{ type: 'OPEN_EVIDENCE', label: 'Review Food & Dining' }])
    ], evidence('Food & Dining this month', transactions([['501','9 Sep','Smoke House Deli','Restaurant',1450],['502','8 Sep','Swiggy','Food Delivery',640],['503','6 Sep','Starbucks','Café',420]]))),
    story('story_weekend_pattern', 'WEEKEND_SPENDING_PATTERN', [
      card('recognition', 1, 'HERO_STAT', 'WARM_NOTICE', 'A weekly rhythm', 'Weekends take a larger share of your spending', 'Saturday and Sunday accounted for ₹3,780 this month.', [{ type: 'PERCENT', label: 'Weekend share', value: 42, displayValue: '42%' }]),
      card('comparison', 2, 'TWO_STAT_COMPARISON', 'CALM_CONTEXT', 'Put it in context', '42% of monthly spending happened on weekends', 'Weekends are only two days of the week, but hold a notable part of your spending.', [{ type: 'MONEY', label: 'Weekend', ...money(3780) }, { type: 'MONEY', label: 'Weekdays', ...money(5220) }]),
      card('action', 3, 'REFLECTION_ACTION', 'POSITIVE_ACTION', 'Look a little closer', 'Review your weekend spending', 'See the purchases that made up the weekend total.', [], [{ type: 'OPEN_EVIDENCE', label: 'Review weekend expenses' }])
    ], evidence('Weekend purchases', transactions([['511','Sun, 8 Sep','PVR','Entertainment',950],['512','Sun, 8 Sep','Swiggy','Food Delivery',740],['513','Sat, 7 Sep','Phoenix Mall','Shopping',1100]]))),
    story('story_swiggy_concentration', 'MERCHANT_CONCENTRATION', [
      card('recognition', 1, 'HERO_STAT', 'FOCUS', 'One merchant stood out', '11 orders with Swiggy this month', 'Swiggy was one of your most frequent merchants this month.', [{ type: 'MONEY', label: 'Spent with Swiggy', ...money(4600) }]),
      card('comparison', 2, 'TWO_STAT_COMPARISON', 'CALM_CONTEXT', 'Put it in context', '64% of Food & Dining went to one merchant', 'A repeated merchant can make a category total feel larger than expected.', [{ type: 'MONEY', label: 'Swiggy', ...money(4600) }, { type: 'MONEY', label: 'Food & Dining', ...money(7200) }]),
      card('action', 3, 'REFLECTION_ACTION', 'POSITIVE_ACTION', 'Look a little closer', 'Review your Swiggy orders', 'See the 11 orders included in this story.', [], [{ type: 'OPEN_EVIDENCE', label: 'Review 11 orders' }])
    ], evidence('Swiggy orders', transactions([['521','9 Sep','Swiggy','Food Delivery',640],['522','8 Sep','Swiggy','Food Delivery',320],['523','6 Sep','Swiggy','Food Delivery',580]]))),
    story('story_high_spend_day', 'UNUSUAL_HIGH_SPEND_DAY', [
      card('recognition', 1, 'HERO_STAT', 'HIGH_SPEND_ALERT', 'One day stood out', 'One Saturday changed the week’s picture', 'Your spending that day was much higher than a usual day this week.', [{ type: 'MONEY', label: 'Saturday, 7 September', ...money(2900) }]),
      card('comparison', 2, 'TWO_STAT_COMPARISON', 'CALM_CONTEXT', 'Put it in context', 'More than 3× your typical daily spend', 'A ₹1,850 dinner was the largest contributor to that day.', [{ type: 'MONEY', label: '7 September', ...money(2900) }, { type: 'MONEY', label: 'Typical day', ...money(820) }]),
      card('action', 3, 'REFLECTION_ACTION', 'POSITIVE_ACTION', 'Look a little closer', 'Review what happened that Saturday', 'See the transactions included in the ₹2,900 total.', [], [{ type: 'OPEN_EVIDENCE', label: 'Review 7 September' }])
    ], evidence('Saturday, 7 September', transactions([['531','7 Sep','The Table','Restaurant',1850],['532','7 Sep','Uber','Transport',380],['533','7 Sep','PVR','Entertainment',450]])))
  ]
};

function archiveFor(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1));
  const stories = JSON.parse(JSON.stringify(mockMoneyStories.stories.slice(0, 3))).map((item, index) => ({
    ...item,
    storyId: `${item.storyId}_${month}`,
    period: { type: 'MONTH', startDate: `${month}-01`, endDate: `${month}-28`, displayLabel: label },
    generatedAt: `${month}-28T10:00:00+05:30`,
    cards: item.cards.map(cardItem => ({
      ...cardItem,
      cardId: `${cardItem.cardId}_${month}_${index}`,
      title: cardItem.title.replaceAll('September', label),
      body: cardItem.body.replaceAll('September', label).replaceAll('Sep', 'Aug')
    })),
    evidence: {
      ...item.evidence,
      transactions: item.evidence.transactions.map(transaction => ({ ...transaction, dateLabel: transaction.dateLabel.replace('Sep', 'Aug') }))
    }
  }));
  return { month, currency: 'INR', timezone: 'Asia/Kolkata', stories };
}

export const getMockMoneyStories = month => month === '2026-09' ? { ...mockMoneyStories, month } : archiveFor(month);

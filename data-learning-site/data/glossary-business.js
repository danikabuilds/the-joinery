// Business and analytics terms. See data/glossary.js for what each field means.
window.addGlossary('Business', [
  {
    id: 'kpi', term: 'KPI',
    def: 'Key performance indicator. A metric tied to a business goal, with a target.',
    deep: 'Every KPI is a metric, but few metrics are KPIs. A KPI has an owner, a target and a decision attached: if it drops, someone acts. Too many KPIs means none of them drive action.',
    questions: ['Are we on track to hit this quarter\'s goal?', 'Which number should the team look at every Monday?'],
    say: 'A KPI is a metric tied to a goal with a target and an owner. If it moves, someone knows what to do.',
    rel: ['metric-vs-dimension', 'north-star-metric', 'leading-lagging']
  },
  {
    id: 'metric-vs-dimension', term: 'Metric vs dimension',
    def: 'A metric is a number you measure. A dimension is a category you slice it by.',
    deep: '"Revenue by region by month" has one metric (revenue) and two dimensions (region, month). In SQL, dimensions go in GROUP BY and metrics go inside aggregates. Every dashboard request can be broken down this way.',
    questions: ['What exactly do you want to see, and broken down by what?'],
    say: 'Metrics are numbers like revenue; dimensions are categories like region. In SQL, dimensions go in GROUP BY and metrics are aggregated.',
    rel: ['kpi', 'group-by', 'dimension-table']
  },
  {
    id: 'north-star-metric', term: 'North star metric',
    def: 'The one metric that best captures the value customers get from the product.',
    deep: 'For a marketplace it might be orders delivered on time; for a streaming service, hours watched. It keeps teams pointed the same way. It must be something teams can influence, not just revenue.',
    questions: ['If we could only improve one number this year, which one?'],
    say: 'A north star metric captures the core value customers get, so every team can see how their work moves it.',
    rel: ['kpi', 'leading-lagging']
  },
  {
    id: 'leading-lagging', term: 'Leading vs lagging indicator',
    def: 'A lagging indicator reports an outcome after the fact. A leading indicator moves first and predicts it.',
    deep: 'Revenue and churn are lagging: by the time they move, it is too late to change this month. Add-to-basket rate, delivery delays and support tickets are leading: they warn you early. Good dashboards pair them.',
    questions: ['What early signal would tell us churn is about to rise?'],
    say: 'Lagging indicators like revenue report results; leading ones like delivery delays move first, so I pair them on a dashboard.',
    rel: ['kpi', 'churn']
  },
  {
    id: 'conversion-rate', term: 'Conversion rate',
    def: 'The share of people who complete a step, such as visitors who buy.',
    deep: 'Always state the numerator and the denominator. "Conversion" might mean orders divided by sessions, or buyers divided by visitors, and those give very different numbers. A rate also hides volume: 50% of 10 visitors is not better than 5% of 10,000.',
    ex: "SELECT COUNT(DISTINCT CASE WHEN purchased = 1 THEN visitor_id END) * 1.0\n       / COUNT(DISTINCT visitor_id) AS conversion_rate\nFROM sessions;",
    exCode: true,
    mistakes: ['Dividing integers and getting 0 in SQL. Multiply by 1.0 first.', 'Comparing rates without showing the volumes behind them.'],
    questions: ['What share of visitors buy?', 'Did the new checkout page improve conversion?'],
    say: 'Conversion rate is the share who complete a step. I always state the numerator and denominator, and show volume next to it.',
    rel: ['funnel', 'ab-test', 'case']
  },
  {
    id: 'funnel', term: 'Funnel',
    def: 'The sequence of steps a customer goes through, such as visit, add to basket, checkout and pay, with drop-off at each.',
    deep: 'Funnels show where people leave. Step-to-step rates find the leakiest step; overall rate shows the end result. Be clear whether a funnel requires steps in order and within a time window.',
    ex: 'Visits 10,000 -> Basket 1,200 (12%) -> Checkout 600 (50%) -> Paid 420 (70%)',
    questions: ['Where do we lose the most customers before they pay?'],
    say: 'A funnel tracks drop-off between steps, so I can see which step loses the most people and focus there.',
    rel: ['conversion-rate', 'cohort-analysis']
  },
  {
    id: 'aov', term: 'Average order value',
    def: 'Revenue divided by the number of orders.',
    deep: 'AOV moves when people buy more items, pricier items or fewer cheap orders. Check which, by splitting it into items per order and price per item. Large orders can skew it, so look at the median too.',
    ex: 'SELECT SUM(price) / COUNT(DISTINCT order_id) AS aov FROM order_items;',
    exCode: true,
    mistakes: ['Calculating it after a join that repeats orders.'],
    questions: ['Did the free delivery threshold make people spend more per order?'],
    say: 'AOV is revenue over orders. When it moves, I split it into items per order and price per item to see why.',
    rel: ['mean-vs-median', 'fan-out', 'basket-analysis']
  },
  {
    id: 'retention', term: 'Retention',
    def: 'The share of customers who come back, or stay, after a set period.',
    deep: 'Retention is usually measured per cohort: of customers who first bought in January, what share bought again within 90 days? It is the clearest sign that a product is valued, and small improvements compound over time.',
    questions: ['Do customers come back after their first order?', 'Is retention better for customers who got on-time delivery?'],
    say: 'Retention is the share of customers who come back after a set period. I measure it by cohort, so groups are comparable.',
    rel: ['churn', 'cohort-analysis', 'clv', 'repeat-purchase-rate']
  },
  {
    id: 'churn', term: 'Churn',
    def: 'The share of customers who stop using or buying in a period. The opposite of retention.',
    deep: 'For subscriptions, churn is a clear event (cancellation). For shops, you must define it: no order in 180 days, for example. The definition changes the number a lot, so agree it before reporting it.',
    questions: ['How many customers did we lose this quarter, and why?', 'Which customers are most at risk of leaving?'],
    say: 'Churn is the share of customers who leave. In retail there is no cancel button, so I agree an inactivity window first.',
    rel: ['retention', 'leading-lagging', 'rfm']
  },
  {
    id: 'cohort-analysis', term: 'Cohort analysis',
    def: 'Grouping customers by when they started, then tracking each group over time.',
    deep: 'A cohort table has the start month down the side and months since start across the top. It separates "are we getting better at keeping customers?" from "did we just acquire more?". Overall averages mix old and new customers and hide this.',
    ex: 'first_month | month_0 | month_1 | month_2\n2025-01     | 100%    | 18%     | 12%\n2025-02     | 100%    | 22%     | 15%',
    questions: ['Are newer customers staying longer than older ones?', 'Did the loyalty launch improve retention for new cohorts?'],
    say: 'Cohort analysis groups customers by start date and tracks each group over time, so changes in retention are not hidden by growth.',
    rel: ['retention', 'churn', 'window-function']
  },
  {
    id: 'repeat-purchase-rate', term: 'Repeat purchase rate',
    def: 'The share of customers who have ordered more than once.',
    deep: 'A simple first look at loyalty. It depends on how long customers have had to come back, so compare cohorts of the same age, or use a fixed window such as "within 90 days".',
    ex: 'SELECT AVG(CASE WHEN orders > 1 THEN 1.0 ELSE 0 END)\nFROM (SELECT customer_id, COUNT(*) AS orders FROM orders GROUP BY customer_id);',
    exCode: true,
    questions: ['What share of our customers are repeat buyers?'],
    say: 'Repeat purchase rate is the share of customers with more than one order. I compare it within a fixed window so it is fair.',
    rel: ['retention', 'cohort-analysis']
  },
  {
    id: 'clv', term: 'Customer lifetime value',
    def: 'The total value a customer is expected to bring over their whole relationship with the business.',
    deep: 'A simple version is average order value times orders per year times expected years, times margin. It tells you how much you can afford to spend to win and keep a customer. Use margin, not revenue, or it overstates value.',
    questions: ['How much can we spend to acquire a customer and still make money?', 'Which customer segment is worth the most?'],
    say: 'Customer lifetime value is the margin a customer is expected to bring over time. Compared with acquisition cost, it shows if growth is profitable.',
    rel: ['cac', 'aov', 'retention', 'gross-margin']
  },
  {
    id: 'cac', term: 'Customer acquisition cost',
    def: 'Total sales and marketing spend divided by the number of new customers won.',
    deep: 'CAC is most useful next to lifetime value. A common rule of thumb is that lifetime value should be around three times CAC, and that CAC should be paid back within about a year. Work it out by channel, because a blended number hides expensive channels.',
    questions: ['Which marketing channel brings customers most cheaply?', 'Is our growth profitable?'],
    say: 'CAC is spend divided by new customers. I compare it with lifetime value, by channel, to see whether growth pays for itself.',
    rel: ['clv', 'attribution']
  },
  {
    id: 'arpu', term: 'ARPU',
    def: 'Average revenue per user: total revenue divided by the number of users in a period.',
    deep: 'ARPU is common in apps, telecoms and subscriptions. Say whether "users" means all users or active ones, and whether it is monthly. ARPPU (per paying user) is a different number.',
    questions: ['Are we earning more from each user than last year?'],
    say: 'ARPU is revenue per user for a period. I check whether the denominator is all users or only active ones.',
    rel: ['aov', 'clv']
  },
  {
    id: 'gross-margin', term: 'Gross margin',
    def: 'Revenue minus the direct cost of the goods sold, often shown as a percentage of revenue.',
    deep: 'Revenue can grow while margin shrinks, for example through discounts or high delivery costs. In e-commerce, freight is a big part of the cost. Decisions about promotions should look at margin, not just sales.',
    ex: 'Revenue 100, cost of goods 60, gross margin 40 (40%)',
    questions: ['Did the promotion actually make money?', 'Which categories are the most profitable?'],
    say: 'Gross margin is revenue minus direct costs. It shows whether sales growth is actually profitable.',
    rel: ['clv', 'unit-economics']
  },
  {
    id: 'unit-economics', term: 'Unit economics',
    def: 'The revenue and costs of one unit, such as one order or one customer.',
    deep: 'If one order loses money after product, delivery, payment fees and returns, more orders just mean bigger losses. Unit economics answers "does each sale make sense?" before "how do we grow?".',
    questions: ['Do we make money on a typical order once delivery and returns are included?'],
    say: 'Unit economics looks at the profit of a single order or customer, so we know growth will help rather than deepen losses.',
    rel: ['gross-margin', 'cac', 'clv']
  },
  {
    id: 'growth-rate', term: 'Growth rate',
    def: 'How much a number changed compared with an earlier period, as a percentage.',
    deep: '(This period minus last period) divided by last period. Month on month is noisy and affected by the number of days and seasons; year on year compares like with like. A small base makes growth look huge.',
    ex: 'Last month 200 orders, this month 250: growth = (250 - 200) / 200 = 25%',
    mistakes: ['Comparing a short month with a long one without adjusting.', 'Quoting 300% growth on a tiny base.'],
    questions: ['Are we growing faster than this time last year?'],
    say: 'Growth rate is the change divided by the earlier value. I prefer year on year for seasonal businesses, and I show the base.',
    rel: ['lag-lead', 'seasonality']
  },
  {
    id: 'seasonality', term: 'Seasonality',
    def: 'Patterns that repeat on a calendar cycle, such as weekends, month-end or Black Friday.',
    deep: 'Seasonality makes naive comparisons misleading: December beats November every year. Compare with the same period last year, use moving averages, or remove the seasonal pattern before judging a trend.',
    questions: ['Is this spike a real change, or does it happen every year?', 'How much stock do we need for Black Friday?'],
    say: 'Seasonality is a repeating calendar pattern. I compare year on year or smooth it out before calling something a trend.',
    rel: ['growth-rate', 'moving-average', 'forecast']
  },
  {
    id: 'rfm', term: 'RFM segmentation',
    def: 'Grouping customers by recency (last order), frequency (how often) and monetary value (how much).',
    deep: 'Score each customer 1 to 5 on each part, then name the groups: champions (recent, frequent, high spend), at risk (used to be good, not recent), new, and so on. It is simple, explainable and needs only order data.',
    questions: ['Which customers should get a win-back offer?', 'Who are our most valuable customers?'],
    say: 'RFM scores customers on recency, frequency and spend, which gives simple segments like champions and at-risk for targeting.',
    rel: ['customer-segmentation', 'churn', 'ranking-functions']
  },
  {
    id: 'customer-segmentation', term: 'Customer segmentation',
    def: 'Splitting customers into groups that behave or need things differently.',
    deep: 'Segments can be rules (region, RFM) or found by clustering. A segment is only useful if the business will treat it differently, with a different message, offer or service.',
    questions: ['Which groups of customers should we treat differently, and how?'],
    say: 'Segmentation groups similar customers. A segment earns its place only if we will treat it differently.',
    rel: ['rfm', 'clv']
  },
  {
    id: 'attribution', term: 'Attribution',
    def: 'Deciding how much credit each marketing touchpoint gets for a sale.',
    deep: 'Last-click gives all credit to the final ad clicked; first-click to the first; multi-touch models spread it. Each tells a different story, and none proves cause. Experiments, such as turning a channel off in one region, give stronger answers.',
    questions: ['Which channels actually drive sales?', 'Where should next month\'s budget go?'],
    say: 'Attribution assigns credit for a sale across touchpoints. Models disagree, so for big budget calls I prefer an experiment.',
    rel: ['cac', 'correlation-causation', 'ab-test']
  },
  {
    id: 'basket-analysis', term: 'Basket analysis',
    def: 'Finding products that are often bought together.',
    deep: 'Look at pairs of products in the same order. Support is how often the pair appears; confidence is how often B is bought when A is; lift says whether that is more than chance. Results feed "frequently bought together" and bundles.',
    ex: 'SELECT a.product_id, b.product_id, COUNT(*) AS together\nFROM order_items a\nJOIN order_items b ON a.order_id = b.order_id AND a.product_id < b.product_id\nGROUP BY 1, 2 ORDER BY together DESC;',
    exCode: true,
    questions: ['Which products should we bundle or recommend together?'],
    say: 'Basket analysis finds products bought together, using a self join on order and measures like lift, to drive bundles and recommendations.',
    rel: ['self-join', 'aov']
  },
  {
    id: 'single-source-of-truth', term: 'Single source of truth',
    def: 'One agreed place and definition for each important number.',
    deep: 'When finance, marketing and operations each calculate revenue differently, meetings become arguments about numbers. Agreed definitions, a shared model and a metrics layer fix this. Write each definition down, including what is excluded.',
    questions: ['Why does marketing\'s revenue not match finance\'s?'],
    say: 'A single source of truth means one agreed definition and location for each key metric, so teams argue about decisions, not numbers.',
    rel: ['semantic-layer', 'conformed-dimension', 'data-lineage']
  }
]);

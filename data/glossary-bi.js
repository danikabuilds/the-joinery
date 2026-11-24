// BI and dashboard terms. See data/glossary.js for what each field means.
window.addGlossary('BI', [
  {
    id: 'dashboard-design', term: 'Dashboard design',
    def: 'Arranging metrics and charts so the reader can see what matters and act on it quickly.',
    deep: 'Start from the questions the audience asks, not the data available. Put the most important number top left, give each KPI context (target, last period), keep to one screen, and use colour only to signal something, such as a miss against target.',
    mistakes: ['Showing every metric available.', 'Numbers without a comparison, so nobody knows if they are good.', 'Decorative colour everywhere.'],
    questions: ['What does this person need to decide, and how often?'],
    say: 'I design a dashboard from the decisions it supports: key numbers first, each with context, and colour only where it means something.',
    rel: ['chart-choice', 'kpi', 'data-storytelling']
  },
  {
    id: 'chart-choice', term: 'Choosing a chart',
    def: 'Matching the chart type to the question being asked.',
    deep: 'Change over time: line. Comparing categories: bar, sorted. Part of a whole with few parts: stacked bar (pie charts are hard to read). Relationship between two numbers: scatter. Distribution: histogram. Start bar charts at zero.',
    mistakes: ['Pie charts with many slices.', 'Bar charts that do not start at zero.', '3D effects.'],
    say: 'I pick the chart from the question: lines for trends, sorted bars for comparisons, scatter for relationships, histograms for distributions.',
    rel: ['dashboard-design', 'distribution']
  },
  {
    id: 'data-storytelling', term: 'Data storytelling',
    def: 'Presenting analysis as a clear message with context and a recommendation, not just charts.',
    deep: 'A simple frame: what happened, why it matters, what we should do. Lead with the answer, then the evidence. Title charts with the finding ("Late deliveries halve repeat orders"), not the field names.',
    questions: ['What is the one thing leadership should do after reading this?'],
    say: 'I lead with the answer, back it with one or two charts titled by their finding, and end with a recommendation.',
    rel: ['dashboard-design', 'chart-choice']
  },
  {
    id: 'semantic-layer', term: 'Semantic layer',
    def: 'A shared layer that defines metrics and business names once, so every tool calculates them the same way.',
    deep: 'Instead of each dashboard writing its own revenue formula, the semantic layer (a Power BI dataset, dbt metrics, LookML) defines it once. Reports then ask for "revenue by month" and get the agreed number.',
    questions: ['Why do two dashboards show different revenue for the same month?'],
    say: 'A semantic layer defines metrics once, in business language, so every report gets the same number for revenue.',
    rel: ['single-source-of-truth', 'measure-vs-column', 'view']
  },
  {
    id: 'measure-vs-column', term: 'Measure vs calculated column',
    def: 'In Power BI, a calculated column is worked out row by row and stored. A measure is calculated on the fly for whatever is being viewed.',
    deep: 'Use a calculated column for something you slice by, such as an age band per customer. Use a measure for an aggregate that should respond to filters, such as total revenue or a conversion rate. Ratios must be measures: summing a row-level ratio column gives nonsense.',
    ex: 'Total Revenue = SUM(Sales[Revenue])\nConversion Rate = DIVIDE([Orders], [Sessions])',
    exCode: true,
    mistakes: ['Storing a ratio as a calculated column and summing it.'],
    say: 'A calculated column is stored per row and good for slicing; a measure is calculated for the current filters and is right for totals and ratios.',
    rel: ['filter-context', 'semantic-layer']
  },
  {
    id: 'filter-context', term: 'Filter context',
    def: 'In Power BI, the set of filters (slicers, rows of a visual, page filters) that a measure is calculated under.',
    deep: 'The same measure shows different numbers in each cell of a table because each cell has its own filter context. CALCULATE changes that context, for example to show last year\'s revenue or the total ignoring a slicer. Most DAX puzzles are filter context puzzles.',
    ex: 'Revenue LY = CALCULATE([Total Revenue], SAMEPERIODLASTYEAR(\'Date\'[Date]))',
    exCode: true,
    say: 'Filter context is the set of filters a measure is evaluated under. CALCULATE changes it, which is how I build comparisons like last year.',
    rel: ['measure-vs-column', 'star-schema']
  },
  {
    id: 'drill-down', term: 'Drill down',
    def: 'Moving from a summary to more detail, such as from year to month to day, or from region to store.',
    deep: 'Drill-down lets a dashboard stay simple at the top while still answering "why?". It needs a clean hierarchy in the model (a proper date table, region to city to store).',
    questions: ['Which store is behind the drop in the region\'s sales?'],
    say: 'Drill-down lets people move from summary to detail, which keeps the top view simple but still explains the why.',
    rel: ['dimension-table', 'dashboard-design']
  },
  {
    id: 'self-service-bi', term: 'Self-service BI',
    def: 'Letting business users build their own reports from trusted, prepared data.',
    deep: 'It frees analysts from small requests, but only works on a clean model with agreed definitions. Without that, people build ten versions of the same number.',
    say: 'Self-service BI lets users explore on their own, which works when they build on a trusted, well-defined model.',
    rel: ['semantic-layer', 'single-source-of-truth']
  },
  {
    id: 'row-level-security', term: 'Row-level security',
    def: 'Rules that limit which rows each user can see in a report, such as only their own region.',
    deep: 'One report can serve every regional manager, each seeing only their data. It is set up in the model with a role and a filter, and needs testing by viewing the report as each role.',
    questions: ['Can each regional manager see only their own region in one report?'],
    say: 'Row-level security filters the data per user, so one report can safely serve many people who should see different rows.',
    rel: ['self-service-bi']
  },
  {
    id: 'import-vs-directquery', term: 'Import vs DirectQuery',
    def: 'In Power BI, Import copies data into the report for speed. DirectQuery leaves it in the source and queries it live.',
    deep: 'Import is fast and flexible but only as fresh as the last refresh, and has size limits. DirectQuery is always current but every click runs a query, so it is slower and puts load on the source.',
    questions: ['Does this report need live numbers, or is a refresh every few hours enough?'],
    say: 'Import copies data in for speed but needs refreshing; DirectQuery queries the source live, which is fresher but slower.',
    rel: ['data-freshness', 'materialised-view']
  },
  {
    id: 'vanity-metric', term: 'Vanity metric',
    def: 'A number that looks impressive but does not help anyone make a decision.',
    deep: 'Total registered users only ever goes up. Page views can rise because a page is confusing. Prefer rates, active users and metrics tied to value, such as repeat customers.',
    questions: ['If this number changed, what would we do differently?'],
    say: 'A vanity metric looks good but drives no decision, like total sign-ups. I prefer rates and active measures tied to value.',
    rel: ['kpi', 'north-star-metric']
  },
  {
    id: 'data-literacy', term: 'Data literacy',
    def: 'The ability to read, question and communicate with data.',
    deep: 'A dashboard is only as useful as people\'s ability to read it. Short notes on each chart, plain metric definitions and a "how to read this" line help more than adding visuals.',
    say: 'Data literacy is being able to read and question data. I support it with clear definitions and a short note on how to read each chart.',
    rel: ['data-storytelling', 'single-source-of-truth']
  },
  {
    id: 'report-vs-dashboard', term: 'Report vs dashboard',
    def: 'A dashboard shows a few live numbers at a glance; a report gives the detail behind them, often as tables or pages.',
    deep: 'Dashboards answer "is anything wrong right now?" for people who look often and briefly. Reports answer "what exactly happened, and why?" for people who read carefully, less often. Mixing the two produces dashboards crammed with tables nobody reads, or reports so visual the detail is lost. Many teams pair them: the dashboard flags a problem, and a link opens the report that explains it.',
    ex: 'Dashboard: today\'s orders, revenue and late-delivery %, with arrows for change.\nReport: every late order last week, by courier and province, with reasons.',
    mistakes: ['Putting a 40-row table on a dashboard because someone might need it.', 'Building a dashboard for a question that is asked once a quarter.'],
    questions: ['What does the operations team need to see every morning?', 'Where do people go when a number on the dashboard looks wrong?'],
    say: 'I keep dashboards to the few numbers people check daily, and link each one to a report with the detail behind it.',
    rel: ['dashboard-design', 'kpi', 'drill-down']
  },
  {
    id: 'scorecard-rag', term: 'Scorecard and RAG status',
    def: 'A scorecard lists KPIs against targets; RAG status colours each one red, amber or green to show whether it is on track.',
    deep: 'RAG makes a long list scannable: people look for red first. It only works if the thresholds are agreed and written down, for example green within 5% of target, amber within 10%, red beyond. Colour alone excludes colour-blind readers, so pair it with a word or icon. Too many reds and people stop reacting, so review the thresholds when they stop meaning anything.',
    ex: 'Late deliveries   target 10%   actual 28%   RED\nReview score      target 4.2   actual 4.0   AMBER\nRepeat customers  target 15%   actual 18%   GREEN',
    mistakes: ['Choosing RAG thresholds after seeing the numbers.', 'Using colour as the only signal, with no label or icon.'],
    questions: ['Which KPIs are off track this month?', 'Are we hitting the targets we set for the quarter?'],
    say: 'A scorecard compares each KPI with its target, and RAG status flags what is off track. I always agree the thresholds up front and label the colours.',
    rel: ['kpi', 'targets-benchmarks', 'dashboard-design']
  },
  {
    id: 'targets-benchmarks', term: 'Targets and benchmarks',
    def: 'A target is the number you are aiming for; a benchmark is a number you compare against, such as last year or an industry average.',
    deep: 'A number on its own means little. "28% late" only becomes useful next to something: the 10% target, last month\'s 31%, or a competitor\'s 15%. Good dashboards show at least one comparison for every KPI. Be clear which kind it is, because missing a stretch target is very different from falling below last year.',
    ex: 'Late deliveries: 28%\nvs target 10%  (far off)\nvs last month 31%  (improving)\nvs industry 15%  (behind)',
    mistakes: ['Showing a KPI with no comparison at all.', 'Comparing this month with last month when the business is seasonal; compare with the same month last year instead.'],
    questions: ['Are we improving, even if we are not yet on target?', 'How do we compare with similar businesses?'],
    say: 'I never show a KPI on its own. It needs a target or a benchmark, like last year, so people can tell whether it is good or bad.',
    rel: ['kpi', 'scorecard-rag', 'seasonality']
  },
  {
    id: 'time-intelligence', term: 'Time intelligence',
    def: 'Calculations that compare periods, such as month to date, year to date and year over year.',
    deep: 'Most business questions are about change over time. Month to date (MTD) adds up from the 1st of the month to today. Year to date (YTD) does the same from the start of the year. Year over year (YoY) compares a period with the same period last year, which removes seasonality. These need a proper date table so every day exists, even days with no sales.',
    ex: 'Revenue, 1 to 15 March:\nMTD this year  R1.2m\nMTD last year  R1.0m\nYoY growth     +20%',
    mistakes: ['Comparing a full last month with a half-finished current month.', 'Calculating YoY without a date table, so missing days shift the comparison.'],
    questions: ['Are we ahead of last year so far this month?', 'How does year-to-date revenue compare with plan?'],
    say: 'For period comparisons I use a date table and compare like with like, for example month to date against the same days last year.',
    rel: ['date-functions', 'seasonality', 'growth-rate']
  },
  {
    id: 'bi-relationships', term: 'Relationships in a BI model',
    def: 'The links between tables in a tool like Power BI or Looker, which decide how filters flow from one table to another.',
    deep: 'In a BI tool you join tables once, in the model, instead of in every query. A relationship links a key in a dimension to the matching key in a fact table, usually one-to-many. Filters flow from the "one" side to the "many" side: choose a province in dim_customer and the sales table filters with it. Two-way and many-to-many relationships are possible but cause confusing totals, so keep them rare.',
    ex: 'dim_customer[customer_key]  1 ──< *  fact_sales[customer_key]\ndim_date[date_key]          1 ──< *  fact_sales[date_key]',
    exCode: true,
    mistakes: ['Turning on two-way filtering everywhere to "make it work".', 'Relating two fact tables directly instead of through a shared dimension.'],
    questions: ['Why does my slicer not filter this visual?', 'Why do these totals look too high?'],
    say: 'I build the BI model as a star schema, with one-to-many relationships from dimensions to facts, so filters flow in one direction.',
    rel: ['star-schema', 'filter-context', 'conformed-dimension']
  },
  {
    id: 'dax', term: 'DAX',
    def: 'Data Analysis Expressions: the formula language used in Power BI to write measures and calculated columns.',
    deep: 'DAX looks like Excel formulas but works on whole tables and respects filter context. A measure such as Total Revenue = SUM(fact_sales[revenue]) gives a different answer on every row of a visual, because each row has its own filters. CALCULATE is the key function: it changes the filter context, for example to get revenue for last year. Most DAX confusion comes from filter context, not syntax.',
    ex: 'Total Revenue = SUM ( fact_sales[revenue] )\nRevenue LY = CALCULATE ( [Total Revenue], SAMEPERIODLASTYEAR ( dim_date[date] ) )',
    exCode: true,
    mistakes: ['Writing a calculated column where a measure is needed, so it does not respond to filters.', 'Nesting CALCULATE without understanding which filters it replaces.'],
    questions: ['How do we show revenue against last year on every chart?', 'What share of total revenue does each category bring in?'],
    say: 'In Power BI I write measures in DAX, and I think in terms of filter context: what filters apply to this cell, and how CALCULATE changes them.',
    rel: ['measure-vs-column', 'filter-context', 'time-intelligence']
  },
  {
    id: 'slicers-cross-filtering', term: 'Slicers and cross-filtering',
    def: 'Slicers are on-screen filters a reader can click; cross-filtering means clicking one chart filters the others.',
    deep: 'Slicers let one dashboard serve many questions: pick a province, a month or a category and every visual updates. Cross-filtering does the same from inside the charts, which feels natural but can surprise people. Show clearly which filters are active, and give an easy way to reset them, or readers will screenshot a filtered view and think it is the total.',
    ex: 'Slicer: Province = Eastern Cape\nEvery chart now shows Eastern Cape only.\nClick "Express" in the delivery chart: the others filter to express orders too.',
    mistakes: ['Hiding which filters are applied, so people misread a filtered view as the total.', 'Adding ten slicers when two would answer the real questions.'],
    questions: ['How does late delivery look in one province?', 'Which categories drive revenue for repeat customers?'],
    say: 'I add a few slicers for the questions people actually ask, and I always show which filters are active so nobody misreads a filtered total.',
    rel: ['filter-context', 'drill-down', 'self-service-bi']
  },
  {
    id: 'data-refresh', term: 'Data refresh',
    def: 'Updating a report or dataset with the latest data, either on a schedule or on demand.',
    deep: 'A dashboard is only as current as its last refresh. Scheduled refreshes run at set times, often after the overnight pipeline finishes. If the pipeline is late or fails, the refresh may publish yesterday\'s numbers without anyone noticing. Showing "data as of" on the page, and checking freshness before refreshing, prevents decisions made on stale data.',
    ex: 'Pipeline finishes  06:10\nDashboard refresh  06:30\nPage shows: "Data as of 24 Nov 2025, 06:30"',
    mistakes: ['Scheduling the refresh before the pipeline usually finishes.', 'Not showing when the data was last updated.'],
    questions: ['Are these numbers from today?', 'Why did the dashboard not change after the fix went in?'],
    say: 'I schedule refreshes after the pipeline has finished, and show a "data as of" time on every dashboard.',
    rel: ['data-freshness', 'orchestration', 'import-vs-directquery']
  },
  {
    id: 'accessible-dashboards', term: 'Accessible dashboards',
    def: 'Dashboards that everyone can read, including people who are colour-blind, use screen readers or zoom in.',
    deep: 'About 1 in 12 men has some colour blindness, so red and green alone fail many readers. Use labels, icons or patterns alongside colour, keep strong contrast between text and background, and avoid tiny fonts. Give charts a title that states the point, and offer the numbers as a table too. Accessible dashboards are also clearer for everyone else.',
    ex: 'Instead of: red and green dots only\nUse: "28% ▲ off target" in red, with the word and the arrow carrying the meaning',
    mistakes: ['Relying on red versus green to show good and bad.', 'Light grey text on white, which fails contrast checks.'],
    questions: ['Can everyone in the team read this dashboard?', 'Will it still make sense when printed in black and white?'],
    say: 'I never rely on colour alone: every status has a label or icon, text has strong contrast, and the numbers are available as a table.',
    rel: ['dashboard-design', 'chart-choice', 'scorecard-rag']
  },
  {
    id: 'data-dictionary', term: 'Data dictionary',
    def: 'A shared list that defines every table, column and metric: what it means, where it comes from and how it is calculated.',
    deep: 'Arguments about numbers are usually arguments about definitions. Does "revenue" include delivery fees? Is a "customer" anyone who signed up, or anyone who ordered? A data dictionary writes the answer down once, so every report uses the same meaning. Keep it next to the data, for example in dbt docs or the BI tool, so it stays up to date.',
    ex: 'revenue: sum of item price, excluding freight and refunds. Source: order_items. Owner: Finance.\nactive customer: placed at least one order in the last 90 days.',
    mistakes: ['Keeping definitions in someone\'s head or an old email.', 'Letting two dashboards define the same metric differently.'],
    questions: ['Why do Finance and Marketing report different revenue?', 'What exactly counts as an active customer?'],
    say: 'I write metric definitions in a data dictionary next to the data, so every report uses the same meaning of revenue or active customer.',
    rel: ['single-source-of-truth', 'semantic-layer', 'data-literacy']
  }
]);

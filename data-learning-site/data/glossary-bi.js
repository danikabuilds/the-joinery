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
  }
]);

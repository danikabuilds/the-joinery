// SQL terms. See data/glossary.js for what each field means.
window.addGlossary('SQL', [
  {
    id: 'primary-key', term: 'Primary key',
    def: 'The column, or set of columns, that uniquely identifies each row in a table.',
    deep: 'A primary key is a promise: no two rows share it and it is never NULL. Everything else leans on that promise. Joins assume it, counts of "distinct customers" assume it, and deduplication starts by asking what the key should be. When a key has more than one column (order_id plus order_item_id), it is called a composite key.',
    ex: 'order_items is keyed on (order_id, order_item_id): one order can have several items, so order_id alone repeats.',
    mistakes: ['Assuming a column is unique without checking. Test it with GROUP BY key HAVING COUNT(*) > 1.', 'Using a natural value such as an email as the key, then finding it changes or repeats.'],
    say: 'A primary key uniquely identifies a row, like order_id in orders. Before I trust a join or a count, I check the key really is unique.',
    rel: ['foreign-key', 'grain', 'surrogate-key', 'deduplication']
  },
  {
    id: 'foreign-key', term: 'Foreign key',
    def: 'A column that points to the primary key of another table.',
    deep: 'Foreign keys are how tables relate. customer_id in orders points to customers. In a warehouse the link is often not enforced by the database, so orphan rows (an order whose customer is missing) can exist. That is why the choice between INNER and LEFT JOIN matters: an inner join silently drops orphans.',
    ex: 'SELECT o.order_id\nFROM orders o\nLEFT JOIN customers c ON c.customer_id = o.customer_id\nWHERE c.customer_id IS NULL;  -- orders with no matching customer',
    exCode: true,
    mistakes: ['Assuming every foreign key has a match. Check for orphans before choosing your join.'],
    say: 'A foreign key links one table to another, like customer_id in orders. I check for orphan rows, because an inner join would quietly drop them.',
    rel: ['primary-key', 'inner-join', 'left-join', 'cardinality']
  },
  {
    id: 'null', term: 'NULL',
    def: 'A missing or unknown value. It is not zero and not an empty string.',
    deep: 'NULL means "unknown", so almost anything compared with it is also unknown. NULL = NULL is not true, which is why you write IS NULL. Aggregates skip NULLs: AVG(rating) averages only the rows that have a rating, and COUNT(rating) counts only those. A NOT IN list that contains a NULL returns no rows at all.',
    ex: "SELECT COUNT(*) AS all_rows,\n       COUNT(order_delivered_date) AS delivered\nFROM orders;  -- the two numbers differ by the NULLs",
    exCode: true,
    mistakes: ['Writing = NULL instead of IS NULL.', 'Forgetting that AVG ignores NULLs, which can make an average look better than it is.', 'Using NOT IN with a subquery that can return NULL.'],
    say: 'NULL means unknown, so I test it with IS NULL, and I remember that COUNT(column) and AVG skip NULLs.',
    rel: ['coalesce', 'aggregate-function', 'left-join']
  },
  {
    id: 'coalesce', term: 'COALESCE',
    def: 'Returns the first value in its list that is not NULL.',
    deep: 'COALESCE is the standard way to fill a gap: COALESCE(discount, 0) treats a missing discount as zero. Use it deliberately. Replacing NULL with 0 changes the meaning from "unknown" to "none", which is right for a missing discount but wrong for a missing temperature.',
    ex: "SELECT order_id, COALESCE(order_delivered_date, 'not delivered') AS delivered\nFROM orders;",
    exCode: true,
    mistakes: ['Filling NULLs with 0 before averaging, which drags the average down.'],
    say: 'COALESCE returns the first non-NULL value. I use it to fill gaps, but only when "missing" really means zero or a default.',
    rel: ['null', 'case']
  },
  {
    id: 'inner-join', term: 'INNER JOIN',
    def: 'Returns only the rows that have a match in both tables.',
    deep: 'An inner join is a filter as well as a join: any row without a partner disappears. That is useful when you only want matched records, and dangerous when you did not mean to lose rows. Always compare row counts before and after a join.',
    ex: 'SELECT o.order_id, c.customer_city\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id;',
    exCode: true,
    mistakes: ['Losing rows silently because some keys have no match.', 'Joining on the wrong column, such as order_id to customer_id.'],
    questions: ['Which customers have actually placed an order?'],
    say: 'An inner join keeps rows where the key exists on both sides, so unmatched rows drop out. I check row counts before and after.',
    rel: ['left-join', 'foreign-key', 'fan-out']
  },
  {
    id: 'left-join', term: 'LEFT JOIN',
    def: 'Returns every row from the left table, with NULLs where the right table has no match.',
    deep: 'A left join protects the left table: it never loses a row. It is also the standard way to find what is missing (anti-join): left join, then keep rows where the right side IS NULL. One trap: putting a condition on the right table in WHERE turns it back into an inner join. Put that condition in the ON clause instead.',
    ex: "-- customers with no orders\nSELECT c.customer_id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;",
    exCode: true,
    mistakes: ["Filtering the right table in WHERE (for example WHERE o.order_status = 'delivered'), which removes the unmatched rows you wanted to keep."],
    questions: ['Which customers signed up but never ordered?', 'Which products have never sold?'],
    say: 'A left join keeps everything from the left table. I use it when I must not lose rows, or to find records with no match.',
    rel: ['inner-join', 'anti-join', 'null']
  },
  {
    id: 'anti-join', term: 'Anti-join',
    def: 'A pattern that returns rows from one table that have no match in another.',
    deep: 'SQL has no ANTI JOIN keyword. You write it as LEFT JOIN ... WHERE right.key IS NULL, or with NOT EXISTS. NOT EXISTS is often clearest and handles NULLs safely, unlike NOT IN.',
    ex: 'SELECT p.product_id\nFROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM order_items i WHERE i.product_id = p.product_id\n);',
    exCode: true,
    questions: ['Which products have never been ordered?', 'Which sellers made no sales this quarter?'],
    say: 'An anti-join finds rows with no match. I write it with NOT EXISTS or a left join where the right side is NULL.',
    rel: ['left-join', 'null', 'subquery']
  },
  {
    id: 'self-join', term: 'Self join',
    def: 'Joining a table to itself, using two aliases.',
    deep: 'Self joins compare rows within the same table: an employee with their manager, or an order with the same customer\'s previous order. Window functions such as LAG often do the second job more simply.',
    ex: 'SELECT a.customer_id, a.order_id, b.order_id AS other_order\nFROM orders a\nJOIN orders b ON b.customer_id = a.customer_id AND b.order_id <> a.order_id;',
    exCode: true,
    say: 'A self join compares rows in the same table using two aliases. For "previous row" questions I usually reach for LAG instead.',
    rel: ['lag-lead', 'inner-join']
  },
  {
    id: 'fan-out', term: 'Join fan-out',
    def: 'When a join multiplies rows because one side has several matches per key.',
    deep: 'Join orders (one row per order) to order_items (several rows per order) and every order now appears once per item. Any SUM of an order-level number, such as payment_value, is now counted several times. This is the most common silent error in SQL, and AI-written SQL makes it too. The fix is to aggregate each side to the same grain before joining.',
    ex: '-- wrong: payments repeat once per item\nSELECT SUM(p.payment_value)\nFROM order_payments p\nJOIN order_items i ON i.order_id = p.order_id;',
    exCode: true,
    mistakes: ['Summing a column after a one-to-many join.', 'Fixing it with DISTINCT, which hides the problem and can drop real duplicates.'],
    questions: ['Why does revenue in my report not match finance?'],
    say: 'Fan-out is when a one-to-many join repeats rows and inflates totals. I check the grain of each side and aggregate first if they differ.',
    rel: ['grain', 'cardinality', 'inner-join', 'aggregate-function']
  },
  {
    id: 'aggregate-function', term: 'Aggregate function',
    def: 'A function that turns many rows into one value: COUNT, SUM, AVG, MIN, MAX.',
    deep: 'Aggregates summarise a group. Without GROUP BY they summarise the whole table. COUNT(*) counts rows, COUNT(column) counts non-NULL values, and COUNT(DISTINCT column) counts unique values. Those three numbers answer different questions, so pick on purpose.',
    ex: 'SELECT COUNT(*) AS rows_, COUNT(DISTINCT customer_id) AS customers\nFROM orders;',
    exCode: true,
    mistakes: ['Using COUNT(*) when you meant distinct customers.', 'Averaging an average, which weights small groups the same as big ones.'],
    say: 'Aggregates summarise rows into one number. I am careful about COUNT star versus COUNT DISTINCT, because they answer different questions.',
    rel: ['group-by', 'null', 'where-vs-having']
  },
  {
    id: 'group-by', term: 'GROUP BY',
    def: 'Folds rows that share the same values into one row per group.',
    deep: 'GROUP BY sets the grain of your result. Every column in SELECT must either be in the GROUP BY or be inside an aggregate. Ask "what should one row of my answer be?" and group by exactly that.',
    ex: 'SELECT order_status, COUNT(*) AS orders\nFROM orders\nGROUP BY order_status;',
    exCode: true,
    mistakes: ['Selecting a column that is neither grouped nor aggregated.', 'Grouping by too many columns, which splits groups you meant to combine.'],
    questions: ['How many orders are in each status?', 'What is revenue per category per month?'],
    say: 'GROUP BY sets the level of the result. If I group by customer, I get one row per customer.',
    rel: ['aggregate-function', 'where-vs-having', 'grain']
  },
  {
    id: 'where-vs-having', term: 'WHERE vs HAVING',
    def: 'WHERE filters rows before grouping. HAVING filters groups after aggregation.',
    deep: 'The difference comes from the order the query runs: WHERE runs before GROUP BY, so it cannot see COUNT or SUM. HAVING runs after, so it can. Filter as early as you can with WHERE, because it makes the query cheaper.',
    ex: "SELECT customer_id, COUNT(*) AS orders\nFROM orders\nWHERE order_status = 'delivered'\nGROUP BY customer_id\nHAVING COUNT(*) > 3;",
    exCode: true,
    say: 'WHERE filters individual rows, HAVING filters aggregated groups. A condition on COUNT or SUM belongs in HAVING.',
    rel: ['group-by', 'query-order']
  },
  {
    id: 'query-order', term: 'Logical query order',
    def: 'The order the database works through a query, which differs from the order you write it.',
    deep: 'You write SELECT first, but it runs after FROM, JOIN, WHERE, GROUP BY and HAVING. That explains several rules at once: WHERE cannot use a SELECT alias, HAVING can use aggregates, and ORDER BY can use aliases because it runs last.',
    ex: 'Written: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT\nRuns:    FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT',
    say: 'SQL runs FROM and WHERE first and SELECT near the end, which is why WHERE cannot see an alias but ORDER BY can.',
    rel: ['where-vs-having', 'group-by']
  },
  {
    id: 'distinct', term: 'DISTINCT',
    def: 'Removes duplicate rows from the result.',
    deep: 'DISTINCT applies to the whole selected row, not one column. It is fine for listing unique values. Reaching for it to "fix" duplicates after a join is a warning sign: the duplicates usually mean a fan-out that also inflates any totals.',
    mistakes: ['Using DISTINCT to hide a bad join.', 'Expecting SELECT DISTINCT a, b to make only a unique.'],
    say: 'DISTINCT removes duplicate rows. If I need it after a join, I first ask why the duplicates appeared.',
    rel: ['fan-out', 'deduplication']
  },
  {
    id: 'subquery', term: 'Subquery',
    def: 'A query nested inside another query.',
    deep: 'Subqueries can sit in WHERE (a list or a test), in FROM (a derived table) or in SELECT (one value per row). A correlated subquery refers to the outer query and runs once per outer row, which can be slow on big tables.',
    ex: 'SELECT * FROM orders\nWHERE customer_id IN (SELECT customer_id FROM customers WHERE customer_state = \'SP\');',
    exCode: true,
    say: 'A subquery is a query inside a query. When it gets hard to read I rewrite it as a CTE.',
    rel: ['cte', 'anti-join']
  },
  {
    id: 'cte', term: 'CTE',
    def: 'Common table expression. A named temporary result defined with WITH at the top of a query.',
    deep: 'CTEs let you build a query in readable steps: clean, then aggregate, then rank. Each step has a name you can explain out loud. They also make debugging easier, because you can select from one step on its own.',
    ex: "WITH monthly AS (\n  SELECT strftime('%Y-%m', order_purchase_date) AS month, COUNT(*) AS orders\n  FROM orders GROUP BY month\n)\nSELECT * FROM monthly ORDER BY month;",
    exCode: true,
    say: 'A CTE names a step of the query with WITH, so I can build complex logic in readable, testable pieces.',
    rel: ['subquery', 'window-function']
  },
  {
    id: 'window-function', term: 'Window function',
    def: 'A calculation across related rows that does not collapse them, written with OVER.',
    deep: 'GROUP BY gives one row per group. A window function keeps every row and adds a value calculated across a "window" of rows: a rank, a running total, the previous value or a share of the group. The window is defined by PARTITION BY (which rows belong together) and ORDER BY (their order).',
    ex: 'SELECT order_id, customer_id,\n       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_purchase_date) AS nth_order\nFROM orders;',
    exCode: true,
    questions: ['What was each customer\'s first order?', 'What is the running total of revenue by day?'],
    say: 'A window function calculates across related rows without collapsing them, so I keep detail and add a rank or running total.',
    rel: ['partition-by', 'ranking-functions', 'running-total', 'lag-lead']
  },
  {
    id: 'partition-by', term: 'PARTITION BY',
    def: 'Inside OVER, splits rows into groups so the window function restarts for each group.',
    deep: 'PARTITION BY is GROUP BY for windows, except the rows are not collapsed. Leave it out and the window covers the whole result.',
    ex: 'SUM(price) OVER (PARTITION BY seller_id)  -- each row gets its seller\'s total',
    exCode: true,
    say: 'PARTITION BY splits the window into groups, like GROUP BY but without collapsing the rows.',
    rel: ['window-function', 'group-by']
  },
  {
    id: 'ranking-functions', term: 'ROW_NUMBER, RANK, DENSE_RANK',
    def: 'Three ways to number rows. ROW_NUMBER never ties; RANK ties and skips; DENSE_RANK ties without gaps.',
    deep: 'With scores 100, 90, 90, 80: ROW_NUMBER gives 1, 2, 3, 4; RANK gives 1, 2, 2, 4; DENSE_RANK gives 1, 2, 2, 3. Use ROW_NUMBER to pick exactly one row per group (latest order, deduplication). Use RANK or DENSE_RANK when ties should share a place.',
    ex: '-- latest order per customer\nSELECT * FROM (\n  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_purchase_date DESC) AS rn\n  FROM orders o\n) WHERE rn = 1;',
    exCode: true,
    mistakes: ['Using RANK to pick one row per group, then getting two rows on a tie.'],
    questions: ['Who are the top three sellers in each state?'],
    say: 'ROW_NUMBER never ties, RANK leaves gaps after ties, DENSE_RANK does not. For one row per group I use ROW_NUMBER.',
    rel: ['window-function', 'deduplication', 'top-n-per-group']
  },
  {
    id: 'top-n-per-group', term: 'Top N per group',
    def: 'Picking the best few rows within each group, such as the top three products per category.',
    deep: 'This is one of the most common interview questions. The pattern is: rank inside a window partitioned by the group, then filter on the rank in an outer query or CTE. You cannot filter on a window function in WHERE, because WHERE runs first.',
    ex: 'WITH ranked AS (\n  SELECT category, product_id, revenue,\n         DENSE_RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS r\n  FROM product_revenue\n)\nSELECT * FROM ranked WHERE r <= 3;',
    exCode: true,
    questions: ['What are the best-selling three products in each category?'],
    say: 'For top N per group I rank inside a window partitioned by the group, then filter the rank in an outer step.',
    rel: ['ranking-functions', 'cte', 'query-order']
  },
  {
    id: 'running-total', term: 'Running total',
    def: 'A cumulative sum that grows row by row in a chosen order.',
    deep: 'Written as SUM(x) OVER (ORDER BY date). Add PARTITION BY to restart per group. Be aware of the default frame: with ORDER BY, the window runs from the first row to the current row, and rows with the same date are added together.',
    ex: 'SELECT day, revenue,\n       SUM(revenue) OVER (ORDER BY day) AS revenue_to_date\nFROM daily_revenue;',
    exCode: true,
    questions: ['How close are we to the monthly target today?'],
    say: 'A running total is SUM over an ordered window. I add PARTITION BY when it should restart, for example each month.',
    rel: ['window-function', 'moving-average']
  },
  {
    id: 'moving-average', term: 'Moving average',
    def: 'The average of the last few periods, recalculated at each row to smooth out noise.',
    deep: 'A 7-day moving average removes the weekday pattern so you can see the trend. In SQL it uses a window frame: AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW). Missing days break it, so fill the date gaps first.',
    ex: 'AVG(orders) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)',
    exCode: true,
    mistakes: ['Forgetting missing days, so "7 rows" covers more than 7 days.'],
    questions: ['Is the sales trend really going up, or was it one good day?'],
    say: 'A moving average smooths noise. I use a window frame of the last N rows and make sure no dates are missing.',
    rel: ['running-total', 'seasonality', 'window-function']
  },
  {
    id: 'lag-lead', term: 'LAG and LEAD',
    def: 'Window functions that read a value from the previous (LAG) or next (LEAD) row.',
    deep: 'LAG makes period-on-period comparisons simple: this month minus LAG(this month). It also finds gaps between events, such as days between a customer\'s orders.',
    ex: 'SELECT month, revenue,\n       revenue - LAG(revenue) OVER (ORDER BY month) AS change\nFROM monthly_revenue;',
    exCode: true,
    questions: ['How did revenue change month on month?', 'How long do customers wait between orders?'],
    say: 'LAG reads the previous row and LEAD the next, which makes month-on-month change or time between orders a one-liner.',
    rel: ['window-function', 'self-join', 'growth-rate']
  },
  {
    id: 'case', term: 'CASE',
    def: 'Conditional logic inside a query: CASE WHEN ... THEN ... ELSE ... END.',
    deep: 'CASE builds buckets (small, medium, large orders), cleans categories and makes conditional counts: SUM(CASE WHEN status = \'cancelled\' THEN 1 ELSE 0 END) counts cancellations inside a normal GROUP BY. Conditions are checked top to bottom and the first match wins.',
    ex: "SELECT customer_state,\n       SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS cancel_rate\nFROM orders o JOIN customers c USING (customer_id)\nGROUP BY customer_state;",
    exCode: true,
    mistakes: ['Ordering conditions so an earlier, broader one catches rows meant for a later one.', 'Leaving out ELSE and getting NULLs.'],
    say: 'CASE adds if-then logic. I use it to bucket values and to count conditionally inside a GROUP BY.',
    rel: ['coalesce', 'conversion-rate']
  },
  {
    id: 'union', term: 'UNION vs UNION ALL',
    def: 'Both stack results. UNION removes duplicate rows; UNION ALL keeps every row.',
    deep: 'UNION ALL is faster and usually what you want when the sources do not overlap. UNION has to sort or hash every row to remove duplicates, and may remove rows you meant to keep. The column count and types must line up in both parts.',
    say: 'Both stack rows. UNION removes duplicates and costs more; I use UNION ALL unless I really need the de-duplication.',
    rel: ['distinct']
  },
  {
    id: 'date-functions', term: 'Date truncation',
    def: 'Rounding a date down to a period, such as the start of its month, so you can group by it.',
    deep: 'Every dialect does this differently: DATE_TRUNC in PostgreSQL, strftime in SQLite, DATETRUNC or FORMAT in SQL Server, DATE_TRUNC with different argument order in BigQuery. Time zones matter too: an order at 23:30 UTC may belong to the next day locally.',
    ex: "SELECT strftime('%Y-%m', order_purchase_date) AS month, COUNT(*)\nFROM orders GROUP BY month;  -- SQLite",
    exCode: true,
    questions: ['How many orders did we get each month?'],
    say: 'To report by month I truncate the date to the month. The function differs by dialect, and I check the time zone.',
    rel: ['sql-dialect', 'seasonality']
  },
  {
    id: 'view', term: 'View',
    def: 'A saved query that you can select from like a table.',
    deep: 'A view stores the query, not the data, so it is always up to date but runs each time. A materialised view stores the result and must be refreshed. Views are a simple way to give people a clean, agreed version of a table.',
    say: 'A view stores the query, not the data. It gives everyone the same clean logic without copying tables.',
    rel: ['materialised-view', 'semantic-layer']
  },
  {
    id: 'materialised-view', term: 'Materialised view',
    def: 'A view whose result is stored, so reading it is fast, but it must be refreshed.',
    deep: 'Materialised views trade freshness for speed. They suit expensive aggregates read often, such as a daily sales summary. The question to ask is how stale the data is allowed to be.',
    say: 'A materialised view stores the result, so it is fast to read but only as fresh as its last refresh.',
    rel: ['view', 'data-freshness']
  },
  {
    id: 'index', term: 'Index',
    def: 'A structure that helps the database find rows quickly, like the index of a book.',
    deep: 'Indexes speed up lookups and joins on the indexed columns, but slow down writes and take space. In columnar cloud warehouses there are often no indexes in the usual sense; partitioning and clustering do the same job.',
    say: 'An index speeds up finding rows by a column, at the cost of slower writes. In cloud warehouses I think about partitioning instead.',
    rel: ['query-plan', 'table-partitioning']
  },
  {
    id: 'query-plan', term: 'Query plan',
    def: 'The database\'s step-by-step plan for running a query, shown with EXPLAIN.',
    deep: 'The plan shows whether the database scans a whole table, uses an index, and in what order it joins. When a query is slow, read the plan before rewriting. Common fixes: filter earlier, select fewer columns, aggregate before joining.',
    ex: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = \'C001\';  -- SQLite',
    exCode: true,
    say: 'When a query is slow I read its plan with EXPLAIN, to see full scans and join order before I change anything.',
    rel: ['index', 'table-partitioning']
  },
  {
    id: 'sql-dialect', term: 'SQL dialect',
    def: 'A database\'s own flavour of SQL. The core is shared, but functions and some syntax differ.',
    deep: 'SELECT, JOIN and GROUP BY work everywhere. Dates, text functions, LIMIT versus TOP, and quoting differ. AI tools often mix dialects, so knowing which one you are in is a real check. The table below shows the same idea in SQLite (which runs on this site), PostgreSQL, SQL Server, BigQuery and Snowflake. In the SQL lab, run a query and choose "Translate to another database" to see your own query rewritten.',
    say: 'Each database has its own dialect. The core is the same, but I check date functions, LIMIT versus TOP and string handling.',
    compare: true,
    rel: ['date-functions', 'coalesce']
  }
]);

// Dialect reference and "translate this" drills.
// SQLite is the engine that runs inside this site. The other three are shown for comparison only.
// To add a row: copy one block in DIALECT_ROWS and edit it. "try" is optional: SQL that runs here on the sample data.
window.DIALECTS = [
  { id: 'sqlite', name: 'SQLite (runs here)' },
  { id: 'pg',     name: 'PostgreSQL' },
  { id: 'mssql',  name: 'SQL Server' },
  { id: 'bq',     name: 'BigQuery' }
];

window.DIALECT_ROWS = [
  { id: 'r-limit', group: 'Limiting rows', title: 'First five rows',
    sqlite: 'SELECT * FROM orders\nORDER BY order_purchase_date\nLIMIT 5;',
    pg:     'SELECT * FROM orders\nORDER BY order_purchase_date\nLIMIT 5;',
    mssql:  'SELECT TOP 5 * FROM orders\nORDER BY order_purchase_date;',
    bq:     'SELECT * FROM orders\nORDER BY order_purchase_date\nLIMIT 5;',
    note: 'SQL Server puts TOP right after SELECT. The others put LIMIT at the very end.',
    try: 'SELECT order_id, order_purchase_date FROM orders ORDER BY order_purchase_date LIMIT 5' },

  { id: 'r-length', group: 'Text', title: 'Length of a text value',
    sqlite: 'LENGTH(customer_city)', pg: 'LENGTH(customer_city)', mssql: 'LEN(customer_city)', bq: 'LENGTH(customer_city)',
    note: 'Only SQL Server calls it LEN.',
    try: 'SELECT customer_city, LENGTH(customer_city) AS city_length FROM customers LIMIT 5' },

  { id: 'r-concat', group: 'Text', title: 'Joining text together',
    sqlite: "customer_city || ', ' || customer_state", pg: "customer_city || ', ' || customer_state",
    mssql: "CONCAT(customer_city, ', ', customer_state)", bq: "CONCAT(customer_city, ', ', customer_state)",
    note: 'CONCAT is the safest choice because it works in all four. In SQL Server, + also works, but a NULL makes the whole result NULL.',
    try: "SELECT customer_city || ', ' || customer_state AS place FROM customers LIMIT 5" },

  { id: 'r-substr', group: 'Text', title: 'First three letters',
    sqlite: 'SUBSTR(customer_city, 1, 3)', pg: 'SUBSTRING(customer_city, 1, 3)', mssql: 'SUBSTRING(customer_city, 1, 3)', bq: 'SUBSTR(customer_city, 1, 3)',
    note: 'The position counts from 1 in all four. The function name is SUBSTR or SUBSTRING depending on the database.',
    try: 'SELECT customer_city, SUBSTR(customer_city, 1, 3) AS first_three FROM customers LIMIT 5' },

  { id: 'r-aggtext', group: 'Text', title: 'Combine values from many rows into one text',
    sqlite: "GROUP_CONCAT(customer_city, ', ')", pg: "STRING_AGG(customer_city, ', ')", mssql: "STRING_AGG(customer_city, ', ')", bq: "STRING_AGG(customer_city, ', ')",
    note: 'SQLite is the odd one out here, and calls it GROUP_CONCAT.',
    try: "SELECT customer_state, GROUP_CONCAT(DISTINCT customer_city) AS cities FROM customers GROUP BY customer_state" },

  { id: 'r-null', group: 'Missing values', title: 'Replace NULL with a default',
    sqlite: "IFNULL(product_category, 'unknown')", pg: "COALESCE(product_category, 'unknown')", mssql: "ISNULL(product_category, 'unknown')", bq: "IFNULL(product_category, 'unknown')",
    note: 'COALESCE(a, b) works in all four and is the portable choice. ISNULL is SQL Server only.',
    try: "SELECT product_id, IFNULL(product_category, 'unknown') AS category FROM products LIMIT 8" },

  { id: 'r-divide', group: 'Numbers', title: 'Divide, avoiding divide-by-zero',
    sqlite: 'paid * 1.0 / NULLIF(orders, 0)', pg: 'paid::numeric / NULLIF(orders, 0)', mssql: 'paid * 1.0 / NULLIF(orders, 0)', bq: 'SAFE_DIVIDE(paid, orders)',
    note: 'NULLIF(x, 0) turns a zero into NULL so the division returns NULL instead of an error. BigQuery has SAFE_DIVIDE built in.' },

  { id: 'r-intdiv', group: 'Numbers', title: 'Dividing two whole numbers: 7 / 2',
    sqlite: '7 / 2   -- gives 3', pg: '7 / 2   -- gives 3', mssql: '7 / 2   -- gives 3', bq: '7 / 2   -- gives 3.5\nDIV(7, 2) -- gives 3',
    note: 'A trap when moving a query to BigQuery: its / always returns a decimal. Use DIV for whole-number division.',
    try: 'SELECT 7 / 2 AS sqlite_result, 7 * 1.0 / 2 AS decimal_result' },

  { id: 'r-cast', group: 'Numbers', title: 'Change a data type',
    sqlite: 'CAST(price AS INTEGER)', pg: 'CAST(price AS INTEGER)   -- or price::integer', mssql: 'CAST(price AS INT)', bq: 'CAST(price AS INT64)\nSAFE_CAST(price AS INT64)',
    note: 'BigQuery names its types differently (INT64, FLOAT64). SAFE_CAST returns NULL instead of an error when a value cannot be converted.',
    try: 'SELECT price, CAST(price AS INTEGER) AS whole_price FROM order_items LIMIT 5' },

  { id: 'r-datediff', group: 'Dates', title: 'Days between two dates',
    sqlite: 'julianday(order_delivered_date) - julianday(order_purchase_date)',
    pg: 'order_delivered_date - order_purchase_date',
    mssql: 'DATEDIFF(day, order_purchase_date, order_delivered_date)',
    bq: 'DATE_DIFF(order_delivered_date, order_purchase_date, DAY)',
    note: 'Watch the argument order: SQL Server takes the earlier date first, BigQuery takes the later date first.',
    try: 'SELECT order_id, julianday(order_delivered_date) - julianday(order_purchase_date) AS days_to_deliver FROM orders WHERE order_delivered_date IS NOT NULL LIMIT 5' },

  { id: 'r-dateadd', group: 'Dates', title: 'Add seven days to a date',
    sqlite: "date(order_purchase_date, '+7 days')", pg: "order_purchase_date + INTERVAL '7 days'", mssql: 'DATEADD(day, 7, order_purchase_date)', bq: 'DATE_ADD(order_purchase_date, INTERVAL 7 DAY)',
    note: 'The date part (day) comes first in SQL Server and last in BigQuery.',
    try: "SELECT order_purchase_date, date(order_purchase_date, '+7 days') AS plus_seven FROM orders LIMIT 5" },

  { id: 'r-trunc', group: 'Dates', title: 'First day of the month',
    sqlite: "strftime('%Y-%m-01', order_purchase_date)", pg: "DATE_TRUNC('month', order_purchase_date)", mssql: 'DATETRUNC(month, order_purchase_date)   -- SQL Server 2022 and later', bq: 'DATE_TRUNC(order_purchase_date, MONTH)',
    note: 'PostgreSQL takes the part first as text, BigQuery takes the date first and the part without quotes. Older SQL Server versions use DATEFROMPARTS(YEAR(d), MONTH(d), 1).',
    try: "SELECT strftime('%Y-%m-01', order_purchase_date) AS month_start, COUNT(*) AS orders FROM orders GROUP BY month_start ORDER BY month_start LIMIT 6" },

  { id: 'r-extract', group: 'Dates', title: 'Month number of a date',
    sqlite: "CAST(strftime('%m', order_purchase_date) AS INTEGER)", pg: 'EXTRACT(MONTH FROM order_purchase_date)', mssql: 'MONTH(order_purchase_date)', bq: 'EXTRACT(MONTH FROM order_purchase_date)',
    note: 'SQL Server has no EXTRACT. Use MONTH(), YEAR() or DATEPART(month, date).',
    try: "SELECT order_purchase_date, CAST(strftime('%m', order_purchase_date) AS INTEGER) AS month_number FROM orders LIMIT 5" },

  { id: 'r-today', group: 'Dates', title: "Today's date",
    sqlite: "date('now')", pg: 'CURRENT_DATE', mssql: 'CAST(GETDATE() AS date)', bq: 'CURRENT_DATE()',
    note: 'BigQuery writes the brackets, PostgreSQL does not.',
    try: "SELECT date('now') AS today" },

  { id: 'r-quote', group: 'Names', title: 'Quoting a table or column name',
    sqlite: '"order items"', pg: '"order items"', mssql: '[order items]', bq: '`order items`',
    note: 'In BigQuery, double quotes make a text value, not a name. Backticks are for names.' },

  { id: 'r-table', group: 'Names', title: 'Full name of a table',
    sqlite: 'orders', pg: 'public.orders   -- schema.table', mssql: 'olist.dbo.orders   -- database.schema.table', bq: '`my-project.olist.orders`   -- project.dataset.table',
    note: 'BigQuery tables live inside a project and a dataset. Wrap the whole name in backticks when the project name contains a hyphen.' },

  { id: 'r-groupby', group: 'Clauses', title: 'GROUP BY a column by position',
    sqlite: 'GROUP BY 1', pg: 'GROUP BY 1', mssql: 'GROUP BY customer_state   -- positions are not allowed', bq: 'GROUP BY 1   -- or GROUP BY ALL',
    note: 'SQL Server needs the column written out in GROUP BY, although ORDER BY 1 works. Names are always the safer habit.',
    try: 'SELECT customer_state, COUNT(*) AS customers FROM customers GROUP BY 1' },

  { id: 'r-qualify', group: 'Clauses', title: 'Latest order per customer without a CTE',
    sqlite: 'WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY customer_id ORDER BY order_purchase_date DESC) AS rn\n  FROM orders\n)\nSELECT * FROM ranked WHERE rn = 1;',
    pg: 'WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY customer_id ORDER BY order_purchase_date DESC) AS rn\n  FROM orders\n)\nSELECT * FROM ranked WHERE rn = 1;',
    mssql: 'WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY customer_id ORDER BY order_purchase_date DESC) AS rn\n  FROM orders\n)\nSELECT * FROM ranked WHERE rn = 1;',
    bq: 'SELECT *\nFROM orders\nQUALIFY ROW_NUMBER() OVER (\n  PARTITION BY customer_id ORDER BY order_purchase_date DESC) = 1;',
    note: 'QUALIFY filters on a window function directly. BigQuery has it, and so do Snowflake and DuckDB. PostgreSQL and SQL Server need the CTE.' }
];

// "Translate this": pick the version that works in the target dialect. Exactly one option is correct.
window.TRANSLATE = [
  { id: 't-top', from: 'SQL Server', to: 'BigQuery',
    code: 'SELECT TOP 5 *\nFROM orders\nORDER BY price DESC;',
    options: ['SELECT * FROM orders ORDER BY price DESC LIMIT 5;', 'SELECT * FROM orders ORDER BY price DESC TOP 5;', 'SELECT * FROM orders LIMIT 5 ORDER BY price DESC;', 'SELECT FIRST 5 * FROM orders ORDER BY price DESC;'],
    answer: 0,
    why: 'BigQuery uses LIMIT, and LIMIT is always the last clause, after ORDER BY.' },

  { id: 't-datediff', from: 'SQL Server', to: 'BigQuery',
    code: 'DATEDIFF(day, order_purchase_date, order_delivered_date)',
    options: ['DATE_DIFF(order_purchase_date, order_delivered_date, DAY)', 'DATE_DIFF(order_delivered_date, order_purchase_date, DAY)', 'DATEDIFF(day, order_purchase_date, order_delivered_date)', 'order_delivered_date - order_purchase_date'],
    answer: 1,
    why: 'BigQuery\'s DATE_DIFF takes the later date first, so the order is reversed compared with SQL Server. The first option would give negative numbers.' },

  { id: 't-month', from: 'PostgreSQL', to: 'SQL Server',
    code: 'EXTRACT(MONTH FROM order_purchase_date)',
    options: ['EXTRACT(MONTH FROM order_purchase_date)', 'MONTH(order_purchase_date)', 'DATEPART(order_purchase_date, month)', 'MONTH FROM order_purchase_date'],
    answer: 1,
    why: 'SQL Server has no EXTRACT. MONTH(date) is the short form; DATEPART(month, date) also works, with the part first.' },

  { id: 't-isnull', from: 'SQL Server', to: 'BigQuery',
    code: "ISNULL(product_category, 'unknown')",
    options: ["IFNULL(product_category, 'unknown')", "ISNULL(product_category, 'unknown')", "NVL(product_category, 'unknown')", "IF NULL product_category THEN 'unknown'"],
    answer: 0,
    why: 'BigQuery uses IFNULL. COALESCE(product_category, \'unknown\') would work too, and works in every dialect.' },

  { id: 't-len', from: 'SQL Server', to: 'BigQuery',
    code: 'LEN(customer_city)',
    options: ['LEN(customer_city)', 'SIZE(customer_city)', 'LENGTH(customer_city)', 'STRLEN(customer_city)'],
    answer: 2,
    why: 'LEN is specific to SQL Server. BigQuery, PostgreSQL and SQLite all use LENGTH.' },

  { id: 't-cast', from: 'PostgreSQL', to: 'BigQuery',
    code: 'order_purchase_date::date',
    options: ['order_purchase_date::DATE', 'CAST(order_purchase_date AS DATE)', 'TO_DATE(order_purchase_date)', 'CONVERT(DATE, order_purchase_date)'],
    answer: 1,
    why: 'The :: shortcut is PostgreSQL only. CAST(... AS type) is the portable form and works in BigQuery. CONVERT(DATE, x) is SQL Server style.' },

  { id: 't-trunc', from: 'PostgreSQL', to: 'BigQuery',
    code: "DATE_TRUNC('month', order_purchase_date)",
    options: ["DATE_TRUNC('month', order_purchase_date)", 'DATE_TRUNC(MONTH, order_purchase_date)', 'DATE_TRUNC(order_purchase_date, MONTH)', "TRUNC(order_purchase_date, 'MM')"],
    answer: 2,
    why: 'BigQuery flips the order: the date comes first, then the part as a keyword with no quotes.' },

  { id: 't-dateadd', from: 'SQL Server', to: 'BigQuery',
    code: 'DATEADD(day, 7, order_purchase_date)',
    options: ['order_purchase_date + 7', 'DATEADD(order_purchase_date, 7, DAY)', 'DATE_ADD(order_purchase_date, INTERVAL 7 DAY)', 'ADD_DAYS(order_purchase_date, 7)'],
    answer: 2,
    why: 'BigQuery\'s DATE_ADD takes the date, then an INTERVAL with a number and a part.' },

  { id: 't-agg', from: 'SQLite', to: 'BigQuery',
    code: "GROUP_CONCAT(customer_city, ', ')",
    options: ["LISTAGG(customer_city, ', ')", "GROUP_CONCAT(customer_city, ', ')", "ARRAY_AGG(customer_city)", "STRING_AGG(customer_city, ', ')"],
    answer: 3,
    why: 'STRING_AGG builds one text value. ARRAY_AGG returns a list, not text.' },

  { id: 't-name', from: 'PostgreSQL', to: 'BigQuery',
    code: 'SELECT * FROM "my-project".olist.orders;',
    options: ['SELECT * FROM `my-project.olist.orders`;', 'SELECT * FROM "my-project.olist.orders";', 'SELECT * FROM [my-project].[olist].[orders];', 'SELECT * FROM my-project.olist.orders;'],
    answer: 0,
    why: 'Backticks quote names in BigQuery. Double quotes make a text value, and without quotes the hyphen is read as a minus sign.' },

  { id: 't-qualify', kind: 'question', from: 'PostgreSQL', to: 'BigQuery',
    code: 'Filter rows by ROW_NUMBER() without a CTE or subquery.\nWhich clause does it?',
    options: ['HAVING', 'QUALIFY', 'WHERE ... OVER', 'FILTER'],
    answer: 1,
    why: 'QUALIFY is to window functions what HAVING is to GROUP BY. PostgreSQL does not have it, so there you need a CTE or subquery.' },

  { id: 't-div', kind: 'question', from: 'SQL Server', to: 'BigQuery',
    code: 'SELECT 7 / 2;   -- returns 3 in SQL Server\nWhat does BigQuery return?',
    options: ['3', '3.5', '4', 'An error'],
    answer: 1,
    why: 'BigQuery\'s / returns a decimal even for whole numbers. Use DIV(7, 2) when you want 3.' },

  { id: 't-partition', kind: 'question', from: 'BigQuery', to: 'BigQuery',
    code: 'The table orders is partitioned by order_purchase_date.\nWhich query reads the least data?',
    options: ['SELECT * FROM orders LIMIT 10;', "SELECT * FROM orders WHERE customer_id = 'C001';", "SELECT * FROM orders WHERE order_purchase_date >= '2026-10-01';", 'SELECT * FROM orders ORDER BY order_purchase_date;'],
    answer: 2,
    why: 'Filtering on the partition column lets BigQuery skip whole partitions. LIMIT does not reduce what is scanned, and a filter on another column does not skip partitions.' }
];

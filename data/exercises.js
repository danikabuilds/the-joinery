// Exercises for the SQL lab.
// To add your own: copy one block, give it a new unique id, and write the solution.
// ordered: true means the row order is checked (use it when the task asks for sorting).
window.TOPICS = [
  { id: 'select',  clause: 'SELECT',       name: 'Choosing columns and rows' },
  { id: 'where',   clause: 'WHERE',        name: 'Filtering' },
  { id: 'group',   clause: 'GROUP BY',     name: 'Aggregating and HAVING' },
  { id: 'join',    clause: 'JOIN',         name: 'Combining tables' },
  { id: 'union',   clause: 'UNION ALL',    name: 'Stacking results and CASE' },
  { id: 'cte',     clause: 'WITH',         name: 'CTEs' },
  { id: 'window',  clause: 'PARTITION BY', name: 'Window functions' }
];

window.EXERCISES = [
  // ---------- SELECT ----------
  {
    id: 'select-columns', topic: 'select', title: 'Pick two columns',
    prompt: 'Show the customer_id and customer_city of every customer.',
    hint: 'SELECT lists the columns you want, FROM names the table.',
    solution: 'SELECT customer_id, customer_city\nFROM customers;',
    explain: 'Every query starts with these two: SELECT says what to show, FROM says where it lives.'
  },
  {
    id: 'select-distinct', topic: 'select', title: 'Unique values, sorted', ordered: true,
    prompt: 'List each customer_state once, in alphabetical order.',
    hint: 'DISTINCT goes straight after SELECT. ORDER BY goes at the end.',
    solution: 'SELECT DISTINCT customer_state\nFROM customers\nORDER BY customer_state;',
    explain: 'DISTINCT removes duplicate rows from the result. ORDER BY is always the last thing to run before LIMIT.'
  },
  {
    id: 'select-top5', topic: 'select', title: 'Top five by freight', ordered: true,
    prompt: 'Show order_id, product_id and freight_value for the 5 order items with the highest freight_value, highest first.',
    hint: 'Sort with ORDER BY freight_value DESC, then keep 5 rows with LIMIT 5.',
    solution: 'SELECT order_id, product_id, freight_value\nFROM order_items\nORDER BY freight_value DESC\nLIMIT 5;',
    explain: 'LIMIT comes after ORDER BY. In SQL Server the same idea is written SELECT TOP 5.'
  },

  // ---------- WHERE ----------
  {
    id: 'where-equals', topic: 'where', title: 'Cancelled orders',
    prompt: "Show order_id, customer_id and order_purchase_date for orders whose order_status is 'canceled'.",
    hint: "Text values go in single quotes: WHERE order_status = 'canceled'.",
    solution: "SELECT order_id, customer_id, order_purchase_date\nFROM orders\nWHERE order_status = 'canceled';",
    explain: 'WHERE filters rows before anything is grouped or counted.'
  },
  {
    id: 'where-in-and', topic: 'where', title: 'Two conditions',
    prompt: "Show product_id, product_category and product_weight_g for products in the 'toys' or 'housewares' category that weigh more than 1000 g.",
    hint: "Use IN ('toys', 'housewares') for the category, then AND for the weight.",
    solution: "SELECT product_id, product_category, product_weight_g\nFROM products\nWHERE product_category IN ('toys', 'housewares')\n  AND product_weight_g > 1000;",
    explain: 'IN is a shorter way of writing several ORs. If you mix AND with OR, use brackets so the logic is clear.'
  },
  {
    id: 'where-null', topic: 'where', title: 'Not delivered yet',
    prompt: 'Show order_id and order_status for orders that have no delivered date.',
    hint: 'You cannot write = NULL. Use IS NULL.',
    solution: 'SELECT order_id, order_status\nFROM orders\nWHERE order_delivered_date IS NULL;',
    explain: 'NULL means "unknown", so nothing is ever equal to it. IS NULL and IS NOT NULL are the only tests that work.'
  },

  // ---------- GROUP BY ----------
  {
    id: 'group-count', topic: 'group', title: 'Orders per status',
    prompt: 'Count the orders in each order_status. Show order_status and the count.',
    hint: 'GROUP BY order_status, and use COUNT(*) in the SELECT.',
    solution: 'SELECT order_status, COUNT(*) AS order_count\nFROM orders\nGROUP BY order_status;',
    explain: 'GROUP BY folds many rows into one row per group. Every column in SELECT must be in the GROUP BY or inside an aggregate.'
  },
  {
    id: 'group-sum', topic: 'group', title: 'Money per payment type',
    prompt: 'For each payment_type show the total payment_value and the average payment_value, both rounded to 2 decimal places.',
    hint: 'SUM(payment_value) and AVG(payment_value), each wrapped in ROUND(..., 2).',
    solution: 'SELECT payment_type,\n       ROUND(SUM(payment_value), 2) AS total_value,\n       ROUND(AVG(payment_value), 2) AS avg_value\nFROM order_payments\nGROUP BY payment_type;',
    explain: 'You can use several aggregates in one query as long as they share the same grouping.'
  },
  {
    id: 'group-having', topic: 'group', title: 'Repeat customers',
    prompt: 'Show customer_id and their number of orders, only for customers with more than 3 orders.',
    hint: 'A filter on a count cannot go in WHERE. It goes in HAVING, after GROUP BY.',
    solution: 'SELECT customer_id, COUNT(*) AS order_count\nFROM orders\nGROUP BY customer_id\nHAVING COUNT(*) > 3;',
    explain: 'WHERE filters rows before grouping. HAVING filters groups after grouping. That is the whole difference.'
  },
  {
    id: 'group-full', topic: 'group', title: 'The full clause order', ordered: true,
    prompt: 'Show seller_id and their total sales (sum of price, rounded to 2 decimals), counting only items priced above 20. Keep sellers whose total is above 2000, highest total first.',
    hint: 'Order of clauses: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY.',
    solution: 'SELECT seller_id, ROUND(SUM(price), 2) AS total_sales\nFROM order_items\nWHERE price > 20\nGROUP BY seller_id\nHAVING SUM(price) > 2000\nORDER BY total_sales DESC;',
    explain: 'This one query uses six clauses in their fixed order. If you can write this from memory, clause placement is no longer a problem.'
  },

  // ---------- JOIN ----------
  {
    id: 'join-inner', topic: 'join', title: 'Orders with their city',
    prompt: "Show order_id, customer_city and order_status for orders placed by customers in state 'RJ'.",
    hint: 'JOIN customers to orders ON the customer_id they share, then filter with WHERE.',
    solution: "SELECT o.order_id, c.customer_city, o.order_status\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nWHERE c.customer_state = 'RJ';",
    explain: 'JOIN sits directly after FROM and before WHERE. Short aliases (o, c) keep the query readable.'
  },
  {
    id: 'join-left', topic: 'join', title: 'Customers who never ordered',
    prompt: 'Show the customer_id of customers who have no orders at all.',
    hint: 'LEFT JOIN orders to customers, then keep the rows where the order side IS NULL.',
    solution: 'SELECT c.customer_id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;',
    explain: 'A LEFT JOIN keeps every row from the left table. Where there is no match, the right side is filled with NULLs, which is exactly what you filter for.'
  },
  {
    id: 'join-agg', topic: 'join', title: 'Revenue per category',
    prompt: 'Show each product_category and its total revenue (sum of price, rounded to 2 decimals). Products with no category should appear as their own group.',
    hint: 'Join order_items to products on product_id, then GROUP BY product_category.',
    solution: 'SELECT p.product_category, ROUND(SUM(oi.price), 2) AS revenue\nFROM order_items oi\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY p.product_category;',
    explain: 'Join first, aggregate second. GROUP BY treats all NULLs as one group.'
  },

  // ---------- UNION / CASE ----------
  {
    id: 'union-all', topic: 'union', title: 'Stack two tables',
    prompt: "Build one list of every city from customers and from sellers. Show the city and a second column that says 'customer' or 'seller'. Keep duplicates.",
    hint: "Write two SELECTs with the same number of columns and put UNION ALL between them.",
    solution: "SELECT customer_city AS city, 'customer' AS source\nFROM customers\nUNION ALL\nSELECT seller_city, 'seller'\nFROM sellers;",
    explain: 'UNION ALL stacks results on top of each other and keeps every row. Both SELECTs need the same number of columns in the same order.'
  },
  {
    id: 'union-distinct', topic: 'union', title: 'UNION without ALL', ordered: true,
    prompt: 'List every state that appears in customers or sellers, each state once, in alphabetical order.',
    hint: 'UNION (without ALL) removes duplicates. ORDER BY goes once, at the very end.',
    solution: 'SELECT customer_state AS state\nFROM customers\nUNION\nSELECT seller_state\nFROM sellers\nORDER BY state;',
    explain: 'UNION removes duplicates, which costs extra work. Reach for UNION ALL unless you really need the de-duplication.'
  },
  {
    id: 'case-band', topic: 'union', title: 'Label rows with CASE',
    prompt: "Show order_id, order_item_id, price and a price_band column: 'low' when price is below 50, 'mid' from 50 up to 200, and 'high' above 200.",
    hint: 'CASE WHEN ... THEN ... WHEN ... THEN ... ELSE ... END, written inside the SELECT list.',
    solution: "SELECT order_id, order_item_id, price,\n       CASE WHEN price < 50 THEN 'low'\n            WHEN price <= 200 THEN 'mid'\n            ELSE 'high'\n       END AS price_band\nFROM order_items;",
    explain: 'CASE is SQL\'s if/else. It is checked top to bottom and stops at the first match.'
  },

  // ---------- CTE ----------
  {
    id: 'cte-basic', topic: 'cte', title: 'Your first CTE',
    prompt: 'Using a CTE that works out each order\'s total (sum of price + freight_value), show order_id and order_total (rounded to 2 decimals) for orders totalling more than 300.',
    hint: 'WITH order_totals AS ( SELECT ... GROUP BY order_id ) then SELECT from order_totals with a WHERE.',
    solution: 'WITH order_totals AS (\n  SELECT order_id, SUM(price + freight_value) AS order_total\n  FROM order_items\n  GROUP BY order_id\n)\nSELECT order_id, ROUND(order_total, 2) AS order_total\nFROM order_totals\nWHERE order_total > 300;',
    explain: 'A CTE is a named, temporary result you define with WITH at the very top. Here it lets you use WHERE on a total, because the total is already a plain column by then.'
  },
  {
    id: 'cte-two', topic: 'cte', title: 'Two CTEs in a chain',
    prompt: 'Show customer_id and total_spend (sum of price across all their orders, rounded to 2 decimals) for customers who spent more than the average customer spend.',
    hint: 'First CTE: spend per customer (join orders to order_items). Second CTE: the average of that. Separate CTEs with a comma, and write WITH only once.',
    solution: 'WITH customer_spend AS (\n  SELECT o.customer_id, SUM(oi.price) AS total_spend\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  GROUP BY o.customer_id\n),\navg_spend AS (\n  SELECT AVG(total_spend) AS avg_total\n  FROM customer_spend\n)\nSELECT cs.customer_id, ROUND(cs.total_spend, 2) AS total_spend\nFROM customer_spend cs\nCROSS JOIN avg_spend a\nWHERE cs.total_spend > a.avg_total;',
    explain: 'Each CTE can read the ones above it, so you build the answer in small named steps. A subquery in the WHERE would also work here.'
  },

  // ---------- WINDOW ----------
  {
    id: 'window-avg', topic: 'window', title: 'A group average beside each row',
    prompt: 'For every order item show order_id, product_category, price, and the average price of that item\'s category (rounded to 2 decimals) on the same row.',
    hint: 'AVG(price) OVER (PARTITION BY product_category). No GROUP BY needed.',
    solution: 'SELECT oi.order_id, p.product_category, oi.price,\n       ROUND(AVG(oi.price) OVER (PARTITION BY p.product_category), 2) AS category_avg\nFROM order_items oi\nJOIN products p ON p.product_id = oi.product_id;',
    explain: 'GROUP BY collapses rows. PARTITION BY keeps every row and adds the group\'s value next to it. That is the key idea of window functions.'
  },
  {
    id: 'window-rownum', topic: 'window', title: 'Number rows inside each group',
    prompt: 'Number each customer\'s orders from oldest to newest (break ties by order_id). Show customer_id, order_id, order_purchase_date and the number.',
    hint: 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_purchase_date, order_id).',
    solution: 'SELECT customer_id, order_id, order_purchase_date,\n       ROW_NUMBER() OVER (\n         PARTITION BY customer_id\n         ORDER BY order_purchase_date, order_id\n       ) AS order_number\nFROM orders;',
    explain: 'PARTITION BY restarts the numbering for each customer. The ORDER BY inside OVER decides who gets number 1.'
  },
  {
    id: 'window-rank', topic: 'window', title: 'Rank within a category',
    prompt: 'Work out each product\'s revenue (sum of price). Show product_category, product_id, revenue (rounded to 2 decimals) and its rank within its category, where rank 1 is the highest revenue.',
    hint: 'Aggregate in a CTE first, then RANK() OVER (PARTITION BY product_category ORDER BY revenue DESC).',
    solution: 'WITH product_revenue AS (\n  SELECT p.product_category, p.product_id, SUM(oi.price) AS revenue\n  FROM order_items oi\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY p.product_category, p.product_id\n)\nSELECT product_category, product_id, ROUND(revenue, 2) AS revenue,\n       RANK() OVER (PARTITION BY product_category ORDER BY revenue DESC) AS category_rank\nFROM product_revenue;',
    explain: 'RANK gives tied rows the same number and then skips. DENSE_RANK does not skip. ROW_NUMBER never ties.'
  },
  {
    id: 'window-running', topic: 'window', title: 'Running total',
    prompt: 'For each order show customer_id, order_id, order_total (sum of price, rounded to 2 decimals) and a running total of that customer\'s spend over time (rounded to 2 decimals), ordered by order_purchase_date then order_id.',
    hint: 'CTE for order totals joined to orders, then SUM(order_total) OVER (PARTITION BY customer_id ORDER BY order_purchase_date, order_id).',
    solution: 'WITH order_totals AS (\n  SELECT o.customer_id, o.order_id, o.order_purchase_date, SUM(oi.price) AS order_total\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  GROUP BY o.customer_id, o.order_id, o.order_purchase_date\n)\nSELECT customer_id, order_id, ROUND(order_total, 2) AS order_total,\n       ROUND(SUM(order_total) OVER (\n         PARTITION BY customer_id\n         ORDER BY order_purchase_date, order_id\n       ), 2) AS running_total\nFROM order_totals;',
    explain: 'Adding ORDER BY inside OVER turns SUM into a running total: each row sums everything up to and including itself.'
  },
  {
    id: 'window-latest', topic: 'window', title: 'Latest row per group',
    prompt: 'Show each customer\'s most recent order: customer_id, order_id and order_purchase_date (break ties by the highest order_id).',
    hint: 'Number the rows per customer newest first in a CTE, then keep WHERE the number = 1.',
    solution: 'WITH ranked AS (\n  SELECT customer_id, order_id, order_purchase_date,\n         ROW_NUMBER() OVER (\n           PARTITION BY customer_id\n           ORDER BY order_purchase_date DESC, order_id DESC\n         ) AS rn\n  FROM orders\n)\nSELECT customer_id, order_id, order_purchase_date\nFROM ranked\nWHERE rn = 1;',
    explain: 'This "top 1 per group" pattern is one of the most common interview questions. You need the CTE because a window function cannot be used directly in WHERE.'
  }
];

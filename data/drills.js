// Clause-order drills. "parts" are listed in the correct order; the site shuffles them.
window.CLAUSE_ORDER = ['WITH', 'SELECT', 'FROM', 'JOIN ... ON', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT'];

window.DRILLS = [
  {
    id: 'd-basic', goal: 'Cities of customers in SP, A to Z.',
    parts: ['SELECT customer_city', 'FROM customers', "WHERE customer_state = 'SP'", 'ORDER BY customer_city']
  },
  {
    id: 'd-group', goal: 'Number of orders per status.',
    parts: ['SELECT order_status, COUNT(*)', 'FROM orders', 'GROUP BY order_status']
  },
  {
    id: 'd-having', goal: 'Customers with more than 3 orders.',
    parts: ['SELECT customer_id, COUNT(*)', 'FROM orders', 'GROUP BY customer_id', 'HAVING COUNT(*) > 3']
  },
  {
    id: 'd-join', goal: 'Delivered orders with the customer city.',
    parts: ['SELECT o.order_id, c.customer_city', 'FROM orders o', 'JOIN customers c ON c.customer_id = o.customer_id', "WHERE o.order_status = 'delivered'"]
  },
  {
    id: 'd-full', goal: 'Top 3 sellers by sales on items above 20, where the total is above 2000.',
    parts: ['SELECT seller_id, SUM(price) AS total', 'FROM order_items', 'WHERE price > 20', 'GROUP BY seller_id', 'HAVING SUM(price) > 2000', 'ORDER BY total DESC', 'LIMIT 3']
  },
  {
    id: 'd-join-group', goal: 'Revenue per category, biggest first.',
    parts: ['SELECT p.product_category, SUM(oi.price) AS revenue', 'FROM order_items oi', 'JOIN products p ON p.product_id = oi.product_id', 'GROUP BY p.product_category', 'ORDER BY revenue DESC']
  },
  {
    id: 'd-union', goal: 'One list of all cities from customers and sellers, sorted.',
    parts: ['SELECT customer_city AS city', 'FROM customers', 'UNION ALL', 'SELECT seller_city', 'FROM sellers', 'ORDER BY city']
  },
  {
    id: 'd-cte', goal: 'Orders whose total is above 300, using a CTE.',
    parts: ['WITH order_totals AS (', 'SELECT order_id, SUM(price) AS total', 'FROM order_items', 'GROUP BY order_id', ')', 'SELECT order_id, total', 'FROM order_totals', 'WHERE total > 300']
  },
  {
    id: 'd-window', goal: 'Number each customer\'s orders, oldest first.',
    parts: ['SELECT customer_id, order_id,', 'ROW_NUMBER() OVER (', 'PARTITION BY customer_id', 'ORDER BY order_purchase_date', ') AS order_number', 'FROM orders']
  },
  {
    id: 'd-latest', goal: 'Each customer\'s most recent order (top 1 per group).',
    parts: ['WITH ranked AS (', 'SELECT customer_id, order_id,', 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_purchase_date DESC) AS rn', 'FROM orders', ')', 'SELECT customer_id, order_id', 'FROM ranked', 'WHERE rn = 1']
  }
];

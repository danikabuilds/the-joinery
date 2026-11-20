// Model explanations for "Explain it out loud". Three sentences per exercise, in this frame:
//   1. What question it answers.  2. How it works (the clauses, in the order they run).  3. What to watch for.
// Keys match the exercise ids in exercises.js.
window.ALOUD = {
  'select-columns': [
    'This query lists every customer with their ID and city.',
    'SELECT names the two columns I want and FROM says they come from the customers table.',
    'Nothing filters the rows, so I get one row per customer.'
  ],
  'select-distinct': [
    'This gives the list of states our customers live in, each one once, in alphabetical order.',
    'DISTINCT after SELECT removes the duplicate states, and ORDER BY sorts the result at the end.',
    'DISTINCT works on the whole row, so if I added another column I would get unique combinations rather than unique states.'
  ],
  'select-top5': [
    'This finds the five order items with the highest freight cost.',
    'I sort the items by freight_value from highest to lowest, then LIMIT keeps only the first five rows.',
    'Without ORDER BY, LIMIT returns an arbitrary five rows, and if two items tie at the cut-off I would need a tiebreaker.'
  ],
  'where-equals': [
    'This lists the cancelled orders with their customer and the date they were placed.',
    'FROM orders is filtered by WHERE order_status equals \'canceled\', so only matching rows are returned.',
    'The text must match exactly, including spelling and capital letters, so I check the real status values first.'
  ],
  'where-in-and': [
    'This finds toys and housewares products that weigh more than a kilogram.',
    'IN checks the category against both values, and AND adds the weight condition, so a row must pass both tests.',
    'If I mixed AND with OR I would use brackets, because otherwise the order of evaluation could change the result.'
  ],
  'where-null': [
    'This lists orders that have not been delivered, with their status.',
    'I filter with WHERE order_delivered_date IS NULL, because NULL means unknown and cannot be tested with an equals sign.',
    'A missing delivery date could mean in transit, cancelled or a data gap, so I would look at the status alongside it.'
  ],
  'group-count': [
    'This counts how many orders sit in each status.',
    'GROUP BY order_status makes one row per status, and COUNT(*) counts the rows in each group.',
    'Every column in the SELECT must either be in the GROUP BY or inside an aggregate, otherwise most databases reject the query.'
  ],
  'group-sum': [
    'This shows the total and the average payment value for each payment type.',
    'I group by payment_type, then SUM and AVG the payment_value, rounded to two decimal places.',
    'An average can hide big differences, so I would also check how many payments sit behind each type.'
  ],
  'group-having': [
    'This finds customers who have placed more than three orders.',
    'I group the orders by customer and count them, and HAVING keeps only the groups where the count is above three.',
    'WHERE cannot do this job, because it runs before the grouping, so the count does not exist yet.'
  ],
  'group-full': [
    'This finds sellers whose sales total more than 2000, counting only items priced above 20, biggest first.',
    'The clauses run in a fixed order: WHERE removes the cheap items, GROUP BY builds one row per seller, HAVING filters the totals and ORDER BY sorts the result.',
    'WHERE changes what gets added up while HAVING filters the finished totals, and mixing the two up changes the answer.'
  ],
  'join-inner': [
    'This lists orders placed by customers in Rio de Janeiro state, with the city and the order status.',
    'I join orders to customers on customer_id so each order picks up its customer\'s city and state, then WHERE keeps state RJ.',
    'An inner join drops orders with no matching customer, which is fine here because every order should have one.'
  ],
  'join-left': [
    'This finds customers who have never placed an order.',
    'A LEFT JOIN keeps every customer, and customers with no matching order get NULLs on the order side, which I then filter for.',
    'The NULL test must use a column from the right-hand table that is never empty otherwise, like the order ID.'
  ],
  'join-agg': [
    'This gives total revenue for each product category, including products that have no category.',
    'I join order items to products on product_id, then GROUP BY category and SUM the price.',
    'Products with no category come out as one NULL group, which I would label or investigate rather than ignore.'
  ],
  'union-all': [
    'This builds one list of cities from both customers and sellers, labelled by where each city came from.',
    'Two SELECTs with the same number of columns are stacked with UNION ALL, and a constant column labels each source.',
    'UNION ALL keeps duplicates and is cheaper than UNION, so I use it unless I specifically need unique rows.'
  ],
  'union-distinct': [
    'This lists every state that appears for customers or sellers, once each, in order.',
    'UNION stacks the two lists and removes duplicates, and a single ORDER BY at the very end sorts the combined result.',
    'Removing duplicates costs extra work, so on large tables I would only use UNION when I really need it.'
  ],
  'case-band': [
    'This labels every order item as a low, mid or high price.',
    'CASE checks the conditions from top to bottom and returns the label of the first one that matches, with ELSE as the fallback.',
    'The order of the WHEN lines matters, because once a row matches it never reaches the later conditions.'
  ],
  'cte-basic': [
    'This finds orders whose total, including freight, is over 300.',
    'A CTE first works out each order\'s total with SUM and GROUP BY, then the main query simply filters that named result.',
    'The CTE lets me use a plain WHERE on the total, which keeps the query easy to read and to check.'
  ],
  'cte-two': [
    'This finds customers who spent more than the average customer.',
    'The first CTE totals spend per customer, the second calculates the average of those totals, and the final query compares each customer to it.',
    'The average is of customer totals, not of individual items, so I have to aggregate before I average.'
  ],
  'window-avg': [
    'This shows each order item next to the average price of its category.',
    'AVG with OVER and PARTITION BY category calculates the category average while keeping every row.',
    'Unlike GROUP BY, a window function does not collapse the rows, so I can compare each price with its category average.'
  ],
  'window-rownum': [
    'This numbers each customer\'s orders from oldest to newest.',
    'ROW_NUMBER with PARTITION BY customer restarts the count for each customer, and the ORDER BY inside OVER decides who is number one.',
    'I add order_id as a tiebreaker so that two orders on the same date always get the same numbers.'
  ],
  'window-rank': [
    'This ranks products by revenue within their category.',
    'I total revenue per product in a CTE, then RANK with PARTITION BY category and ORDER BY revenue descending gives rank one to the best seller.',
    'RANK gives ties the same number and then skips, so DENSE_RANK or ROW_NUMBER may suit better depending on the question.'
  ],
  'window-running': [
    'This shows each customer\'s spend building up over time.',
    'I total each order in a CTE, then SUM with OVER, partitioned by customer and ordered by date, adds up everything so far.',
    'The ORDER BY inside OVER is what turns the sum into a running total, and I add a tiebreaker so same-day orders stay in a stable order.'
  ],
  'window-latest': [
    'This returns each customer\'s most recent order.',
    'ROW_NUMBER partitioned by customer and ordered by date descending numbers the newest order as one, and the outer query keeps the rows where that number is one.',
    'I need the CTE because a window function cannot be used directly in WHERE, and a tiebreaker keeps the result predictable.'
  ]
};

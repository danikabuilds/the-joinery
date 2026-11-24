// Data modelling terms. See data/glossary.js for what each field means.
window.addGlossary('Modelling', [
  {
    id: 'schema', term: 'Schema',
    def: 'The structure of the data: tables, columns, types and how they relate.',
    deep: 'The word has two uses. It means the overall design of a database, and also a named folder of tables inside it (such as raw, staging and marts). Reading a schema well is the first step of any analysis: which table holds the event, which hold the descriptions, and what links them.',
    say: 'A schema is the structure of the data. Before writing SQL I look at which tables exist, their keys and how they join.',
    rel: ['primary-key', 'foreign-key', 'star-schema']
  },
  {
    id: 'grain', term: 'Grain',
    def: 'What one row in a table represents.',
    deep: 'Grain is the most important modelling idea. orders has one row per order; order_items has one row per item in an order. Joining tables of different grain causes fan-out, and comparing numbers at different grains causes arguments. Say the grain out loud before you aggregate or join.',
    ex: 'orders: one row per order\norder_items: one row per item within an order\norder_payments: one row per payment instalment',
    mistakes: ['Joining an order-level table to an item-level table and summing order totals.'],
    questions: ['Why do two reports show different revenue for the same month?'],
    say: 'Before I aggregate or join, I check the grain, meaning what one row represents, so I do not double count.',
    rel: ['fan-out', 'fact-table', 'cardinality']
  },
  {
    id: 'cardinality', term: 'Cardinality',
    def: 'How rows relate between tables: one-to-one, one-to-many or many-to-many.',
    deep: 'One customer has many orders (one-to-many). One order has one delivery address (one-to-one). Products and orders are many-to-many, resolved by order_items. Knowing the cardinality tells you in advance whether a join will multiply rows. The word also means the number of distinct values in a column: customer_id has high cardinality, order_status low.',
    questions: ['Will joining these two tables change the number of rows?'],
    say: 'Cardinality is how tables relate, one-to-many and so on. It tells me whether a join will multiply rows.',
    rel: ['fan-out', 'grain', 'bridge-table']
  },
  {
    id: 'normalisation', term: 'Normalisation',
    def: 'Organising data into separate tables so each fact is stored once.',
    deep: 'Normalised designs suit apps that write a lot: change a customer\'s city in one place and it is right everywhere. The cost is many joins when you analyse. Analytics models often denormalise on purpose.',
    say: 'Normalisation stores each fact once to avoid update errors. It is great for apps but means more joins for analysis.',
    rel: ['denormalisation', 'star-schema']
  },
  {
    id: 'denormalisation', term: 'Denormalisation',
    def: 'Deliberately combining tables or repeating data to make reads faster and simpler.',
    deep: 'A wide sales table with customer city and product category already joined in is easy for analysts and BI tools. The trade-off is repeated data and a risk of it going out of date, so it is usually rebuilt by a pipeline rather than edited by hand.',
    say: 'Denormalising repeats some data so reads are simpler and faster. In a warehouse that is usually a good trade.',
    rel: ['normalisation', 'one-big-table', 'star-schema']
  },
  {
    id: 'star-schema', term: 'Star schema',
    def: 'A model with one central fact table surrounded by dimension tables.',
    deep: 'The fact table holds events and numbers (sales lines); each dimension holds descriptions (date, customer, product, store). Every dimension joins to the fact by one key, so queries are predictable and BI tools such as Power BI work best with this shape.',
    ex: 'fact_sales (date_key, customer_key, product_key, quantity, revenue)\n  -> dim_date, dim_customer, dim_product',
    questions: ['How do we let the business slice sales by any combination of time, product and region?'],
    say: 'A star schema has a fact table of measurable events in the middle and dimension tables around it for slicing and filtering.',
    rel: ['fact-table', 'dimension-table', 'snowflake-schema', 'conformed-dimension']
  },
  {
    id: 'snowflake-schema', term: 'Snowflake schema',
    def: 'A star schema where dimensions are split further into their own sub-tables.',
    deep: 'Instead of dim_product holding category name, it points to dim_category. It saves a little space and repetition but adds joins. Most analytics teams prefer the simpler star.',
    say: 'A snowflake schema normalises the dimensions into more tables. It saves repetition but adds joins, so I usually prefer a star.',
    rel: ['star-schema', 'normalisation']
  },
  {
    id: 'fact-table', term: 'Fact table',
    def: 'A table of events or transactions holding the numbers you measure.',
    deep: 'Facts are usually long and narrow: keys plus measures such as quantity and revenue. Decide the grain first (one row per order line, per day per store) and keep it consistent. Measures are additive (revenue), semi-additive (account balance: adds across accounts but not across time) or non-additive (a ratio).',
    mistakes: ['Storing a ratio in a fact table and then summing it.'],
    say: 'A fact table records events at a set grain, with the numbers we measure, such as quantity and revenue.',
    rel: ['dimension-table', 'grain', 'star-schema']
  },
  {
    id: 'dimension-table', term: 'Dimension table',
    def: 'A table of descriptive attributes you slice and filter by.',
    deep: 'Dimensions answer "by what?": by date, by customer segment, by product category. They are usually short and wide. A good date dimension (with weekday, month, holiday flags and financial year) saves a lot of repeated date logic.',
    questions: ['Can we see sales by region, category and customer segment?'],
    say: 'A dimension describes the who, what, where and when, such as customer or product, and is what we slice the facts by.',
    rel: ['fact-table', 'scd', 'conformed-dimension']
  },
  {
    id: 'surrogate-key', term: 'Surrogate key',
    def: 'A made-up key, usually a number, used instead of the source system\'s own ID.',
    deep: 'Source IDs can clash between systems or be reused. A surrogate key is created by the warehouse, stays stable, and lets a dimension hold several versions of the same customer over time.',
    say: 'A surrogate key is a warehouse-made ID. It stays stable when source IDs clash or change, and it supports history.',
    rel: ['primary-key', 'scd']
  },
  {
    id: 'scd', term: 'Slowly changing dimension',
    def: 'A way of handling dimension values that change over time, such as a customer moving city.',
    deep: 'Type 1 overwrites the old value, so history now shows the new city. Type 2 adds a new row with valid-from and valid-to dates, so old sales stay attached to the old city. Type 2 is what you want when the question is "what was true at the time?"',
    ex: 'customer_key | customer_id | city      | valid_from | valid_to\n101          | C001        | Curitiba  | 2024-01-01 | 2025-06-30\n188          | C001        | Sao Paulo | 2025-07-01 | (current)',
    questions: ['Were sales in Sao Paulo really up, or did customers just move?'],
    say: 'Slowly changing dimensions track changes. Type 1 overwrites; Type 2 keeps history with new rows and date ranges.',
    rel: ['dimension-table', 'surrogate-key']
  },
  {
    id: 'conformed-dimension', term: 'Conformed dimension',
    def: 'A dimension shared by several fact tables, with the same keys and meanings everywhere.',
    deep: 'If sales and returns both use the same dim_date and dim_product, you can compare them side by side. Without conformed dimensions, each team defines "product" a little differently and the numbers never line up.',
    say: 'A conformed dimension is shared across facts, so sales and returns can be compared on exactly the same product and date.',
    rel: ['dimension-table', 'single-source-of-truth']
  },
  {
    id: 'bridge-table', term: 'Bridge table',
    def: 'A table that resolves a many-to-many relationship, such as order_items between orders and products.',
    deep: 'Many-to-many links cannot be stored on either side, so a middle table holds one row per pair. In BI tools, bridge tables need care because filters may not flow the way you expect.',
    say: 'A bridge table sits between two tables with a many-to-many link and holds one row per pair.',
    rel: ['cardinality', 'fan-out']
  },
  {
    id: 'one-big-table', term: 'One big table',
    def: 'A single wide, fully joined table built for a specific use, such as one dashboard.',
    deep: 'Easy for beginners and fast in columnar warehouses, but hard to reuse and easy to double count if mixed grains end up in one table. A common approach is a star schema underneath with a few wide tables on top.',
    say: 'One big table is a wide, pre-joined table for a specific use. It is convenient, but I keep a cleaner model underneath.',
    rel: ['denormalisation', 'star-schema', 'grain']
  },
  {
    id: 'data-type', term: 'Data type',
    def: 'The kind of value a column holds: integer, decimal, text, date or boolean.',
    deep: 'Types decide what you can do. Dates stored as text sort wrongly ("10/02" before "9/02"), money stored as floating point picks up rounding errors, and IDs stored as numbers lose leading zeros. Fix types early in the pipeline.',
    mistakes: ['Storing money as a float.', 'Storing dates as text in day/month order.'],
    say: 'The data type controls what a column can do. I fix types early, especially dates and money, so later maths is right.',
    rel: ['data-quality', 'schema']
  },
  {
    id: 'table-partitioning', term: 'Table partitioning',
    def: 'Storing a large table in chunks, usually by date, so queries can skip what they do not need.',
    deep: 'A query for last week on a table partitioned by day reads seven partitions, not years of data. In BigQuery and Snowflake this cuts both time and cost. It only helps if queries filter on the partition column.',
    say: 'Partitioning splits a big table, usually by date, so a query that filters on that column reads far less data.',
    rel: ['index', 'query-plan']
  },
  {
    id: 'natural-key', term: 'Natural key',
    def: 'A key that comes from the real world or the source system, such as an ID number, an email address or the shop\'s own order number.',
    deep: 'Natural keys mean something outside the warehouse, which makes them easy to understand and to join back to the source. But they can change (a customer changes email), be reused, or clash when two systems are combined. That is why warehouses usually add a surrogate key and keep the natural key as an ordinary column.',
    ex: 'customer_id "C001" from the shop system   (natural key)\ncustomer_key 101 created by the warehouse  (surrogate key)',
    mistakes: ['Using an email address as a key and breaking history when it changes.', 'Assuming IDs from two different systems never overlap.'],
    questions: ['How do we match this customer back to the source system?', 'Why did merging two systems create duplicate customers?'],
    say: 'I keep the natural key from the source for traceability, but join on a surrogate key in the warehouse, because natural keys can change or clash.',
    rel: ['surrogate-key', 'primary-key', 'scd']
  },
  {
    id: 'composite-key', term: 'Composite key',
    def: 'A key made of two or more columns that together identify a row.',
    deep: 'Sometimes no single column is unique, but a combination is. In order_items, order_id repeats for every item and order_item_id restarts at 1 in every order, but the pair (order_id, order_item_id) is unique. Joining on only part of a composite key is a classic cause of fan-out.',
    ex: 'order_items\norder_id | order_item_id | product_id\nO001     | 1             | P10\nO001     | 2             | P22\nO002     | 1             | P10',
    exCode: true,
    mistakes: ['Joining order_items on order_id alone when the other table is at item level.', 'Testing uniqueness on one column of a composite key.'],
    questions: ['What makes each row in this table unique?', 'Why did this join double the rows?'],
    say: 'When no single column is unique I use a composite key, and I test that the combination is unique before joining on it.',
    rel: ['primary-key', 'grain', 'fan-out']
  },
  {
    id: 'erd', term: 'Entity relationship diagram',
    def: 'A diagram of tables (entities), their key columns, and how they relate to each other.',
    deep: 'An ERD, or ER diagram, is the map of a database. Boxes are tables, lines are relationships, and the ends of each line show whether it is one-to-one, one-to-many or many-to-many. Drawing one before you build, or reading one before you query, saves a lot of guesswork about how to join. The diagram in the SQL lab is a simple ERD.',
    ex: 'customers 1 ──< * orders 1 ──< * order_items * >── 1 products\n(one customer has many orders; one order has many items; each item is one product)',
    mistakes: ['Joining tables without checking the relationship type first.', 'Letting the diagram go out of date as the model changes.'],
    questions: ['How do these tables connect?', 'Which table should I start my query from?'],
    say: 'Before I write a complex query, I sketch or read the ER diagram so I know the keys and whether each relationship is one-to-many.',
    rel: ['cardinality', 'schema', 'foreign-key']
  },
  {
    id: 'fact-table-types', term: 'Types of fact table',
    def: 'Fact tables come in three main kinds: transaction (one row per event), periodic snapshot (one row per period) and accumulating snapshot (one row per process, updated as it moves).',
    deep: 'A transaction fact records each event, such as each sale. A periodic snapshot records a state at regular intervals, such as stock on hand every night. An accumulating snapshot follows something with clear stages, such as an order moving from placed to paid to shipped to delivered, with one date column per stage. Picking the right type keeps questions easy to answer.',
    ex: 'Transaction:   one row per payment\nPeriodic:      one row per product per day (stock level)\nAccumulating:  one row per order with placed, shipped and delivered dates',
    mistakes: ['Storing stock levels as transactions and summing them, which double counts.', 'Using a transaction table to answer "how long does each stage take?".'],
    questions: ['How long do orders spend between shipping and delivery?', 'What was stock on hand at the end of each month?'],
    say: 'I choose the fact table type from the question: transaction facts for events, periodic snapshots for balances, accumulating snapshots for processes with stages.',
    rel: ['fact-table', 'grain', 'additive-measures']
  },
  {
    id: 'additive-measures', term: 'Additive and semi-additive measures',
    def: 'Additive measures can be summed across every dimension; semi-additive ones, like balances, can be summed across some but not across time.',
    deep: 'Revenue is additive: sum it by day, product or region and the total is right. Stock on hand is semi-additive: you can add it across warehouses, but adding Monday\'s stock to Tuesday\'s is meaningless; use the closing or average balance instead. Ratios such as conversion rate are non-additive: recalculate them from their parts rather than summing or averaging them.',
    ex: 'Revenue (additive): Jan + Feb = Q1 revenue\nStock (semi-additive): Q1 stock = stock on 31 March, not the sum of every day\nConversion rate (non-additive): recalculate from orders ÷ visits',
    mistakes: ['Summing a balance over time.', 'Averaging daily conversion rates instead of recalculating from totals.'],
    questions: ['What was our stock at the end of the quarter?', 'What was the overall conversion rate this month?'],
    say: 'I check whether a measure is additive before I sum it. Balances only add up across some dimensions, and ratios must be recalculated from their parts.',
    rel: ['fact-table-types', 'aggregate-function', 'weighted-average']
  },
  {
    id: 'role-playing-dimension', term: 'Role-playing dimension',
    def: 'One dimension table used several times in the same fact table, each time in a different role.',
    deep: 'An order has a purchase date, a shipped date and a delivered date. Rather than three date tables, the fact table holds three date keys that all point at the same dim_date. In SQL you join dim_date three times with different aliases; in a BI tool you may need one active relationship and the others switched on in specific measures.',
    ex: 'fact_orders: purchase_date_key, shipped_date_key, delivered_date_key\nall three join to dim_date, once as "purchase date", once as "shipped date", once as "delivered date"',
    mistakes: ['Joining dim_date once and accidentally filtering every date role at the same time.', 'Copying dim_date into three separate tables that then drift apart.'],
    questions: ['How many orders were delivered in March, whenever they were placed?', 'How long from purchase to delivery, by month of purchase?'],
    say: 'Dates are the classic role-playing dimension: one dim_date, joined once per role, such as purchase date and delivery date.',
    rel: ['dimension-table', 'star-schema', 'bi-relationships']
  },
  {
    id: 'data-vault', term: 'Data vault',
    def: 'A modelling method that stores business keys, relationships and descriptive history in separate tables called hubs, links and satellites.',
    deep: 'Data vault is built for change and auditability: new sources and attributes can be added without reworking existing tables, and every change is kept with its load time and source. The trade-off is many more tables and joins, so teams usually build a star schema on top for reporting. It is common in large enterprises and regulated industries.',
    ex: 'hub_customer       (customer business key)\nlink_customer_order (which customer placed which order)\nsat_customer       (name, city, email, with load dates)',
    mistakes: ['Pointing dashboards straight at the vault instead of a reporting layer.', 'Choosing data vault for a small project that needs a simple star schema.'],
    questions: ['How do we keep a full audit trail of every change?', 'How do we add a new source without rebuilding the warehouse?'],
    say: 'Data vault separates keys, relationships and history into hubs, links and satellites. It is great for audit and change, and I would still put a star schema on top for reporting.',
    rel: ['star-schema', 'scd', 'normalisation']
  }
]);

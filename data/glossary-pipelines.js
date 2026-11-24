// Pipeline and engineering terms. See data/glossary.js for what each field means.
window.addGlossary('Pipelines', [
  {
    id: 'etl', term: 'ETL',
    def: 'Extract, transform, load. Data is cleaned and shaped before it lands in the warehouse.',
    deep: 'ETL comes from a time when warehouse storage and compute were expensive, so only finished data was loaded. The transform step lives in a separate tool. If the logic is wrong, you often have to extract again, because the raw data was never kept.',
    say: 'ETL transforms data before loading it. It suits strict, expensive targets, but you can lose the raw data.',
    rel: ['elt', 'data-pipeline']
  },
  {
    id: 'elt', term: 'ELT',
    def: 'Extract, load, transform. Raw data lands first and is transformed inside the warehouse.',
    deep: 'Cloud warehouses made storage cheap and compute elastic, so teams now load raw data and transform it with SQL in the warehouse, often with a tool such as dbt. The raw copy stays, so you can rebuild when logic changes.',
    say: 'ELT loads raw data first and transforms it in the warehouse with SQL, which keeps the raw copy and makes changes easy to replay.',
    rel: ['etl', 'medallion', 'data-warehouse']
  },
  {
    id: 'data-warehouse', term: 'Data warehouse',
    def: 'A central database built for analysis and reporting across the business.',
    deep: 'Warehouses (Snowflake, BigQuery, Redshift, Synapse) store data in columns, so summing one column over millions of rows is fast. They hold cleaned, modelled tables that many teams share.',
    questions: ['Where can every team get the same, trusted sales numbers?'],
    say: 'A data warehouse is a central, analysis-optimised store of cleaned, modelled data that the business reports from.',
    rel: ['data-lake', 'lakehouse', 'star-schema']
  },
  {
    id: 'data-lake', term: 'Data lake',
    def: 'Cheap storage for raw data of any shape, kept as files.',
    deep: 'Lakes hold logs, JSON, images and exports in files on cloud storage. They are flexible and cheap, but without rules and a catalogue they turn into a "data swamp" nobody trusts.',
    say: 'A data lake stores raw files of any shape cheaply. It is flexible but needs governance, or it becomes a swamp.',
    rel: ['data-warehouse', 'lakehouse']
  },
  {
    id: 'lakehouse', term: 'Lakehouse',
    def: 'A design that adds warehouse features, such as tables and transactions, on top of lake storage.',
    deep: 'Open table formats (Delta Lake, Apache Iceberg) let files in a lake behave like database tables, with updates, history and schema. Databricks and Microsoft Fabric are built around this idea.',
    say: 'A lakehouse puts warehouse-style tables on top of cheap lake storage, so one copy of the data serves both.',
    rel: ['data-lake', 'data-warehouse', 'medallion']
  },
  {
    id: 'data-pipeline', term: 'Data pipeline',
    def: 'An automated series of steps that moves and prepares data from sources to where it is used.',
    deep: 'A typical pipeline extracts from an app database or API, loads it, cleans it, models it and refreshes a dashboard. A good one is scheduled, tested, monitored and safe to re-run.',
    questions: ['Why was this morning\'s dashboard empty, and which step failed?'],
    say: 'A data pipeline automates moving and preparing data from source to report, and a good one is tested and safe to re-run.',
    rel: ['orchestration', 'idempotency', 'data-quality']
  },
  {
    id: 'batch-vs-streaming', term: 'Batch vs streaming',
    def: 'Batch processes data in scheduled chunks. Streaming processes each event as it arrives.',
    deep: 'Most reporting is fine with batch, such as hourly or nightly. Streaming (Kafka, Kinesis) is for when seconds matter: fraud checks, live stock levels. It costs more and is harder to get right, so ask what decision needs the speed.',
    questions: ['Does this dashboard really need to be live, or is hourly enough?'],
    say: 'Batch runs on a schedule; streaming handles events as they arrive. I choose streaming only when a decision needs that speed.',
    rel: ['data-freshness', 'change-data-capture']
  },
  {
    id: 'incremental-load', term: 'Incremental load',
    def: 'Loading only the rows that are new or changed since the last run, instead of everything.',
    deep: 'Full reloads are simple but get slow and expensive as tables grow. Incremental loads use a watermark, such as the latest updated_at already loaded. Late-arriving rows and deletes are the tricky parts.',
    mistakes: ['Using created_at as the watermark and missing rows that were updated later.'],
    say: 'An incremental load brings in only new or changed rows using a watermark, which keeps big pipelines fast and cheap.',
    rel: ['change-data-capture', 'idempotency']
  },
  {
    id: 'change-data-capture', term: 'Change data capture',
    def: 'Reading inserts, updates and deletes from a source database\'s log as they happen.',
    deep: 'CDC tools (such as Debezium or Fivetran) read the database\'s change log rather than querying tables, so they catch deletes and put little load on the source. It is the usual route to near-real-time copies.',
    questions: ['Are cancelled orders being removed from the warehouse copy?'],
    say: 'Change data capture streams inserts, updates and deletes from the source\'s log, so the copy stays current and deletes are not missed.',
    rel: ['incremental-load', 'batch-vs-streaming']
  },
  {
    id: 'idempotency', term: 'Idempotency',
    def: 'A pipeline step is idempotent if running it twice gives the same result as running it once.',
    deep: 'Pipelines fail and get re-run. If a step appends rows each time, a re-run duplicates data. Idempotent steps overwrite a partition or merge on a key instead, so retries are safe.',
    ex: 'Unsafe: INSERT yesterday\'s orders (a re-run adds them twice)\nSafe: DELETE yesterday\'s partition, then INSERT it again; or MERGE on order_id',
    say: 'An idempotent step gives the same result however many times it runs, so a failed job can be retried without duplicates.',
    rel: ['data-pipeline', 'deduplication', 'orchestration']
  },
  {
    id: 'orchestration', term: 'Orchestration',
    def: 'Scheduling pipeline steps in the right order, with retries and alerts.',
    deep: 'Tools such as Airflow, Dagster, Azure Data Factory or dbt Cloud run tasks as a graph (a DAG): load customers and orders, then build the sales model, then refresh the dashboard. They handle dependencies, retries and alerts when something fails.',
    questions: ['Do the sales numbers refresh only after both orders and payments have loaded?'],
    say: 'Orchestration runs pipeline steps in dependency order on a schedule, with retries and alerts, usually as a DAG.',
    rel: ['data-pipeline', 'idempotency', 'data-lineage']
  },
  {
    id: 'medallion', term: 'Medallion architecture',
    def: 'Organising data in layers: bronze (raw), silver (cleaned) and gold (business-ready).',
    deep: 'Bronze keeps the raw copy as delivered. Silver fixes types, removes duplicates and standardises values. Gold holds modelled tables and metrics for reports. The names vary (raw, staging, marts), but the idea is the same: each layer has one job.',
    questions: ['If a report looks wrong, which layer introduced the problem?'],
    ex: 'raw.orders  →  staging.stg_orders  →  marts.fct_orders',
    say: 'Medallion layers go from raw bronze to cleaned silver to business-ready gold, so each step has one clear job.',
    rel: ['elt', 'lakehouse', 'data-quality']
  },
  {
    id: 'data-quality', term: 'Data quality',
    def: 'How accurate, complete, consistent, unique and timely the data is.',
    deep: 'Quality problems are found by tests, not by eye: keys are unique and not NULL, values fall in expected ranges, row counts do not suddenly drop, and totals match the source. Tools such as dbt tests or Great Expectations run these checks on every load.',
    questions: ['Can we trust this number enough to make a decision on it?'],
    say: 'Data quality covers accuracy, completeness, consistency, uniqueness and timeliness. I check it with automated tests on each load.',
    rel: ['deduplication', 'data-contract', 'data-freshness']
  },
  {
    id: 'deduplication', term: 'Deduplication',
    def: 'Finding and removing repeated records.',
    deep: 'First define what "the same record" means: the same key, or the same key and the latest timestamp? Then keep one row per key, usually with ROW_NUMBER ordered by update time. Exact duplicates can be dropped with DISTINCT, but near-duplicates (same customer, different spelling) need matching rules.',
    ex: 'SELECT * FROM (\n  SELECT c.*, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) AS rn\n  FROM raw_customers c\n) WHERE rn = 1;',
    exCode: true,
    say: 'To deduplicate I define the key, rank rows within it, usually by latest update, and keep the first.',
    rel: ['ranking-functions', 'primary-key', 'idempotency']
  },
  {
    id: 'data-lineage', term: 'Data lineage',
    def: 'A map of where data comes from and every step it passes through.',
    deep: 'Lineage answers "if I change this column, what breaks?" and "where did this number come from?". dbt, Purview and most catalogues draw it automatically from the code.',
    questions: ['Which dashboards are affected if the orders table is late today?'],
    say: 'Lineage traces data from source to report, so I can see what a change will break and explain where a number came from.',
    rel: ['orchestration', 'single-source-of-truth']
  },
  {
    id: 'data-freshness', term: 'Data freshness',
    def: 'How recently the data was updated compared with the real world.',
    deep: 'Every report should say how fresh it is. Freshness checks alert when a table has not loaded on time, before someone makes a decision on yesterday\'s numbers thinking they are today\'s.',
    questions: ['Is this report showing today\'s numbers or yesterday\'s?'],
    say: 'Freshness is how up to date the data is. I show it on reports and alert when a load is late.',
    rel: ['data-quality', 'batch-vs-streaming']
  },
  {
    id: 'data-contract', term: 'Data contract',
    def: 'An agreement between the team that produces data and the teams that use it, about its shape and meaning.',
    deep: 'Contracts list the columns, types, allowed values and freshness a source promises. When an app team renames a column, the contract check fails in their build instead of breaking dashboards a day later.',
    questions: ['Who is told, and when, if the app team renames a column we rely on?'],
    say: 'A data contract fixes the shape and meaning of a source, so changes are caught by the producer, not discovered in a broken report.',
    rel: ['data-quality', 'schema']
  },
  {
    id: 'schema-drift', term: 'Schema drift',
    def: 'When the structure of incoming data changes without warning: a new column, a renamed one, or a different data type.',
    deep: 'Source systems change for their own reasons, and nobody tells the data team. A pipeline that relies on column positions can break, or worse, quietly load values into the wrong columns. Defensive pipelines match columns by name, store raw data as text, add new columns automatically and alert someone, and fail loudly when a required column disappears.',
    ex: 'orders_2025-11-14.csv: order_id, status\norders_2025-11-15.csv: order_id, status, delivery_method',
    mistakes: ['Inserting by column position.', 'Silently dropping columns the pipeline does not recognise.'],
    questions: ['Why did yesterday\'s load fail?', 'When did this column start appearing?'],
    say: 'I design for schema drift: load by column name, keep the raw layer as text, add new columns automatically, and alert when a required one disappears.',
    rel: ['data-contract', 'data-quality', 'medallion']
  },
  {
    id: 'backfill', term: 'Backfill',
    def: 'Loading or reprocessing past data, for example after fixing a bug, adding a new column or when old files arrive late.',
    deep: 'Pipelines are usually built to process today\'s data, but sooner or later you need to rerun history: a calculation was wrong, a new metric needs past values, or last month\'s files turn up late. A pipeline that is idempotent and processes by date range makes backfills safe and boring. Run them in batches and compare totals before and after.',
    ex: 'Bug fixed in the revenue calculation on 20 Nov.\nBackfill: rerun the model for 1 Oct to 19 Nov, then compare monthly totals with the old version.',
    mistakes: ['Backfilling with a pipeline that appends, so history gets duplicated.', 'Rerunning everything at once and overloading the warehouse.'],
    questions: ['Can we show the new metric for last year too?', 'Are the numbers before the fix still wrong in the reports?'],
    say: 'Because my loads are idempotent and work by date range, a backfill is just rerunning those dates, and I compare totals before and after.',
    rel: ['idempotency', 'incremental-load', 'orchestration']
  },
  {
    id: 'quarantine', term: 'Quarantine (handling bad rows)',
    def: 'Setting rows that fail quality rules aside in a separate table, with a reason, instead of loading them or deleting them.',
    deep: 'When a few rows are broken, stopping the whole pipeline punishes everyone, but loading them corrupts the numbers. Quarantining moves bad rows to a holding table with the rule they failed, so the clean data still flows and someone can fix the source. Add a threshold too: if a large share of rows fail, something bigger is wrong and the pipeline should stop.',
    ex: 'quarantine_orders\norder_id | reason\nO9912    | missing customer_id\nO9917    | unknown status: delivred',
    exCode: true,
    mistakes: ['Deleting bad rows silently, so nobody fixes the source.', 'Quarantining without a limit, so a broken feed is quietly emptied into quarantine.'],
    questions: ['How many rows did we reject yesterday, and why?', 'Is this a one-off bad file or a broken feed?'],
    say: 'I quarantine bad rows with a reason so clean data keeps flowing, and I stop the pipeline if the quarantined share crosses a threshold.',
    rel: ['data-quality', 'data-contract', 'deduplication']
  },
  {
    id: 'columnar-storage', term: 'Columnar storage (Parquet)',
    def: 'Storing data column by column rather than row by row, which makes analytical queries much faster and files much smaller.',
    deep: 'Analytical queries usually read a few columns across millions of rows. A CSV stores whole rows, so the engine reads everything. Columnar formats like Parquet store each column together, so a query can read just the columns it needs, and similar values compress well. Parquet also stores data types, so dates stay dates. It is the default format for data lakes and tools like DuckDB, Spark and BigQuery.',
    ex: 'orders.csv      412 MB, every query reads every column\norders.parquet   58 MB, SELECT SUM(price) reads one column',
    mistakes: ['Keeping large analytical datasets as CSV.', 'Writing millions of tiny Parquet files instead of fewer, larger ones.'],
    questions: ['Why are our queries on the data lake so slow?', 'How do we cut storage costs?'],
    say: 'For analytics I store data as Parquet, a columnar format, so queries read only the columns they need and files compress well.',
    rel: ['data-lake', 'lakehouse', 'table-partitioning']
  },
  {
    id: 'data-observability', term: 'Data observability',
    def: 'Watching the health of data pipelines continuously: whether data arrived, is fresh, has the expected volume and shape, and passed its tests.',
    deep: 'Tests catch the problems you thought of; observability helps catch the ones you did not. It tracks signals such as freshness (did today\'s data arrive?), volume (are there far fewer rows than usual?), schema (did a column change?) and distribution (did the share of nulls jump?). Alerts go to the data team before a stakeholder finds the problem in a dashboard.',
    ex: 'Alert 06:15: orders loaded 1,240 rows, usual range 4,500 to 5,500.\nAlert 06:15: share of null customer_id rose from 0% to 8%.',
    mistakes: ['Only finding out about broken data when a manager asks.', 'Sending so many alerts that people ignore them.'],
    questions: ['Did last night\'s data load completely?', 'Can we trust this morning\'s dashboard?'],
    say: 'Beyond tests, I monitor freshness, volume and schema so the data team hears about problems before the business does.',
    rel: ['data-quality', 'data-freshness', 'data-lineage']
  },
  {
    id: 'reverse-etl', term: 'Reverse ETL',
    def: 'Sending cleaned data from the warehouse back into business tools, such as a CRM, email platform or support system.',
    deep: 'Normally data flows into the warehouse for analysis. Reverse ETL closes the loop: segments and scores built in the warehouse, such as "customers likely to churn" or "lifetime value", are pushed to the tools teams use every day, so marketing or support can act on them. The warehouse stays the single source of truth for the definitions.',
    ex: 'Warehouse model: churn_risk per customer\nReverse ETL: sync churn_risk to the CRM every morning\nCRM: triggers a win-back email for high-risk customers',
    mistakes: ['Rebuilding the same segment logic separately inside each tool.', 'Syncing personal data to tools without checking consent and access rules.'],
    questions: ['How do we get warehouse segments into our email platform?', 'Can the support team see each customer\'s lifetime value?'],
    say: 'Reverse ETL pushes warehouse data, like churn risk or lifetime value, into tools such as the CRM, so teams act on the same definitions.',
    rel: ['etl', 'single-source-of-truth', 'customer-segmentation']
  },
  {
    id: 'dbt', term: 'dbt',
    def: 'An open-source tool that turns SQL SELECT statements into tested, documented tables and views in a warehouse.',
    deep: 'dbt (data build tool) handles the T in ELT. Each model is a SQL file; ref() links models so dbt builds them in the right order; tests check uniqueness, nulls and relationships; and dbt docs draws the lineage. It brings software habits, such as version control, code review and testing, to analytics work. It runs on most warehouses, including Snowflake, BigQuery and DuckDB.',
    ex: '-- models/marts/fct_orders.sql\nSELECT o.order_id, o.customer_id, SUM(i.price) AS revenue\nFROM {{ ref(\'stg_orders\') }} o\nJOIN {{ ref(\'stg_order_items\') }} i USING (order_id)\nGROUP BY 1, 2',
    exCode: true,
    mistakes: ['Hard-coding table names instead of using ref(), which breaks the build order.', 'Writing models with no tests.'],
    questions: ['How do we know these tables were built correctly?', 'Which models feed this dashboard?'],
    say: 'I use dbt for transformations: SQL models linked with ref(), tests on keys and relationships, and the docs site for lineage.',
    rel: ['elt', 'data-lineage', 'data-quality']
  }
]);

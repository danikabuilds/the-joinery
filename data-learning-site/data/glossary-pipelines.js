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
  }
]);

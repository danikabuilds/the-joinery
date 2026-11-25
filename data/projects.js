// The Projects hub: one short entry per project, from projects/<id>/meta.json. The full write-up of each
// project is its PROJECT.md. Built by each project's build_project.py: edit those, not this.
// Entries with track "Python" are listed under Python practice instead of as project cards.
window.PROJECTS = [
 {
  "id": "just-now-deliveries",
  "track": "Data Analytics",
  "level": "Beginner",
  "title": "Just Now Deliveries",
  "fullTitle": "Beginner Data Analytics: Just Now Deliveries",
  "blurb": "Clean a messy export from a fictional South African online store with Python, model it, answer the boss's questions with SQL and build a dashboard.",
  "tagline": "Customers say we deliver \"just now\". Prove them wrong, or prove them right.",
  "briefFrom": "Nomsa, Head of Operations",
  "brief": "We have grown fast, but my inbox is full of complaints about late parcels. Before our next planning meeting, I need three answers: are we really growing, where are deliveries failing, and does slow delivery hurt our reviews? Here is an export from our systems. Fair warning: it is a bit of a mess.",
  "time": "6 to 8 hours, over a few sittings",
  "skills": [
   "Python scripting",
   "Cleaning data with pandas",
   "SQL in DuckDB",
   "Star schema modelling",
   "Business questions",
   "Dashboards",
   "A first pipeline"
  ],
  "md": "projects/just-now-deliveries/PROJECT.md",
  "steps": [
   "Set up your computer",
   "Get the data",
   "First look, with Python",
   "Clean the data, with Python",
   "Load the data into DuckDB",
   "Model the data",
   "Answer the business questions",
   "Build the dashboard",
   "Run it all with one command",
   "Why it matters, and how to talk about it",
   "Take it further"
  ],
  "order": 1,
  "warmup": "python-basics"
 },
 {
  "order": 2,
  "id": "build-the-plumbing",
  "track": "Data Engineering",
  "level": "Intermediate",
  "title": "Build the plumbing",
  "fullTitle": "Intermediate Data Engineering: Build the plumbing",
  "blurb": "Turn Just Now Deliveries' daily files into a pipeline that runs itself: raw, staging and marts layers, dbt models, data quality tests and a scheduled run on GitHub Actions.",
  "tagline": "Nomsa liked the answers. Now she wants them every morning, without anyone lifting a finger.",
  "briefFrom": "Nomsa, Head of Operations",
  "brief": "Your analysis was great, but it took a week of manual work. I want those numbers refreshed automatically every morning before 07:00, and I want to know when the data is wrong before my team sees it. Our systems now drop a file every day. Some days the file is late, and some days it is a mess.",
  "time": "10 to 14 hours, over a week or two",
  "skills": [
   "Pipeline design",
   "Python ingestion",
   "dbt",
   "Incremental loads",
   "Data quality tests",
   "Schema drift",
   "Scheduling with GitHub Actions"
  ],
  "md": "projects/build-the-plumbing/PROJECT.md",
  "steps": [
   "Design it before you build it",
   "Set up",
   "Read the source and write a contract",
   "Ingest the raw files, with Python",
   "Clean it in the staging layer, with dbt",
   "Build the fact table incrementally",
   "Build the business-ready layer",
   "Add data quality tests",
   "Handle change: new columns, late files and bad data",
   "Orchestrate and schedule it",
   "Watch it: run log, freshness and lineage",
   "Why it matters, and how to talk about it",
   "Take it further"
  ]
 },
 {
  "order": 10,
  "id": "python-basics",
  "track": "Python",
  "level": "Practice",
  "title": "Python basics",
  "fullTitle": "Python basics: read and clean a CSV",
  "blurb": "Read a messy CSV with pandas and clean it in eight short steps. Runs in Google Colab, nothing to install.",
  "time": "About 30 minutes",
  "md": "projects/python-basics/PROJECT.md",
  "steps": [
   "Read the file",
   "Look before you clean",
   "Tidy the column names",
   "Fix the data types",
   "Tidy messy text",
   "Deal with missing values",
   "Remove duplicate rows",
   "Catch impossible values, then save"
  ]
 },
 {
  "order": 11,
  "id": "python-explore",
  "track": "Python",
  "level": "Practice",
  "title": "Explore and summarise",
  "fullTitle": "Explore and summarise with groupby",
  "blurb": "Answer real questions from a clean file: summaries, counts, percentages and groupby, the pandas version of GROUP BY.",
  "time": "About 25 minutes",
  "md": "projects/python-explore/PROJECT.md",
  "steps": [
   "Read the file with real dates",
   "Summarise one column",
   "Count and get percentages",
   "Group and summarise",
   "Filter first, then group",
   "Work out each group's share"
  ]
 },
 {
  "order": 12,
  "id": "python-merge",
  "track": "Python",
  "level": "Practice",
  "title": "Merge tables",
  "fullTitle": "Merge tables without double counting",
  "blurb": "Combine orders, customers and items with merge, spot fan-out before it inflates your totals, and fix it.",
  "time": "About 25 minutes",
  "md": "projects/python-merge/PROJECT.md",
  "steps": [
   "Read the three tables",
   "Check the keys first",
   "Left merge: keep every order",
   "Inner merge: only the matches",
   "Watch the totals grow",
   "Fix it: summarise first, then merge",
   "Answer item questions from the items table"
  ]
 },
 {
  "order": 13,
  "id": "python-dates",
  "track": "Python",
  "level": "Practice",
  "title": "Work with dates",
  "fullTitle": "Work with dates",
  "blurb": "Delivery times, late orders, weekdays and monthly totals: the date skills every delivery or sales question needs.",
  "time": "About 25 minutes",
  "md": "projects/python-dates/PROJECT.md",
  "steps": [
   "Read the dates as dates",
   "Days between two dates",
   "Flag late orders",
   "Pull out the year, month and weekday",
   "Monthly totals",
   "Filter by date"
  ]
 },
 {
  "order": 14,
  "id": "python-charts",
  "track": "Python",
  "level": "Practice",
  "title": "Charts with Matplotlib",
  "fullTitle": "Charts with Matplotlib",
  "blurb": "Line, bar and histogram charts with titles that say the point, then save them for a report or slide.",
  "time": "About 25 minutes",
  "md": "projects/python-charts/PROJECT.md",
  "steps": [
   "Get the numbers ready",
   "Leave out part periods",
   "A line chart for change over time",
   "A sorted bar chart for comparing groups",
   "A histogram for the shape of the data",
   "Save a chart"
  ]
 },
 {
  "order": 15,
  "id": "python-duckdb",
  "track": "Python",
  "level": "Practice",
  "title": "SQL inside Python",
  "fullTitle": "SQL inside Python with DuckDB",
  "blurb": "Run SQL straight on pandas tables with DuckDB, then carry on in pandas. Use whichever is clearer for each step.",
  "time": "About 20 minutes",
  "md": "projects/python-duckdb/PROJECT.md",
  "steps": [
   "Your first query",
   "GROUP BY in SQL",
   "Join without fan-out, using a CTE",
   "The top city in each province",
   "SQL first, then pandas"
  ]
 },
 {
  "order": 16,
  "id": "python-files",
  "track": "Python",
  "level": "Practice",
  "title": "Many files and a script",
  "fullTitle": "From notebook to script: many files",
  "blurb": "Write a function, loop over a week of daily files, combine them safely, spot a new column, then turn it into a script.",
  "time": "About 30 minutes",
  "md": "projects/python-files/PROJECT.md",
  "steps": [
   "A function to read one day",
   "Loop over the week",
   "Spot new columns",
   "Combine the files",
   "Check the result",
   "Turn it into a script"
  ]
 }
];
window.PROJECTS_COMING = [
 {
  "track": "Data Analytics",
  "level": "Intermediate",
  "title": "Why customers leave",
  "blurb": "Churn: who stops buying, why, and what it costs the business."
 }
];

// The Projects hub: one short entry per project, from projects/<id>/meta.json. The full write-up of each
// project is its PROJECT.md. Built by each project's build_project.py: edit those, not this.
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
  "order": 1
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

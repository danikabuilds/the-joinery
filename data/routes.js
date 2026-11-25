// The routes a visitor can pick on the start screen.
// To add a route: copy one block, give it a new unique id, and write its steps.
// A step links to a page (href), or to the next unfinished exercise in a topic (topic),
// or to the next unfinished exercise overall (next: true).
window.ROUTES = [
  {
    id: 'new',
    pathTitle: 'Start with these SQL topics',
    topics: ['select', 'where', 'group'],
    name: 'New to data',
    blurb: 'I am starting from scratch and want clear, plain-English steps.',
    headline: 'Start from the beginning, one clear step at a time',
    lede: 'No experience needed. Learn the words first, then write your first queries, then practise until it sticks.',
    steps: [
      { label: 'Learn the words', text: 'Skim the SQL terms so table, row and key feel familiar.', href: '#/glossary/SQL' },
      { label: 'Write your first query', text: 'Pick two columns from a table. It takes about a minute.', href: '#/lab/select-columns' },
      { label: 'Filter rows with WHERE', text: 'Keep only the rows you care about.', topic: 'where' },
      { label: 'Come back for a review', text: 'Short reviews a few days apart make it stick.', href: '#/review' }
    ],
    note: ''
  },
  {
    id: 'gaps',
    pathTitle: 'The usual weak spots',
    topics: ['group', 'join', 'union', 'cte', 'window'],
    name: 'Fill my gaps',
    blurb: 'I already work with data and want to strengthen the weak spots.',
    headline: 'Fill the gaps in what you know',
    lede: 'Go straight to the topics you are least sure of. Joins, grouping and window functions are the usual weak spots.',
    steps: [
      { label: 'Try joins', text: 'Check you know what each join keeps and drops.', topic: 'join' },
      { label: 'Try window functions', text: 'Rank, running totals and latest-per-group.', topic: 'window' },
      { label: 'Test yourself with a subject quiz', text: 'Multiple-choice questions on one area at a time, or all of them.', href: '#/quizzes' },
      { label: 'Write clearer queries with CTEs', text: 'Break a long query into named steps.', topic: 'cte' }
    ],
    note: ''
  },
  {
    id: 'interview',
    pathTitle: 'Interview favourites',
    topics: ['group', 'join', 'cte', 'window'],
    name: 'Interview prep',
    blurb: 'I have interviews coming up and want to practise answering out loud.',
    headline: 'Get ready to answer out loud',
    lede: 'Solve the problem, then say the answer. Each exercise has a three-sentence model answer to practise with.',
    steps: [
      { label: 'Solve, then explain it out loud', text: 'Each solved exercise unlocks a timed spoken explanation.', next: true },
      { label: 'Practise counts and totals', text: 'A common interview theme: GROUP BY, and the questions that follow it.', topic: 'group' },
      { label: 'Take a subject quiz', text: 'Eight multiple-choice questions, like a screening test.', href: '#/quizzes' },
      { label: 'Rehearse terms with flashcards', text: 'Say each definition aloud before you reveal it.', href: '#/glossary' }
    ],
    note: 'Daily 5 trivia and scenario questions are planned.'
  },
  {
    id: 'engineering',
    pathTitle: 'SQL for data engineers',
    topics: ['join', 'union', 'cte', 'window'],
    name: 'Data engineering',
    blurb: 'I want to learn how data is modelled, moved and stored.',
    headline: 'Build the data engineering foundations',
    lede: 'Start with the SQL you use every day, then load files with Python and build a real pipeline.',
    steps: [
      { label: 'Combine tables with joins', text: 'The skill behind almost every pipeline.', topic: 'join' },
      { label: 'Write clearer queries with CTEs', text: 'Break a big transformation into named steps.', topic: 'cte' },
      { label: 'Combine many files with Python', text: 'Load a week of daily files, catch a new column and turn it into a script.', href: '#/projects/python-files' },
      { label: 'Learn the pipeline terms', text: 'ETL, ELT, batch, streaming, warehouses and lakes.', href: '#/glossary/Pipelines' },
      { label: 'Build the plumbing', text: 'A real pipeline: raw, staging and marts layers, dbt tests and a daily scheduled run.', href: '#/projects/build-the-plumbing' }
    ],
    note: ''
  },
  {
    id: 'explore',
    pathTitle: 'SQL topics',
    topics: ['select', 'where', 'group', 'join', 'union', 'cte', 'window'],
    name: 'Just exploring',
    blurb: 'Show me everything and let me look around.',
    headline: 'Look around, start anywhere',
    lede: 'Everything on The Joinery in one place. Nothing has to be done in order, and your progress is saved as you go.',
    steps: [],
    note: ''
  }
];

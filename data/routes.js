// The routes a visitor can pick on the start screen.
// To add a route: copy one block, give it a new unique id, and write its steps.
// A step links to a page (href), or to the next unfinished exercise in a topic (topic),
// or to the next unfinished exercise overall (next: true).
window.ROUTES = [
  {
    id: 'new',
    pathTitle: 'Start with these SQL topics',
    topics: ['select', 'where', 'group'],
    cards: ['glossary-sql', 'review'],
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
    cards: ['review', 'glossary'],
    name: 'Fill my gaps',
    blurb: 'I already work with data and want to strengthen the weak spots.',
    headline: 'Fill the gaps in what you know',
    lede: 'Go straight to the topics you are least sure of. Joins, grouping and window functions are the usual weak spots.',
    steps: [
      { label: 'Try joins', text: 'Check you know what each join keeps and drops.', topic: 'join' },
      { label: 'Try window functions', text: 'Rank, running totals and latest-per-group.', topic: 'window' },
      { label: 'Test yourself with a subject quiz', text: 'Multiple-choice questions on one area at a time, or all of them.', href: '#/review' },
      { label: 'Write clearer queries with CTEs', text: 'Break a long query into named steps.', topic: 'cte' }
    ],
    note: 'A quick skills check is planned. Until then, choose any topic below.'
  },
  {
    id: 'interview',
    pathTitle: 'Interview favourites',
    topics: ['group', 'join', 'cte', 'window'],
    cards: ['review', 'glossary'],
    name: 'Interview prep',
    blurb: 'I have interviews coming up and want to practise answering out loud.',
    headline: 'Get ready to answer out loud',
    lede: 'Solve the problem, then say the answer. Each exercise has a three-sentence model answer to practise with.',
    steps: [
      { label: 'Solve, then explain it out loud', text: 'Each solved exercise unlocks a timed spoken explanation.', next: true },
      { label: 'Practise counts and totals', text: 'A common interview theme: GROUP BY, and the questions that follow it.', topic: 'group' },
      { label: 'Take a subject quiz', text: 'Eight multiple-choice questions, like a screening test.', href: '#/review' },
      { label: 'Rehearse terms with flashcards', text: 'Say each definition aloud before you reveal it.', href: '#/glossary' }
    ],
    note: 'Daily 5 trivia and scenario questions are planned.'
  },
  {
    id: 'engineering',
    pathTitle: 'SQL for data engineers',
    topics: ['join', 'union', 'cte', 'window'],
    cards: ['glossary-pipelines', 'glossary-modelling'],
    name: 'Data engineering',
    blurb: 'I want to learn how data is modelled, moved and stored.',
    headline: 'Build the data engineering foundations',
    lede: 'Start with the SQL you will use every day, then learn how data is modelled and moved.',
    steps: [
      { label: 'Combine tables with joins', text: 'The skill behind almost every pipeline.', topic: 'join' },
      { label: 'Write clearer queries with CTEs', text: 'Break a big transformation into named steps.', topic: 'cte' },
      { label: 'Learn the pipeline terms', text: 'ETL, ELT, batch, streaming, warehouses and lakes.', href: '#/glossary/Pipelines' },
      { label: 'Learn how data is modelled', text: 'Facts, dimensions, star schemas and grain.', href: '#/glossary/Modelling' }
    ],
    note: 'This is a starter route. Python, pipelines and cloud lessons are planned.'
  },
  {
    id: 'explore',
    pathTitle: 'SQL topics',
    topics: ['select', 'where', 'group', 'join', 'union', 'cte', 'window'],
    cards: ['review', 'glossary'],
    name: 'Just exploring',
    blurb: 'Show me everything and let me look around.',
    headline: 'Learn SQL in the order you write it',
    lede: 'Each line of the query below is a topic. Work down the page and you will have practised every clause, in the place it belongs.',
    steps: [],
    note: ''
  }
];

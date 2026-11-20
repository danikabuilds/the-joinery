// The glossary. Terms live in one file per area (glossary-sql.js, glossary-business.js and so on).
//
// Each term:
//   id        short unique name used in the page address, e.g. 'left-join'
//   term      the name shown
//   def       the plain meaning, one or two sentences
//   deep      the deeper understanding: why it matters and how it behaves
//   say       a sentence you could say out loud in an interview
//   ex        optional example; exCode: true shows it as code
//   mistakes  optional list of common mistakes
//   questions optional list of business questions the term helps answer
//   rel       optional list of related term ids
window.GLOSSARY = [];
window.GLOSSARY_GROUPS = [
  { id: 'SQL', name: 'SQL', blurb: 'Writing queries: joins, grouping, windows and the traps in between.' },
  { id: 'Modelling', name: 'Modelling', blurb: 'How tables are shaped so numbers come out right.' },
  { id: 'Pipelines', name: 'Pipelines', blurb: 'How data is moved, cleaned, tested and kept fresh.' },
  { id: 'Business', name: 'Business', blurb: 'The metrics and questions the business actually asks.' },
  { id: 'Statistics', name: 'Statistics', blurb: 'Reading numbers honestly: averages, spread, tests and causes.' },
  { id: 'BI', name: 'BI and dashboards', blurb: 'Turning results into charts and reports people can act on.' }
];
window.addGlossary = function (group, list) {
  list.forEach(function (t) { t.group = group; window.GLOSSARY.push(t); });
};
